import express from 'express';
import Propiedad from '../models/Properties.js';

const router = express.Router();
import verificarToken from '../middleware/auth.js';
import verificarAdmin from '../middleware/admin.js';
import verificarPublicante from '../middleware/publicante.js';
import verificarDuenio from '../middleware/verificarDuenio.js';
import crypto from 'crypto';
import validarPropiedad from '../middleware/validarPropiedad.js';


// ============================================
// 🌐 RUTAS PÚBLICAS — GET
// ============================================

// GET todas las propiedades — Público con filtros y PAGINACIÓN 
router.get('/', async (req, res, next) => {
    try {
        const { 
            departamento, codigoCorto, municipio, tipo, tipoAlquiler, 
            precioMin, precioMax, habitacionesMin, bañosMin,
            lat, lng, distanciaMax = 5000,
            page = 1, limit = 20 
        } = req.query;

        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
        const skip = (pageNum - 1) * limitNum;

        // Si hay búsqueda geográfica, usamos agregación
        if (lat && lng) {
            const pipeline = [
                {
                    $geoNear: {
                        near: { type: "Point", coordinates: [Number(lng), Number(lat)] },
                        distanceField: "distancia",
                        maxDistance: Number(distanciaMax),
                        spherical: true,
                        query: { estado: 'disponible' } // Filtros adicionales aquí
                    }
                },
                {
                    $lookup: {
                        from: "usuarios", // <-- ¡OJO! Debe ser el nombre exacto de la colección en la Base de Datos (usualmente en plural)
                        localField: "propietario",
                        foreignField: "_id",
                        as: "propietario"
                    }
                },
                // 2. Convertir el array de propietario que devuelve $lookup en un solo objeto
                {
                    $unwind: {
                        path: "$propietario",
                        preserveNullAndEmptyArrays: true // Por si alguna propiedad se quedó sin propietario asignado
                    }
                },
                // 3. Moldear la respuesta para traer solo el nombre e imagenPerfil del propietario, manteniendo los demás campos del inmueble
                {
                    $project: {
                        // Mantiene todos los campos originales del inmueble de forma dinámica
                        document: "$$ROOT", 
                        // Sobrescribe el campo propietario para que solo tenga los datos que quieres
                        "propietario": {
                            nombre: "$propietario.nombre",
                            imagenPerfil: "$propietario.imagenPerfil"
                        }
                    }
                },
                // Reestructuramos el documento para limpiar el prefijo de $$ROOT
                {
                    $replaceRoot: {
                        newRoot: {
                            $mergeObjects: ["$document", { propietario: "$propietario" }]
                        }
                    }
                },
                { $skip: skip },
                { $limit: limitNum }
            ];

            const inmuebles = await Propiedad.aggregate(pipeline);
            
            // Para el total, hacemos un count con $geoNear
            const totalPipeline = [
                {
                    $geoNear: {
                        near: { type: "Point", coordinates: [Number(lng), Number(lat)] },
                        distanceField: "distancia",
                        maxDistance: Number(distanciaMax),
                        spherical: true,
                        query: { estado: 'disponible' }
                    }
                },
                { $count: "total" }
            ];
            const totalResult = await Propiedad.aggregate(totalPipeline);
            const total = totalResult.length > 0 ? totalResult[0].total : 0;

            return res.json({
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum),
                inmuebles
            });
        }

        // Búsqueda normal sin geolocalización
        let filtros = {};
        if (codigoCorto) {
            filtros = { codigoCorto: codigoCorto.toUpperCase().trim() };
        } else {
            filtros.estado = 'disponible';
            if (departamento) filtros.departamento = departamento;
            if (municipio) filtros.municipio = { $regex: municipio, $options: 'i' };
            if (tipo) filtros.tipo = tipo;
            if (tipoAlquiler) filtros.tipoAlquiler = tipoAlquiler;
            if (precioMin || precioMax) {
                filtros.precio = {};
                if (precioMin) filtros.precio.$gte = Number(precioMin);
                if (precioMax) filtros.precio.$lte = Number(precioMax);
            }
            if (habitacionesMin) {
                filtros.zonas = {
                    $elemMatch: {
                        nombreZona: 'habitación',
                        cantidad: { $gte: Number(habitacionesMin) }
                    }
                };
            };
            if (bañosMin) {
                filtros.zonas = {
                    $elemMatch: {
                        nombreZona: 'Baño',
                        cantidad: { $gte: Number(habitacionesMin) }
                    }
                };
            }
        }

        const [inmuebles, total] = await Promise.all([
            Propiedad.find(filtros)
                .populate('propietario', 'nombre imagenPerfil')
                .skip(skip)
                .limit(limitNum),
            Propiedad.countDocuments(filtros)
        ]);

        res.json({
            total,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(total / limitNum),
            inmuebles
        });
    } catch (err) {
        next(err)
    }
});



