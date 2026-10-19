import express from 'express';
import Reports from '../models/Reports.js';
import verificarToken from '../middleware/auth.js';
import verificarAdmin from '../middleware/admin.js';

const router = express.Router();

router.get('/', verificarToken, async (req, res, next) => {
    try {
        const {estado, page = 1, limit = 20} = req.query;

        const filtros = {};
        if (estado) filtros.estado = estado;

        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
        const skip = (pageNum - 1) * limitNum;

        const [repostes, totalFiltrado] = await Promise.all([
            Reports.find(filtros)
                .populate('usuarioReporte', 'nombre imagenPerfil')
                .populate('usuarioReportado', 'nombre imagenPerfil')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum),
            Reports.countDocuments(filtros)
        ]);
        res.json(repostes, totalFiltrado);
    } catch (err) {
        next(err)
    }
});