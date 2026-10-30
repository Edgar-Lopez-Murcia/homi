// controllers/comments.controller.js
import Comments from '../models/Comments.js';
import Properties from '../models/Properties.js';
import { calcularPromedio } from '../utils/aggregationHelpers.js';
import { calcularPaginacion } from '../utils/paginationAndFilters.js';

// =========================================================
// 1. POST — Crear reseña
// =========================================================
export const createComment = async (req, res, next) => {
    try {
        const usuarioId = req.usuario.id;
        const propiedadId = req.params.id;

        const propiedad = await Properties.findById(propiedadId).select('propietario');
        if (!propiedad) return res.status(404).json({ error: 'La propiedad no existe' });

        // Nadie reseña su propia propiedad
        if (propiedad.propietario.equals(usuarioId)) {
            return res.status(403).json({ error: 'No puedes reseñar tu propia propiedad' });
        }

        const nueva = await Comments.create({
            ...req.body,
            propiedad: propiedadId,
            usuarioComentario: usuarioId,
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
        if (err.code === 11000) {
            return res.status(409).json({ error: 'Ya has reseñado esta propiedad' });
        }
        next(err);
    }
};

// =========================================================
// 2. GET — Listar reseñas de una propiedad (paginado)
// =========================================================
export const getCommentsByProperty = async (req, res, next) => {
    try {
        const { propiedadId } = req.params;
        const { pageNum, limitNum, skip } = calcularPaginacion(req.query);

        const filtro = { propiedad: propiedadId, estado: 'visible' };

        const [reseñas, total, promedio] = await Promise.all([
            Comments.find(filtro)
                .populate('usuarioComentario', 'nombre imagenPerfil')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .lean(),
            Comments.countDocuments(filtro),
            calcularPromedio(propiedadId)
        ]);

        res.json({
            reseñas,
            puntuacionFinal: promedio.puntuacionFinal,
            totalReseñas: total,
            page: pageNum,
            totalPages: Math.ceil(total / limitNum)
        });
    } catch (err) {
        next(err);
    }
};

// =========================================================
// 3. GET — Solo promedio (endpoint liviano)
// =========================================================
export const getAverageScore = async (req, res, next) => {
    try {
        const data = await calcularPromedio(req.params.propiedadId);
        res.json(data);
    } catch (err) {
        next(err);
    }
};

// =========================================================
// 4. PATCH — Editar respuesta del propietario
// =========================================================
export const replyToComment = async (req, res, next) => {
    try {
        const { respuestaPropietario } = req.body;
        const reseña = await Comments.findById(req.params.id);

        if (!reseña) return res.status(404).json({ error: 'Reseña no encontrada' });

        const inmueble = await Properties.findById(reseña.propiedad).select('propietario');
        if (!inmueble) return res.status(404).json({ error: 'Inmueble no encontrado' });

        const esDueño = inmueble.propietario.equals(req.usuario.id);
        const esAdmin = req.usuario.rol === 'admin';
        if (!esDueño && !esAdmin) {
            return res.status(403).json({ error: 'No tienes permisos' });
        }

        if (respuestaPropietario !== undefined) {
            reseña.respuestaPropietario = { texto: respuestaPropietario };
        }

        await reseña.save();
        await reseña.populate('usuarioComentario', 'nombre imagenPerfil');

        res.json({ mensaje: 'Respuesta actualizada', reseña });
    } catch (err) {
        next(err);
    }
};

// =========================================================
// 5. PATCH — Editar reseña
// =========================================================
export const updateComment = async (req, res, next) => {
    try {
        const reseña = req.recurso; 

        Object.assign(reseña, req.body);

        await reseña.save();
        await reseña.populate('usuarioComentario', 'nombre imagenPerfil');
        
        const { puntuacionFinal, totalReseñas } = await calcularPromedio(reseña.propiedad);

        res.json({
            mensaje: 'Reseña actualizada',
            reseña,
            puntuacionFinal,
            totalReseñas
        });
    } catch (err) {
        next(err);
    }
};

// =========================================================
// 6. PATCH — ADMIN: Cambiar estado de la reseña
// =========================================================
export const changeCommentStatus = async (req, res, next) => {
    try {
        const { estado } = req.body;
        
        const reseña = await Comments.findByIdAndUpdate(
            req.params.id,
            { estado },
            { new: true, runValidators: true }
        ).populate('usuarioComentario', 'nombre imagenPerfil');

        if (!reseña) return res.status(404).json({ error: 'Reseña no encontrada' });

        res.json({ mensaje: `Estado cambiado a ${estado}`, reseña });
    } catch (err) {
        next(err);
    }
};

// =========================================================
// 7. DELETE — Eliminar reseña
// =========================================================
export const deleteComment = async (req, res, next) => {
    try {
        const recurso = req.recurso;
        const propiedadId = recurso.propiedad;
        
        await recurso.deleteOne();

        const { puntuacionFinal, totalReseñas } = await calcularPromedio(propiedadId);

        res.json({
            mensaje: 'Reseña eliminada',
            recurso,
            puntuacionFinal,
            totalReseñas
        });
    } catch (err) {
        next(err);
    }
};

// =========================================================
// 8. POST — Like / Unlike (toggle)
// =========================================================
export const toggleLike = async (req, res, next) => {
    try {
        const { reseñaId } = req.params;
        const usuarioId = req.usuario.id;

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
    } catch (err) {
        next(err);
    }
};