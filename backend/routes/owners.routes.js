import express from 'express';
import owners from '../models/verification/Owners.js';

const router = express.Router();
import verificarToken from '../middleware/auth.js';
import verificarAdmin from '../middleware/admin.js';
import verificarDuenio from '../middleware/verificarDuenio.js';
import validarPropiedad from '../middleware/validarPropiedad.js';

router.get('/', verificarToken, verificarAdmin, async (req, res, next) => {
    try{
        const {tipoDocumento, estado, page = 1, limit = 20} = req.query;
        
        const filtros = {};

        if (tipoDocumento) filtros.tipoDocumento = tipoDocumento;
        if (estado) filtros.estado = estado;

        
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
        const skip = (pageNum - 1) * limitNum;
        
        const [repostes, totalFiltrado] = await Promise.all([
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

router.put('/:id', verificarToken, verificarDuenio(owners, 'usuario'), async (req, res, next) => {
    try{
        const editar = await Propiedad.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        res.json(editar);

    } catch (err) {
        next(err)
    }
})