// controllers/properties.controller.js
import Properties from '../models/Properties.js';
import { buildPropertyFilter } from '../utils/buildPropertyFilter.js';
import { calcularPaginacion, filtrarExacto, filtrarRegex, filtrarRango,
    filtrarRangoFechas } from '../utils/paginationAndFilters.js';
import { buildPagedResponse, parseGeoParams, buildSortObj, construirFacetEstadisticas } from '../utils/aggregationHelpers.js';
import logger from '../utils/logger.js';
import crypto from 'crypto';

// ==========================================
//  CONTROLADORES PÚBLICOS (GET)
// ==========================================

export const getProperties = async (req, res, next) => {
    try {
        const { lat, lng, distanciaMax, sort } = req.query;
        const { pageNum, limitNum, skip } = calcularPaginacion(req.query);
        const filtros = buildPropertyFilter(req.query);

        const geo = parseGeoParams(lat, lng, distanciaMax);
        if (geo?.error) return res.status(400).json({ error: geo.error });

        // RAMA GEOESPACIAL
        if (geo) {
            const { latN, lngN, distN } = geo;
            const sortObj = buildSortObj(sort, true);

            const pipeline = [
                {
                    $geoNear: {
                        near: { type: 'Point', coordinates: [lngN, latN] },
                        distanceField: 'distancia',
                        maxDistance: distN,
                        spherical: true,
                        query: filtros
                    }
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'propietario',
                        foreignField: '_id',
                        pipeline: [{ $project: { nombre: 1, imagenPerfil: 1 } }],
                        as: 'propietarioData'
                    }
                },
                { $unwind: { path: '$propietarioData', preserveNullAndEmptyArrays: true } },
                {
                    $addFields: {
                        propietario: {
                            $cond: [{ $eq: ['$propietarioData', null] }, null, '$propietarioData']
                        }
                    }
                },
                { $project: { propietarioData: 0 } },
                { $sort: sortObj },
                {
                    $facet: {
                        resultados: [ { $skip: skip }, { $limit: limitNum }],
                        conteoTotal: [{ $count: 'total' }]
                    }
                }
            ];

            const [resultado] = await Properties.aggregate(pipeline).allowDiskUse(true);
            const inmuebles = resultado?.resultados ?? [];
            const total = resultado?.conteoTotal?.[0]?.total ?? 0;

            return res.json(buildPagedResponse(total, pageNum, limitNum, inmuebles));
        }

        // RAMA NORMAL
        const sortObj = buildSortObj(sort, false);
        const [inmuebles, total] = await Promise.all([
            Properties.find(filtros)
                .populate('propietario', 'nombre imagenPerfil')
                .sort(sortObj)
                .skip(skip)
                .limit(limitNum)
                .lean(),
            Properties.countDocuments(filtros)
        ]);

        return res.json(buildPagedResponse(total, pageNum, limitNum, inmuebles));
    } catch (err) {
        next(err);
    }
};

export const getPropertyById = async (req, res, next) => {
    try {
        const inmueble = await Properties.findById(req.params.id).populate('propietario', 'nombre imagenPerfil');
        if (!inmueble) return res.status(404).json({ error: 'Inmueble no encontrado' });
        res.json(inmueble);
    } catch (err) {
        next(err);
    }
};

// ==========================================
// 🔒 CONTROLADORES PRIVADOS (PROPIETARIOS / ADMINS)
// ==========================================

export const getMyProperties = async (req, res, next) => {
    try {
        const filtros = {
            propietario: req.usuario.id,
            ...filtrarExacto(req.query, ['departamento', 'tipo', 'tipoAlquiler', 'estado']),
            ...filtrarRegex(req.query, ['municipio']),
            ...filtrarRango(req.query, 'precioMin', 'precioMax', 'precio')
        };

        const inmuebles = await Properties.find(filtros).sort({ createdAt: -1 }).lean();
        res.json(inmuebles);
    } catch (err) {
        next(err);
    }
};

export const getPropertiesAnalysis = async (req, res, next) => {
    try {
        const todos = await Properties.countDocuments();
        const { pageNum, limitNum, skip } = calcularPaginacion(req.query);

        const filtros = {
            propietario: req.usuario.id,
            ...filtrarExacto(req.query, ['departamento', 'tipo', 'tipoAlquiler', 'estado']),
            ...filtrarRegex(req.query, ['municipio']),
            ...filtrarRango(req.query, 'precioMin', 'precioMax', 'precio')
        };

        const [inmuebles, totalFiltrado] = await Promise.all([
            Properties.find(filtros).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
            Properties.countDocuments(filtros)
        ]);

        res.json({
            totalGlobal: todos,
            totalFiltrado,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(totalFiltrado / limitNum),
            inmuebles
        });
    } catch (err) {
        next(err);
    }
};

export const getPropertiesStats = async (req, res, next) => {
    try {
        const filtroGlobal = {
            ...filtrarRangoFechas(req.query, 'fechaInicio', 'fechaFin', 'createdAt'),
        };

        const camposPropiedades = ['estado', 'tipo', 'tipoAlquiler'];

        const estadisticas = await Properties.aggregate([
            { $match: filtroGlobal },
            {
                $facet: construirFacetEstadisticas(camposPropiedades)
            }
        ]);

        const { porEstado, porTipo, porTipoAlquiler } = estadisticas[0];
        const totalPeriodo = porEstado.reduce((acc, item) => acc + item.cantidad, 0);

        res.json({
            totalGlobal: totalPeriodo,
            porEstado,
            porTipo,
            porTipoAlquiler
        });
    } catch (err) {
        next(err);
    }
};

