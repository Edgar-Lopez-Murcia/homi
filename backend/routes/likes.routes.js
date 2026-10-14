import express from 'express';
const router = express.Router();

// 💡 Extensiones .js obligatorias en importaciones locales
import Likes from '../models/Likes.js'; 
import Properties from '../models/Properties.js'; 
import verificarToken from '../middleware/auth.js'; 
import { limitadorLikes } from '../middleware/limitadorPeticiones.js';

router.post('/:propertyId/like', verificarToken, limitadorLikes, async (req, res, next) => {
    try {
        const { propertyId } = req.params;
        const userId = req.usuario.id;

        const inmueble = await Properties.findById(propertyId);
        if (!inmueble) return res.status(404).json({ error: 'El inmueble no existe' });

        await Likes.create({ userId, publicationId: propertyId });
        
        // 🔄 Corregido: Guardamos en inmuebleActualizado para que coincida con la respuesta de abajo
        const inmuebleActualizado = await Properties.findByIdAndUpdate(
            propertyId, 
            { $inc: { likes: 1 } }, 
            { new: true }
        );

        res.status(201).json({ 
            mensaje: 'Like guardado correctamente', 
            totalLikes: inmuebleActualizado.likes 
        });

    } catch (err) {
        next(err)
    }
});

router.delete('/:propertyId/unlike', verificarToken, limitadorLikes, async (req, res, next) => {
    try {
        const { propertyId } = req.params;
        const userId = req.usuario.id;

        // 🔄 Corregido: Cambiado 'Propiedad' por 'Properties' para usar el modelo correcto importado arriba
        const inmueble = await Properties.findById(propertyId);
        if (!inmueble) return res.status(404).json({ error: 'Inmueble no encontrado' });

        const resultadoEliminacion = await Likes.findOneAndDelete({
            userId,
            publicationId: propertyId
        });

        if (!resultadoEliminacion) {
            return res.status(400).json({ error: 'No puedes quitar un like que no has dado' });
        }

        const inmuebleActualizado = await Properties.findByIdAndUpdate(
            propertyId,
            { $inc: { likes: -1 } }, 
            { new: true }
        );

        res.json({ 
            mensaje: 'Like removido correctamente', 
            totalLikes: inmuebleActualizado ? inmuebleActualizado.likes : 0 
        });

    } catch (err) {
        next(err)
    }
});

// 💡 Exportación moderna por defecto
export default router;
