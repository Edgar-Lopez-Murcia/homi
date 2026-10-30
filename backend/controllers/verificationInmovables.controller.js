// controllers/verificationInmovables.controller.js
import Inmovables from '../models/verification/Inmovables.js'; // Ajusta la ruta
import Properties from '../models/Properties.js';
import { calcularPaginacion } from '../utils/paginationAndFilters.js';


// 1. GET — Listar todas las solicitudes (Admin)

export const getAllVerifications = async (req, res, next) => {
    try {
        const { estado } = req.query;
        const { pageNum, limitNum, skip } = calcularPaginacion(req.query);
        
        const filtros = {};
        if (estado) filtros.estado = estado;

        const [solicitudes, total] = await Promise.all([
            Inmovables.find(filtros)
                .populate('usuario', 'nombre imagenPerfil')
                .populate('inmueble', 'titulo codigoCorto departamento municipio')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .lean(),
            Inmovables.countDocuments(filtros)
        ]);

        res.json({
            total,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(total / limitNum),
            solicitudes
        });
    } catch (err) {
        next(err);
    }
};


// 2. GET — Ver mis solicitudes de inmuebles

export const getMyVerifications = async (req, res, next) => {
    try {
        // Un usuario puede tener varias propiedades verificadas
        const solicitudes = await Inmovables.find({ usuario: req.usuario.id })
            .populate('inmueble', 'titulo codigoCorto imagenPrincipal');

        if (!solicitudes || solicitudes.length === 0) {
            return res.status(404).json({ error: 'No tienes solicitudes de verificación de inmuebles' });
        }
        res.json(solicitudes);
    } catch (err) {
        next(err);
    }
};


// 3. POST — Crear solicitud de verificación de inmueble

export const createVerification = async (req, res, next) => {
    try {
        const { inmuebleId } = req.params;
        const { esDueño } = req.body;

        // 1. Verificar que el inmueble existe
        const inmueble = await Properties.findById(inmuebleId).select('propietario');
        if (!inmueble) return res.status(404).json({ error: 'El inmueble no existe' });

        // 2. Validación de seguridad: Si dice ser el dueño, comprobarlo
        if (esDueño === true) {
            const esDuenoReal = inmueble.propietario.equals(req.usuario.id);
            if (!esDuenoReal) {
                return res.status(403).json({ 
                    error: 'Has indicado que eres el dueño, pero este inmueble no está registrado a tu nombre.' 
                });
            }
        }

        // 3. Crear la solicitud
        const datosNuevos = {
            ...req.body, // Zod ya validó todo
            usuario: req.usuario.id,
            inmueble: inmuebleId
        };

        const crear = await Inmovables.create(datosNuevos);
        res.status(201).json({ mensaje: 'Solicitud de verificación creada', solicitud: crear });

    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ error: 'Este inmueble ya tiene una solicitud de verificación activa' });
        }
        next(err);
    }
};


// 4. PUT — Editar mi solicitud (Lista Blanca)

export const updateMyVerification = async (req, res, next) => {
    try {
        // Evitamos Mass Assignment. El usuario solo puede cambiar esto:
        const { esDueño, documentoPropiedad, autorizacion } = req.body;

        const datosPermitidos = { esDueño, documentoPropiedad, autorizacion };
        
        // Limpiamos undefineds
        Object.keys(datosPermitidos).forEach(key => datosPermitidos[key] === undefined && delete datosPermitidos[key]);

        const editar = await Inmovables.findByIdAndUpdate(
            req.params.id,
            datosPermitidos,
            { new: true, runValidators: true }
        );
        
        res.json({ mensaje: 'Solicitud actualizada', solicitud: editar });
    } catch (err) {
        next(err);
    }
};


// 5. PUT — Cambiar estado (Admin)

export const changeVerificationStatus = async (req, res, next) => {
    try {
        const { estado } = req.body;

        const editar = await Inmovables.findByIdAndUpdate(
            req.params.id,
            { estado },
            { new: true, runValidators: true }
        );

        if (!editar) return res.status(404).json({ error: 'Solicitud no encontrada' });

        res.json({ mensaje: `Solicitud marcada como ${estado}`, solicitud: editar });
    } catch (err) {
        next(err);
    }
};

// 6. DELETE — Eliminar solicitud

export const deleteVerification = async (req, res, next) => {
    try {
        const eliminar = req.recurso; 
        await eliminar.deleteOne();
        
        res.json({ mensaje: 'Solicitud de verificación eliminada', eliminar });
    } catch (err) {
        next(err);
    }
};