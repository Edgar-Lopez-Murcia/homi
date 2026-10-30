// controllers/likes.controller.js
import Likes from '../models/Likes.js';
import Properties from '../models/Properties.js';

// =========================================================
// 1. POST — Dar Like a una propiedad
// =========================================================
export const likeProperty = async (req, res, next) => {
    try {
        const { propertyId } = req.params;
        const userId = req.usuario.id;

        // Verificamos que el inmueble exista
        const inmueble = await Properties.findById(propertyId).select('likes');
        if (!inmueble) return res.status(404).json({ error: 'El inmueble no existe' });

        try {
            // Intentamos crear el Like
            await Likes.create({ userId, publicationId: propertyId });
        } catch (error) {
            // Si el error es por índice duplicado (el usuario ya le dio like antes)
            if (error.code === 11000) {
                return res.status(400).json({ error: 'Ya le has dado like a esta propiedad' });
            }
            throw error; // Si es otro error, lo lanzamos
        }

        // Incrementamos el contador en la propiedad
        const inmuebleActualizado = await Properties.findByIdAndUpdate(
            propertyId, 
            { $inc: { likes: 1 } }, 
            { new: true, select: 'likes' }
        );

        res.status(201).json({ 
            mensaje: 'Like guardado correctamente', 
            totalLikes: inmuebleActualizado.likes 
        });

    } catch (err) {
        next(err);
    }
};

// =========================================================
// 2. DELETE — Quitar Like a una propiedad
// =========================================================
export const unlikeProperty = async (req, res, next) => {
    try {
        const { propertyId } = req.params;
        const userId = req.usuario.id;

        const inmueble = await Properties.findById(propertyId).select('likes');
        if (!inmueble) return res.status(404).json({ error: 'Inmueble no encontrado' });

        // Buscamos y eliminamos el registro de like
        const resultadoEliminacion = await Likes.findOneAndDelete({
            userId,
            publicationId: propertyId
        });

        if (!resultadoEliminacion) {
            return res.status(400).json({ error: 'No puedes quitar un like que no has dado' });
        }

        // Decrementamos el contador. Usamos Math.max(0) por seguridad para que nunca quede en negativo
        const inmuebleActualizado = await Properties.findByIdAndUpdate(
            propertyId,
            { $inc: { likes: -1 } }, 
            { new: true, select: 'likes' }
        );

        res.json({ 
            mensaje: 'Like removido correctamente', 
            totalLikes: Math.max(0, inmuebleActualizado.likes)
        });

    } catch (err) {
        next(err);
    }
};

// =========================================================
// 3. GET — Obtener todos los inmuebles que le gustan al usuario
// =========================================================
export const getMyLikedProperties = async (req, res, next) => {
    try {
        const userId = req.usuario.id;

        // 1. Buscamos todos los Likes de este usuario
        const misLikes = await Likes.find({ userId }).select('publicationId').lean();
        
        if (misLikes.length === 0) {
            return res.json({ total: 0, inmuebles: [] });
        }

        // 2. Extraemos solo los IDs de las propiedades
        const propertyIds = misLikes.map(like => like.publicationId);

        // 3. Buscamos esas propiedades en la colección de Properties
        const inmuebles = await Properties.find({ _id: { $in: propertyIds } })
            .populate('propietario', 'nombre imagenPerfil')
            .lean();

        res.json({
            total: inmuebles.length,
            inmuebles
        });

    } catch (err) {
        next(err);
    }
};