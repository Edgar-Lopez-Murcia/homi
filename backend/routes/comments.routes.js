const express = require('express');
const router = express.Router();
const Comments = require('../models/Comments');
const verificarToken = require('../middleware/auth');
// Aquí importarías tu limitador de comentarios cuando lo agregues a tu middleware

// ==========================================
// 1. RUTA: AGREGAR UNA RESEÑA A UNA PROPIEDAD
// ==========================================
router.post('/:propertyId', verificarToken, async (req, res) => {
    try {
        const { propertyId } = req.params;
        const { comentario, calificacion, imagenes } = req.body;
        const userId = req.usuario.id; // 🛡️ Seguridad: ID del token

        const nuevaReseña = {
            usuarioComentario: userId,
            comentario,
            calificacion,
            imagenes
        };

        // 1. Buscamos el documento de comentarios de la propiedad y agregamos la reseña al array usando $push
        // Si no existe el documento para esa propiedad, lo crea gracias a la opción 'upsert: true'
        let documentoComentarios = await Comments.findOneAndUpdate(
            { propiedad: propertyId },
            { $push: { reseñas: nuevaReseña } },
            { new: true, upsert: true, runValidators: true }
        );

        // 2. Cálculo de la puntuación final promedio en el Backend
        const totalReseñas = documentoComentarios.reseñas.length;
        const sumaCalificaciones = documentoComentarios.reseñas.reduce((acc, curr) => acc + curr.calificacion, 0);
        const promedio = parseFloat((sumaCalificaciones / totalReseñas).toFixed(1));

        // 3. Guardamos el nuevo promedio calculado
        documentoComentarios.puntuacionFinal = promedio;
        await documentoComentarios.save();

        res.status(201).json({ 
            mensaje: 'Reseña agregada con éxito', 
            puntuacionFinal: promedio,
            reseñas: documentoComentarios.reseñas 
        });

    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// ==========================================
// 2. RUTA: OBTENER COMENTARIOS DE UNA PROPIEDAD
// ==========================================
router.get('/:propertyId', async (req, res) => {
    try {
        // Usamos .populate() para traer automáticamente el nombre o foto del usuario que comentó
        const comentarios = await Comments.findOne({ propiedad: req.params.propertyId })
            .populate('reseñas.usuarioComentario', 'imagenPerfil'); // Modifica 'nombre avatar' según tu modelo de Users

        if (!comentarios) {
            return res.json({ reseñas: [], puntuacionFinal: 0 });
        }

        res.json(comentarios);
    } catch (err) {
        res.status(500).json({ error: 'Error al obtener las reseñas' });
    }
});

// ==========================================
// 3. RUTA: ELIMINAR UNA RESEÑA ESPECÍFICA
// ==========================================
router.delete('/:propertyId/reseña/:reviewId', verificarToken, async (req, res) => {
    try {
        const { propertyId, reviewId } = req.params;
        const userId = req.usuario.id; // ID del usuario autenticado
        const esAdmin = (req.usuario.rol === 'admin');

        // 1. Primero verificamos si la reseña existe y si el usuario tiene permiso para borrarla
        const documentoOriginal = await Comments.findOne({ propiedad: propertyId });
        if (!documentoOriginal) {
            return res.status(404).json({ error: 'No se encontraron comentarios para esta propiedad' });
        }

        // Buscamos la reseña específica dentro del array local de JavaScript
        const reseñaAEliminar = documentoOriginal.reseñas.id(reviewId);
        if (!reseñaAEliminar) {
            return res.status(404).json({ error: 'La reseña no existe' });
        }

        // 🛡️ Ciberseguridad: Solo el dueño de la reseña o un administrador pueden borrarla
        const esDueño = reseñaAEliminar.usuarioComentario.equals(userId);
        if (!esDueño && !esAdmin) {
            return res.status(403).json({ error: 'No tienes permisos para eliminar esta reseña' });
        }

        // 2. 🔄 OPERACIÓN ATÓMICA: Sacamos la reseña del array usando $pull
        const documentoActualizado = await Comments.findOneAndUpdate(
            { propiedad: propertyId },
            { $pull: { reseñas: { _id: reviewId } } }, // 👈 Elimina el subdocumento que coincida con este ID
            { new: true }
        );

        // 3. Volvemos a calcular el promedio de puntuación final con las reseñas que quedaron
        const totalReseñas = documentoActualizado.reseñas.length;
        
        if (totalReseñas === 0) {
            documentoActualizado.puntuacionFinal = 0;
        } else {
            const sumaCalificaciones = documentoActualizado.reseñas.reduce((acc, curr) => acc + curr.calificacion, 0);
            documentoActualizado.puntuacionFinal = parseFloat((sumaCalificaciones / totalReseñas).toFixed(1));
        }

        // Guardamos los cambios del nuevo promedio
        await documentoActualizado.save();

        res.json({ 
            mensaje: 'Reseña eliminada correctamente', 
            puntuacionFinal: documentoActualizado.puntuacionFinal,
            reseñas: documentoActualizado.reseñas 
        });

    } catch (err) {
        res.status(500).json({ error: 'Error al eliminar la reseña' });
    }
});

module.exports = router;