// ==========================================
//  CONTROLADORES DE MUTACIÓN (POST/PUT/DELETE)
// ==========================================

export const createProperty = async (req, res, next) => {
    try {
        const codigoAleatorio = crypto.randomBytes(3).toString('hex').toUpperCase();

        // Nota: La validación de URLs de las áreas ya la hace Zod en el middleware
        const datosInmueble = {
            ...req.body,
            codigoCorto: codigoAleatorio,
            propietario: req.usuario.id,
            likes: 0
        };

        const nuevo = await Properties.create(datosInmueble);
        logger.info(`Propiedad creada. ID: ${nuevo._id} - User: ${req.usuario.id}`);
        res.status(201).json(nuevo);
    } catch (err) {
        next(err);
    }
};

export const updateProperty = async (req, res, next) => {
    try {
        delete req.body.codigoCorto; // Bloqueo de seguridad

        const editar = await Properties.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        logger.info(`Propiedad editada. ID: ${editar._id} - User: ${req.usuario.id}`);
        res.json(editar);
    } catch (err) {
        next(err);
    }
};

export const addAreasToProperty = async (req, res, next) => {
    try {
        const inmueble = req.recurso;
        const { nuevasAreas, tipoZona } = req.body;

        const zonasPermitidas = ['Exterior', 'Cocina', 'Baño', 'Habitación', 'Cuarto de lavado', 
            'Vestidor', 'Bodega', 'Sala de estar', 'Comedor', 'Cuarto de estudio', 'Piso',
            'Patio interior', 'Terraza', 'otros'];

        if (!tipoZona || !zonasPermitidas.includes(tipoZona)) {
            return res.status(400).json({ error: "El 'tipoZona' no es válido." });
        }

        if (!nuevasAreas || !Array.isArray(nuevasAreas) || nuevasAreas.length === 0) {
            return res.status(400).json({ error: "Debe enviar una lista 'nuevasAreas'." });
        }

        const totalAreasActuales = inmueble.areas ? inmueble.areas.length : 0;
        if (totalAreasActuales + nuevasAreas.length > 50) {
            return res.status(400).json({ error: "Límite de 50 áreas superado." });
        }

        const cantidadAIncrementar = nuevasAreas.length;
        const existeZona = inmueble.zonas.some(z => z.nombreZona === tipoZona);
        let inmuebleActualizado;

        if (existeZona) {
            inmuebleActualizado = await Properties.findOneAndUpdate(
                { _id: req.params.id, "zonas.nombreZona": tipoZona },
                { 
                    $push: { areas: { $each: nuevasAreas } },
                    $inc: { "zonas.$.cantidad": cantidadAIncrementar }
                },
                { new: true, runValidators: true }
            );
        } else {
            inmuebleActualizado = await Properties.findByIdAndUpdate(
                req.params.id,
                { 
                    $push: { 
                        areas: { $each: nuevasAreas },
                        zonas: { nombreZona: tipoZona, cantidad: cantidadAIncrementar }
                    } 
                },
                { new: true, runValidators: true }
            );
        }
        res.json(inmuebleActualizado);
    } catch (err) {
        next(err);
    }
};

export const removeAreaFromProperty = async (req, res, next) => {
    try {
        const inmueble = await Properties.findById(req.params.id).select('propietario zonas');
        if (!inmueble) return res.status(404).json({ error: 'La publicación no existe' });

        const esDueño = inmueble.propietario.equals(req.usuario.id);
        const esAdmin = req.usuario.rol === 'admin';
        if (!esDueño && !esAdmin) return res.status(403).json({ error: 'No tienes permisos' });

        const { areaId, nombreZona } = req.params;

        let inmuebleActualizado = await Properties.findOneAndUpdate(
            { _id: req.params.id, "zonas.nombreZona": nombreZona },
            {
                $pull: { areas: { _id: areaId } },
                $inc: { "zonas.$.cantidad": -1 }
            },
            { new: true }
        );

        if (!inmuebleActualizado) {
            inmuebleActualizado = await Properties.findByIdAndUpdate(
                req.params.id, { $pull: { areas: { _id: areaId } } }, { new: true }
            );
            return res.json({ mensaje: "Área eliminada", inmuebleActualizado });
        }

        const zonaModificada = inmuebleActualizado.zonas.find(z => z.nombreZona === nombreZona);
        if (zonaModificada && zonaModificada.cantidad <= 0) {
            inmuebleActualizado = await Properties.findByIdAndUpdate(
                req.params.id, { $pull: { zonas: { nombreZona: nombreZona } } }, { new: true }
            );
        }
        res.json({ mensaje: "Área eliminada y catálogo optimizado", inmuebleActualizado });
    } catch (err) {
        next(err);
    }
};

export const deleteProperty = async (req, res, next) => {
    try {
        const eliminado = req.recurso;
        await eliminado.deleteOne();
        logger.warn(`Propiedad ELIMINADA. ID: ${eliminado._id} - User: ${req.usuario.id}`);
        res.json({ mensaje: 'Inmueble eliminado correctamente', eliminado });
    } catch (err) {
        next(err);
    }
};