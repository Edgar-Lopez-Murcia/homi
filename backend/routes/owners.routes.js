import express from 'express';
import owners from '../models/verification/Owners.js';

const router = express.Router();
import verificarToken from '../middleware/auth.js';
import verificarAdmin from '../middleware/admin.js';
import verificarDuenio from '../middleware/verificarDuenio.js';
import validarVerificacionDueño from '../middleware/validarVerificacionDueño.js'

router.get('/', verificarToken, verificarAdmin, async (req, res, next) => {
    try{
        const {tipoDocumento, estado, page = 1, limit = 20} = req.query;
        
        const filtros = {};

        if (tipoDocumento) filtros.tipoDocumento = tipoDocumento;
        if (estado) filtros.estado = estado;

        
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
        const skip = (pageNum - 1) * limitNum;
        
        const [repostes, totalFiltrado] = await owners.all([
            owners.find(filtros)
                .populate('usuario', 'nombre imagenPerfil')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum),
            owners.countDocuments(filtros)
            ]);
        res.json(repostes, totalFiltrado);

    } catch (err) {
        next(err)
    }
});

router.post('/', verificarToken, async (req, res, next) => {
    try {

        const datosNuevos = {
            ...req.body,
            usuario: req.usuario.id
        }

        const crear = await owners.create(datosNuevos);
        res.json

    } catch (err) {
        next(err)
    }
});

router.put('/:id', verificarToken, verificarDuenio(owners, 'usuario'), validarVerificacionDueño, async (req, res, next) => {
    try{
        delete req.body.motivoRechazo;

        const editar = await owners.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        res.json(editar);

    } catch (err) {
        next(err)
    }
});

router.put('/:id/esatdo', verificarToken, verificarAdmin, async (req, res, next) => {
    try {
        const {estado, motivoRechazo} = req.body
        if (estado !== undefined && !['PENDIENTE', 'APROBADO', 'RECHAZADO'].includes(estado)) {
            return res.status(400).json({ error: 'el estado no es válido.' });
        };
        if (motivoRechazo !== undefined && motivoRechazo.trim().length < 3 || motivoRechazo.trim().length > 500 ) {
            return res.status(400).json({ error: 'El motivo de rechazo debe tener al menos 3 caracteres y menos de 500 caracteres.' });
        }
        const editar = await Propiedad.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        res.json(editar);

    } catch (err) {
        next(err)
    }
});

router.delete('/:id', verificarToken, verificarDuenio(owners, 'usuario'), async(req, res, next) => {
    try {
        const eliminar = req.recurso;

        await eliminar.deleteOne();
        res.json({
            mensaje: 'Reseña eliminada',
            eliminar
        });
        
    } catch (err) {
        next(err)
    }
});