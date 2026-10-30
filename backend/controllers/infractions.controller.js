// controllers/infractions.controller.js
import Infractions from '../models/Infractions.js';
import { calcularPaginacion } from '../utils/paginationAndFilters.js';

// 1. GET — Listar infracciones (Admin y Público/Usuarios)
export const getInfractions = async (req, res, next) => {
    try {
        const { gravedad, diasSuspension, multa } = req.query;
        
        const { pageNum, limitNum, skip } = calcularPaginacion(req.query);

        const filtro = {};
        if (gravedad) filtro.gravedad = gravedad;
        if (diasSuspension) filtro.diasSuspension = { $lte: Number(diasSuspension) };
        if (multa) filtro.multa = { $lte: Number(multa) };

        
        const esAdmin = req.usuario?.rol === 'admin';
        const camposSeleccionados = esAdmin ? '' : 'nombre descripcion gravedad';

        const [infracciones, total] = await Promise.all([
            Infractions.find(filtro)
                .select(camposSeleccionados)
                .skip(skip)
                .limit(limitNum)
                .lean(), 
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
};

// 2. POST — Crear infracción (Solo Admin)
export const createInfraction = async (req, res, next) => {
    try {
        const nuevaInfraccion = await Infractions.create(req.body);
        
        res.status(201).json(nuevaInfraccion);
    } catch (err) {
        next(err);
    }
};

// 3. PUT — Editar infracción (Solo Admin)
export const updateInfraction = async (req, res, next) => {
    try {
        const infraccionEditada = await Infractions.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        
        if (!infraccionEditada) {
            return res.status(404).json({ error: 'La infracción no existe' });
        }

        res.json(infraccionEditada);
    } catch (err) {
        next(err);
    }
};


// 4. DELETE — Eliminar infracción (Solo Admin)
export const deleteInfraction = async (req, res, next) => {
    try {
        const infraccion = await Infractions.findById(req.params.id);
        if (!infraccion) return res.status(404).json({ error: 'La infracción no existe' });

        await infraccion.deleteOne();
        res.json({ mensaje: 'Infracción eliminada correctamente', infraccion });
    } catch (err) {
        next(err);
    }
};