// GET un inmueble por ID específico — Público
router.get('/:id', async (req, res, next) => {
    try {
        const inmueble = await Propiedad.findById(req.params.id);
        if (!inmueble) return res.status(404).json({ error: 'Inmueble no encontrado' });

        res.json(inmueble);
    } catch (err) {
        next(err)
    } 
});

// ============================================
// 🔒 RUTAS PRIVADAS (PROPIETARIOS / ADMINS)
// ============================================

// GET mis inmuebles — Privado (Corrección del bug de búsqueda de Mongoose)
router.get('/propios/mis-inmuebles', verificarToken, verificarPublicante, async (req, res, next) => {
    try {
        const { departamento, municipio, tipo, tipoAlquiler, estado } = req.query;
        
        // Unificamos el dueño con los filtros dinámicos en un solo objeto
        const filtros = { propietario: req.usuario.id };

        if (departamento) filtros.departamento = departamento;
        if (municipio) filtros.municipio = { $regex: municipio, $options: 'i' }; 
        if (tipo) filtros.tipo = tipo;
        if (tipoAlquiler) filtros.tipoAlquiler = tipoAlquiler;
        if (estado) filtros.estado = estado;

        const inmuebles = await Propiedad.find(filtros).sort({ createdAt: -1 });
        
        res.json(inmuebles);
    } catch (err) {
        next(err)
    }
});

// GET todas las propiedades — Público con filtros y PAGINACIÓN (Solo Admin)
router.get('/analisis', verificarToken, verificarAdmin, async (req, res, next) => {
    try {
        const todos = await Propiedad.countDocuments();
        const { departamento, estado, municipio, tipo, precioMax, tipoAlquiler, page = 1, limit = 20 } = req.query;
        
        const filtros = {}; 
        if (departamento) filtros.departamento = departamento;
        if (municipio) filtros.municipio = { $regex: municipio, $options: 'i' }; 
        if (tipo) filtros.tipo = tipo;
        if (tipoAlquiler) filtros.tipoAlquiler = tipoAlquiler;
        if (estado) filtros.estado = estado; 
        if (precioMax) filtros.precio = { $lte: Number(precioMax) }; 

        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
        const skip = (pageNum - 1) * limitNum;

        const [inmuebles, totalFiltrado] = await Promise.all([
            Propiedad.find(filtros)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum),
            Propiedad.countDocuments(filtros)
        ]);
        
        res.json({
            totalGlobal: todos,
            totalFiltrado: totalFiltrado,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(totalFiltrado / limitNum),
            inmuebles
        });
    } catch (err) {
        next(err)
    }
});


