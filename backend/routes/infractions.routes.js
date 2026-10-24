import express from 'express';
import Infractions from '../models/Infractions.js';
import verificarToken from '../middleware/auth.js';
import verificarAdmin from '../middleware/admin.js';
import validarInfraccion from '../middleware/validarInfraccion.js';

const router = express.Router();

router.get('/', verificarToken, async (req, res, next) => {
    try {
        const { gravedad, diasSuspension, multa, page = 1, limit = 20 } = req.query;


        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
        const skip = (pageNum - 1) * limitNum;

        const filtro = {};
        if (gravedad) filtro.gravedad = gravedad;
        
        if (diasSuspension) filtro.diasSuspension = { $lte: Number(diasSuspension) };
        if (multa) filtro.multa = { $lte: Number(multa) };


        let camposSeleccionados = 'nombre descripcion';
        const esAdmin = req.usuario?.rol === 'admin';
        
        if (esAdmin) {
            camposSeleccionados = ''; // Admin ve todo
        }

        const [infracciones, total] = await Promise.all([
            Infractions.find(filtro)
                .select(camposSeleccionados)
                .skip(skip)
                .limit(limitNum),
            Infractions.countDocuments(filtro)
        ]);

        res.json({
            total,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(total / limitNum),
            infracciones 
        });

    } catch (err) {
        next(err);
    }
});

router.post('/', verificarToken, verificarAdmin, validarInfraccion, async (req, res, next) => {
    try {
        const nuevo = Infractions.create(...req.body);
        res.status(201).json(nuevo);
    } catch (err) {
        next(err)
    }
});

router.put('/:id', verificarToken ,verificarAdmin, validarInfraccion, async (req, res, next) => {
    try {
        const editar = await Propiedad.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        res.json(editar);
    } catch ( err) {
        next(err)
    }
});

router.delete('/:id', verificarToken, verificarAdmin, async (req, res, next) => {
    try {
        const infraccion = await Infractions.findById(req.params.id);
        if (!infraccion) return res.status(404).json({ error: 'La Infraccion no existe' });

        await infraccion.deleteOne();
        res.json({ mensaje: 'Infraccion eliminada correctamente', infraccion });
    } catch (err) {
        next(err)
    }
});

export default router;