import Companies from '../models/verification/Companies.js';
import { calcularPaginacion } from '../utils/paginationAndFilters.js';

// 1. GET — Listar todas las solicitudes de empresas (Admin)

export const getAllCompanies = async (req, res, next) => {
    try {
        const { estado, tipoDocumento } = req.query;
        const { pageNum, limitNum, skip } = calcularPaginacion(req.query);
        
        const filtros = {};
        if (estado) filtros.estado = estado;
        if (tipoDocumento) filtros.tipoDocumento = tipoDocumento;

        const [solicitudes, totalFiltrado] = await Promise.all([
            Companies.find(filtros)
                .populate('usuario', 'nombre imagenPerfil')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .lean(),
            Companies.countDocuments(filtros)
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


// 2. GET — Ver mi propia solicitud de empresa

export const getMyCompany = async (req, res, next) => {
    try {
        const solicitud = await Companies.findOne({ usuario: req.usuario.id });
        if (!solicitud) {
            return res.status(404).json({ error: 'No tienes una solicitud de verificación de empresa activa' });
        }
        res.json(solicitud);
    } catch (err) {
        next(err);
    }
};


// 3. POST — Crear solicitud de empresa (Propietario)

export const createCompany = async (req, res, next) => {
    try {
        const datosNuevos = {
            ...req.body,
            usuario: req.usuario.id
        };

        const crear = await Companies.create(datosNuevos);
        res.status(201).json({ mensaje: 'Solicitud de empresa enviada con éxito', solicitud: crear });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ error: 'Ya has enviado una solicitud de empresa previamente' });
        }
        next(err);
    }
};


// 4. PUT — Editar mi solicitud de empresa (Lista Blanca)

export const updateMyCompany = async (req, res, next) => {
    try {
        
        const { 
            razonSocial, nit, tipoDocumento, numeroDocumento, 
            nombreRepresentante, telefonoCorporativo, emailCorporativo, 
            documentoRepresentante, rut, camaraComercio, aceptaTratamientoDatos 
        } = req.body;

        const datosPermitidos = {
            razonSocial, nit, tipoDocumento, numeroDocumento, 
            nombreRepresentante, telefonoCorporativo, emailCorporativo, 
            documentoRepresentante, rut, camaraComercio, aceptaTratamientoDatos
        };

        
        Object.keys(datosPermitidos).forEach(key => datosPermitidos[key] === undefined && delete datosPermitidos[key]);

        const editar = await Companies.findByIdAndUpdate(
            req.params.id,
            datosPermitidos,
            { new: true, runValidators: true }
        );
        
        res.json({ mensaje: 'Solicitud de empresa actualizada', solicitud: editar });
    } catch (err) {
        next(err);
    }
};


// 5. PUT — Cambiar estado de la solicitud (Admin)

export const changeCompanyStatus = async (req, res, next) => {
    try {
        const { estado, motivoRechazo } = req.body;

        const editar = await Companies.findByIdAndUpdate(
            req.params.id,
            { estado, motivoRechazo },
            { new: true, runValidators: true }
        );

        if (!editar) return res.status(404).json({ error: 'Solicitud no encontrada' });

        res.json({ mensaje: `Solicitud de empresa marcada como ${estado}`, solicitud: editar });
    } catch (err) {
        next(err);
    }
};


// 6. DELETE — Eliminar solicitud de empresa

export const deleteCompany = async (req, res, next) => {
    try {
        const eliminar = req.recurso; 
        await eliminar.deleteOne();
        
        res.json({
            mensaje: 'Solicitud de verificación de empresa eliminada',
            eliminar
        });
    } catch (err) {
        next(err);
    }
};