// GET - número de estadisticas 
router.get('/analisis/estadisticas', verificarToken, verificarAdmin, async (req, res, next) => {
    try {
        // 1. Recibimos las fechas desde la URL (ej: /estadisticas?fechaInicio=2026-01-01&fechaFin=2026-12-31)
        const { fechaInicio, fechaFin } = req.query;
        
        // Creamos un objeto de filtro para la agregación
        const filtroGlobal = {};

        // Si el administrador envía fechas, armamos el rango usando el campo de Mongo "createdAt"
        if (fechaInicio || fechaFin) {
            filtroGlobal.createdAt = {};
            if (fechaInicio) filtroGlobal.createdAt.$gte = new Date(fechaInicio); // $gte: Mayor o igual que
            if (fechaFin) filtroGlobal.createdAt.$lte = new Date(fechaFin);       // $lte: Menor o igual que
        }

        // 2. Ejecutamos la agregación con el filtro de fechas al inicio
        const estadisticas = await Propiedad.aggregate([
            // ETAPA 1: Filtrado de fechas inicial (Afecta a todo el proceso)
            { $match: filtroGlobal },

            // ETAPA 2: El Súper Agrupador protegido
            {
                $facet: {
                    porEstado: [
                        { $match: { estado: { $exists: true, $ne: null, $nin: ["", " "] } } },
                        { $group: { _id: "$estado", cantidad: { $sum: 1 } } }
                    ],
                    porTipo: [
                        { $match: { tipo: { $exists: true, $ne: null, $nin: ["", " "] } } },
                        { $group: { _id: "$tipo", cantidad: { $sum: 1 } } }
                    ],
                    porAlquiler: [
                        { $match: { tipoAlquiler: { $exists: true, $ne: null, $nin: ["", " "] } } },
                        { $group: { _id: "$tipoAlquiler", cantidad: { $sum: 1 } } }
                    ]
                }
            }
        ]);

        // Tu línea se mantiene exactamente igual 
        const { porEstado, porTipo, porAlquiler } = estadisticas[0];

        // 3. Calculamos el total dinámico basado en lo que devolvieron los filtros
        // Sumamos las cantidades de cualquiera de los grupos para saber el total de este período
        const totalPeriodo = porEstado.reduce((acumulador, item) => acumulador + item.cantidad, 0);

        res.json({
            totalGlobal: totalPeriodo, // Ahora representa el total del período seleccionado
            porEstado,  
            porTipo,    
            porAlquiler 
        });

    } catch (err) {
        next(err)
    }
});



