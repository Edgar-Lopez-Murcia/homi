import express from 'express';
import mongoose from 'mongoose';
import Comments from '../models/Comments.js';
import Properties from '../models/Properties.js';
import verificarToken from '../middleware/auth.js';
import verificarDuenio from '../middleware/verificarDuenio.js';

const router = express.Router();

// Helpers ------------------------------------------------
const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

async function calcularPromedio(propiedadId) {
    const agg = await Comments.aggregate([
        { $match: {
            propiedad: new mongoose.Types.ObjectId(propiedadId),
            estado: 'visible'
        }},
        { $group: {
            _id: null,
            promedio: { $avg: '$calificacion' },
            total:    { $sum: 1 }
        }}
    ]);
    const d = agg[0] || { promedio: 0, total: 0 };
    return {
        puntuacionFinal: d.promedio ? parseFloat(d.promedio.toFixed(1)) : 0,
        totalReseñas:    d.total
    };
}

// =========================================================
// 1. POST — Crear reseña
// =========================================================
router.post('/:propiedadId', verificarToken, async (req, res, next) => {
    try {
        const { propiedadId } = req.params;
        const { comentario, calificacion, imagenes } = req.body;
        const usuarioId = req.usuario.id;

        if (!isValidId(propiedadId))
            return res.status(400).json({ error: 'ID de propiedad inválido' });

        const propiedad = await Properties.findById(propiedadId).select('propietario');
        if (!propiedad)
            return res.status(404).json({ error: 'La propiedad no existe' });

        // Nadie reseña su propia propiedad
        if (propiedad.propietario.equals(usuarioId))
            return res.status(403).json({ error: 'No puedes reseñar tu propia propiedad' });

        const nueva = await Comments.create({
            propiedad: propiedadId,
            usuarioComentario: usuarioId,
            comentario,
            calificacion,
            imagenes: imagenes || []
        });

        await nueva.populate('usuarioComentario', 'nombre imagenPerfil');

        const { puntuacionFinal, totalReseñas } = await calcularPromedio(propiedadId);

        res.status(201).json({
            mensaje: 'Reseña creada con éxito',
            reseña: nueva,
            puntuacionFinal,
            totalReseñas
        });
    } catch (err) {
        if (err.code === 11000)
            return res.status(409).json({ error: 'Ya has reseñado esta propiedad' });
        next(err);
    }
});

// =========================================================
// 2. GET — Listar reseñas de una propiedad (paginado)
// =========================================================
router.get('/:propiedadId', async (req, res, next) => {
    try {
        const { propiedadId } = req.params;
        if (!isValidId(propiedadId))
            return res.status(400).json({ error: 'ID de propiedad inválido' });

        const page  = Math.max(1, parseInt(req.query.page)  || 1);
        const limit = Math.min(50, parseInt(req.query.limit) || 10);
        const skip  = (page - 1) * limit;

        const filtro = { propiedad: propiedadId, estado: 'visible' };

        const [reseñas, total, promedio] = await Promise.all([
            Comments.find(filtro)
                .populate('usuarioComentario', 'nombre imagenPerfil')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Comments.countDocuments(filtro),
            calcularPromedio(propiedadId)
        ]);

        res.json({
            reseñas,
            puntuacionFinal: promedio.puntuacionFinal,
            totalReseñas:    total,
            page,
            totalPages: Math.ceil(total / limit)
        });
    } catch (err) { next(err); }
});

// =========================================================
// 3. GET — Solo promedio (endpoint liviano, útil para tarjetas)
// =========================================================
router.get('/:propiedadId/promedio', async (req, res, next) => {
    try {
        const { propiedadId } = req.params;
        if (!isValidId(propiedadId))
            return res.status(400).json({ error: 'ID inválido' });

        const data = await calcularPromedio(propiedadId);
        res.json(data);
    } catch (err) { next(err); }
});

// =========================================================
// 4. PATCH — Editar respuesta del propietario
// =========================================================
router.patch('/reseña/:id/propietario', verificarToken, async (req, res, next) => {
    try {
        const { respuestaPropietario } = req.body;
        const reseña = await Comments.findById(req.params.id);

        if (!reseña) return res.status(404).json({ error: 'Reseña no encontrada' });

        const inmueble = await Properties.findById(reseña.propiedad).select('propietario');
        if (!inmueble) return res.status(404).json({ error: 'Inmueble no encontrado' });

        const esDueño = inmueble.propietario.equals(req.usuario.id);
        const esAdmin = req.usuario.rol === 'admin';
        if (!esDueño && !esAdmin)
            return res.status(403).json({ error: 'No tienes permisos' });

        if (respuestaPropietario !== undefined) {
            reseña.respuestaPropietario = {
                texto: respuestaPropietario
                
            };
        }

        await reseña.save();
        await reseña.populate('usuarioComentario', 'nombre imagenPerfil');

        res.json({ mensaje: 'Respuesta actualizada', reseña });
    } catch (err) { next(err); }
});

// =========================================================
// 5. PATCH — Editar reseña
// =========================================================
router.patch('/reseña/:id', verificarToken, verificarDuenio(Comments, 'usuarioComentario', 'propiedad'), async (req, res, next) => {
    try {

        const reseña = req.recurso; 
        const { comentario, calificacion, imagenes } = req.body;

        if (!isValidId(req.params.id))
            return res.status(400).json({ error: 'ID inválido' });


        if (comentario   !== undefined) reseña.comentario   = comentario;
        if (calificacion !== undefined) reseña.calificacion = calificacion;
        if (imagenes     !== undefined) reseña.imagenes     = imagenes;

        await reseña.save();
        await reseña.populate('usuarioComentario', 'nombre imagenPerfil');
        const { puntuacionFinal, totalReseñas } = await calcularPromedio(reseña.propiedad);

        res.json({ mensaje: 'Reseña actualizada',
            reseña,
            puntuacionFinal,
            totalReseñas, });
    } catch (err) { next(err); }
});


// =========================================================
// 6. DELETE — Eliminar reseña
// =========================================================
router.delete('/reseña/:id', verificarToken, verificarDuenio(Comments, 'usuarioComentario', 'propiedad'), async (req, res, next) => {
    try {
        const recurso = req.recurso; 

        if (!isValidId(req.params.id))
            return res.status(400).json({ error: 'ID inválido' });


        const propiedadId = recurso.propiedad;
        await recurso.deleteOne();

        const { puntuacionFinal, totalReseñas } = await calcularPromedio(propiedadId);

        res.json({
            mensaje: 'Reseña eliminada',
            recurso,
            puntuacionFinal,
            totalReseñas
        });
    } catch (err) { next(err); }
});

// =========================================================
// 7. POST — Like / Unlike (toggle)
// =========================================================
router.post('/:reseñaId/like', verificarToken, async (req, res, next) => {
    try {
        const { reseñaId } = req.params;
        const usuarioId = req.usuario.id;

        if (!isValidId(reseñaId))
            return res.status(400).json({ error: 'ID inválido' });

        const reseña = await Comments.findById(reseñaId).select('+usuariosLike');
        if (!reseña) return res.status(404).json({ error: 'Reseña no encontrada' });

        const yaDioLike = reseña.usuariosLike.some(id => id.equals(usuarioId));

        if (yaDioLike) {
            reseña.usuariosLike.pull(usuarioId);
            reseña.likes = Math.max(0, reseña.likes - 1);
        } else {
            reseña.usuariosLike.push(usuarioId);
            reseña.likes += 1;
        }

        await reseña.save();
        res.json({ likes: reseña.likes, dioLike: !yaDioLike });
    } catch (err) { next(err); }
});

export default router;