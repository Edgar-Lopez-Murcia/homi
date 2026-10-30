// controllers/verificationOwners.controller.js
import Owners from '../models/verification/Owners.js';
import { calcularPaginacion } from '../utils/paginationAndFilters.js';


// 1. GET — Listar todas las solicitudes (Solo Admin)

export const getAllVerifications = async (req, res, next) => {
    try {
        const { tipoDocumento, estado } = req.query;
        const { pageNum, limitNum, skip } = calcularPaginacion(req.query);
        
        const filtros = {};
        if (tipoDocumento) filtros.tipoDocumento = tipoDocumento;
        if (estado) filtros.estado = estado;

        const [solicitudes, totalFiltrado] = await Promise.all([
            Owners.find(filtros)
                .populate('usuario', 'nombre imagenPerfil')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .lean(),
            Owners.countDocuments(filtros)
        ]);

        res.json({
            total: totalFiltrado,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(totalFiltrado / limitNum),
            solicitudes
        });

    } catch (err) {
        next(err);
    }
};


// 2. GET — Ver mi propia solicitud de verificación

export const getMyVerification = async (req, res, next) => {
    try {
        const solicitud = await Owners.findOne({ usuario: req.usuario.id });
        if (!solicitud) {
            return res.status(404).json({ error: 'No tienes una solicitud de verificación activa' });
        }
        res.json(solicitud);
    } catch (err) {
        next(err);
    }
};


// 3. POST — Crear solicitud de verificación (Propietario)

export const createVerification = async (req, res, next) => {
    try {
        const datosNuevos = {
            ...req.body, 
            usuario: req.usuario.id
        };

        const crear = await Owners.create(datosNuevos);
        
        res.status(201).json({ mensaje: 'Solicitud enviada con éxito', solicitud: crear });

    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ error: 'Ya has enviado una solicitud de verificación previamente' });
        }
        next(err);
    }
};

// =========================================================
// 4. PUT — Editar mi solicitud (Propietario)
// =========================================================
export const updateMyVerification = async (req, res, next) => {
    try {
        // Por seguridad, un usuario no puede auto-aprobarse ni rechazarse
        delete req.body.estado;
        delete req.body.motivoRechazo;
        delete req.body.usuario;

        const editar = await Owners.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        
        res.json({ mensaje: 'Solicitud actualizada', solicitud: editar });

    } catch (err) {
        next(err);
    }
};

// =========================================================
// 5. PUT — Cambiar estado de la solicitud (Solo Admin)
// =========================================================
export const changeVerificationStatus = async (req, res, next) => {
    try {
        const { estado, motivoRechazo } = req.body;

        // 🚨 Bug corregido: era Propiedad.findByIdAndUpdate
        const editar = await Owners.findByIdAndUpdate(
            req.params.id,
            { estado, motivoRechazo },
            { new: true, runValidators: true }
        );

        if (!editar) return res.status(404).json({ error: 'Solicitud no encontrada' });

        res.json({ mensaje: `Solicitud marcada como ${estado}`, solicitud: editar });

    } catch (err) {
        next(err);
    }
};

// =========================================================
// 6. DELETE — Eliminar solicitud
// =========================================================
export const deleteVerification = async (req, res, next) => {
    try {
        const eliminar = req.recurso; // Inyectado por verificarDuenio
        await eliminar.deleteOne();
        
        res.json({
            mensaje: 'Solicitud de verificación eliminada', // 🚨 Bug corregido: decía "Reseña eliminada"
            eliminar
        });
    } catch (err) {
        next(err);
    }
};