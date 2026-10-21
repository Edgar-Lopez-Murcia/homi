import express from 'express';
import Infractions from '../models/Infractions.js';
import verificarToken from '../middleware/auth.js';
import verificarAdmin from '../middleware/admin.js';
import validarInfraccion from '../middleware/validarInfraccion.js';

const router = express.Router();

router.get('/', verificarToken, async (req, res, next) => {
    try {
        const {gravedad, diasSuspencion, multa } = req.query;

        const filtro = {};
        if (gravedad) filtro.gravedad = gravedad;
        if (diasSuspencion) filtro.diasSuspencion = { $lte: Number(diasSuspencion) };
        if (multa) filtro.multa = { $lte: Number(multa) };

        let camposSeleccionados = 'nombre descripcion';
        const esAdmin = req.usuario?.rol === 'admin';
        if (esAdmin) {
            camposSeleccionados = ''; 
        }

        const [infraccion, total] = await Promise.all([
            Infractions.find(filtro).select(camposSeleccionados),
            Infractions.countDocuments(filtro)
        ]);
        res.json(infraccion, total);
    } catch (err) {
        next(err)
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