// POST crear inmueble — Convención REST limpia sin la palabra '/publicar'
router.post('/', verificarToken, verificarPublicante, validarPropiedad, async (req, res, next) => {
    try {
        const codigoAleatorio = crypto.randomBytes(3).toString('hex').toUpperCase();

        // Validar que las imágenes sean URLs válidas
        if (req.body.areas && Array.isArray(req.body.areas)) {
            for (const area of req.body.areas) {
                if (area.imagen1 && !validator.isURL(area.imagen1, { require_protocol: true })) {
                    return res.status(400).json({ error: `La URL de la imagen del área ${area.nombre} no es válida.` });
                };
            
            // ... validar imagen2, imagen3
            }
        }

        const datosInmueble = { 
            ...req.body, 
            codigoCorto: codigoAleatorio,
            propietario: req.usuario.id, 
            likes: 0 
        };

        const nuevo = await Propiedad.create(datosInmueble);
        res.status(201).json(nuevo);
    } catch (err) {
        next(err)
    }
});
// PUT editar inmueble — Convención REST limpia sin la palabra '/editar'
router.put('/:id', verificarToken, verificarPublicante, verificarDuenio(Propiedad), validarPropiedad,  async (req, res) => {
    try {

        // Bloqueamos que intenten editar el codigoCorto manualmente desde el req.body
        delete req.body.codigoCorto;

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

router.put('/:id/agregar-areas', verificarToken, verificarPublicante, verificarDuenio(Propiedad, 'propietario', 'zonas areas'), async (req, res, next) => {
    try {
        const inmueble = req.recurso; 

        const { nuevasAreas, tipoZona } = req.body;

        // Validar tipoZona
        const zonasPermitidas = ['Exterior', 'Cocina', 'Baño', 'habitación', 'Cuarto de lavado', 
            'Vestidor', 'Bodega', 'Sala de estar', 'Comedor', 'Cuarto de estudio', 'Piso',
            'Patio interior', 'Terraza', 'otros'];
        if (!tipoZona || !zonasPermitidas.includes(tipoZona)) {
            return res.status(400).json({ error: "El 'tipoZona' no es válido." });
        }

        // Validar estructura de nuevasAreas
        if (!nuevasAreas || !Array.isArray(nuevasAreas) || nuevasAreas.length === 0) {
            return res.status(400).json({ error: "Debe enviar una lista 'nuevasAreas' con al menos un elemento." });
        }

        for (const area of nuevasAreas) {
            if (!area.nombre || !area.imagen1) {
                return res.status(400).json({ error: "Cada área debe tener 'nombre' e 'imagen1'." });
            }
            if (!validator.isURL(area.imagen1, { require_protocol: true })) {
                return res.status(400).json({ error: `La URL de la imagen del área '${area.nombre}' no es válida.` });
            }
        }

        // Limitar número total de áreas (ej. máximo 50)
        const totalAreasActuales = inmueble.areas ? inmueble.areas.length : 0;
        if (totalAreasActuales + nuevasAreas.length > 50) {
            return res.status(400).json({ error: "No puedes agregar más de 50 áreas en total." });
        }

        const cantidadAIncrementar = nuevasAreas.length;
        const existeZona = inmueble.zonas.some(z => z.nombreZona === tipoZona);
        let inmuebleActualizado;

        if (existeZona) {
            inmuebleActualizado = await Propiedad.findOneAndUpdate(
                { _id: req.params.id, "zonas.nombreZona": tipoZona },
                { 
                    $push: { areas: { $each: nuevasAreas } },
                    $inc: { "zonas.$.cantidad": cantidadAIncrementar }
                },
                { new: true, runValidators: true }
            );
        } else {
            inmuebleActualizado = await Propiedad.findByIdAndUpdate(
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
    } catch (err) { next(err) }
});

// ELIMINAR UNA SOLA ÁREA POR SU ID DE SUBESQUEMA
router.put('/:id/eliminar-area/:areaId/:nombreZona', verificarToken, verificarPublicante, async (req, res, next) => {
    try {
        const inmueble = await Propiedad.findById(req.params.id).select('propietario zonas');
        if (!inmueble) return res.status(404).json({ error: 'La publicación no existe' });

        const esDueño = inmueble.propietario.equals(req.usuario.id);
        const esAdmin = req.usuario.rol === 'admin';
        if (!esDueño && !esAdmin) return res.status(403).json({ error: 'No tienes permisos para eliminar esta publicación' });

        const { areaId, nombreZona } = req.params;

        // 1. Ejecutamos primero la resta tradicional y sacamos el área
        let inmuebleActualizado = await Propiedad.findOneAndUpdate(
            { _id: req.params.id, "zonas.nombreZona": nombreZona },
            {
                $pull: { areas: { _id: areaId } },
                $inc: { "zonas.$.cantidad": -1 }
            },
            { new: true }
        );

        // Si por alguna razón la zona no estaba mapeada numéricamente pero sí el área, limpiamos solo el área
        if (!inmuebleActualizado) {
            inmuebleActualizado = await Propiedad.findByIdAndUpdate(
                req.params.id,
                { $pull: { areas: { _id: areaId } } },
                { new: true }
            );
            return res.json({ mensaje: "Área eliminada", inmuebleActualizado });
        }

        // 2. LÓGICA DE LIMPIEZA AUTOMÁTICA: 
        // Buscamos la zona que acabamos de modificar dentro del resultado devuelto
        const zonaModificada = inmuebleActualizado.zonas.find(z => z.nombreZona === nombreZona);

        // Si la cantidad llegó a 0 (o menos por error), la borramos por completo de la base de datos
        if (zonaModificada && zonaModificada.cantidad <= 0) {
            inmuebleActualizado = await Propiedad.findByIdAndUpdate(
                req.params.id,
                { $pull: { zonas: { nombreZona: nombreZona } } }, // Remueve el objeto del catálogo por completo
                { new: true }
            );
        }

        res.json({ mensaje: "Área eliminada y catálogo de zonas optimizado", inmuebleActualizado });
    } catch (err) { next(err) }
});



// DELETE eliminar inmueble — Convención REST limpia sin la palabra '/eliminar'
router.delete('/:id', verificarToken, verificarPublicante, verificarDuenio(Propiedad), async (req, res, next) => {
    try {
        const eliminado = req.recurso;
        await eliminado.deleteOne()
        res.json({ mensaje: 'Inmueble eliminado correctamente', eliminado });
    } catch (err) {
        next(err)
    }
});





export default router;
