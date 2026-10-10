const express = require('express');
const router = express.Router();
const Likes = require('../models/Likes'); 
const Properties = require('../models/Properties'); 
const verificarToken = require('../middleware/auth'); 
const { limitadorLikes } = require('../middleware/limitadorPeticiones');

router.post('/:propertyId/like', verificarToken, limitadorLikes, async (req, res) => {
    try {
        const { propertyId } = req.params;
        const userId = req.usuario.id;


        await Likes.create({
            userId,
            publicationId: propertyId
        });


        const inmueble = await Properties.findById(propertyId);
        if (!inmueble) return res.status(404).json({ error: 'El inmueble no existe' });

        await Likes.create({ userId, publicationId: propertyId });
        const actualizado = await Properties.findByIdAndUpdate(propertyId, { $inc: { likes: 1 } }, { new: true });

        res.status(201).json({ 
            mensaje: 'Like guardado correctamente', 
            totalLikes: inmuebleActualizado.likes 
        });

    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ error: 'Ya le has dado like a esta publicación' });
        }
        res.status(500).json({ error: 'Error interno del servidor al procesar el like' });
    }
});

router.delete('/:propertyId/unlike', verificarToken, limitadorLikes, async (req, res) => {
    try {
        const { propertyId } = req.params;
        const userId = req.usuario.id;

        const resultadoEliminacion = await Likes.findOneAndDelete({
            userId,
            publicationId: propertyId
        });

        // Si no encontró ningún registro, significa que el usuario no le había dado like previamente
        if (!resultadoEliminacion) {
            return res.status(400).json({ error: 'No puedes quitar un like que no has dado' });
        }

        // 🔄 OPERACIÓN ATÓMICA: Restamos 1 en el contador del inmueble correspondiente
        const inmuebleActualizado = await Properties.findByIdAndUpdate(
            propertyId,
            { $inc: { likes: -1 } }, // 👈 Resta 1 de forma segura
            { new: true }
        );

        res.json({ 
            mensaje: 'Like removido correctamente', 
            totalLikes: inmuebleActualizado ? inmuebleActualizado.likes : 0 
        });

    } catch (err) {
        res.status(500).json({ error: 'Error interno del servidor al remover el like' });
    }
});

module.exports = router;