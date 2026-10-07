const express = require('express');
const Propiedad = require('../models/Properties');

const router = express.Router();
const verificarToken = require('../middleware/auth');
const verificarAdmin = require('../middleware/admin');
const verificarPublicante = require('../middleware/publicante');
const sanitizarEntradas = require('../middleware/sanitizarEntradas');
const crypto = require('crypto'); 
const validarPropiedad = require('../middleware/validarPropiedad');


// ============================================
// 🌐 RUTAS PÚBLICAS — GET
// ============================================

// GET todas las propiedades — Público con filtros y PAGINACIÓN 
router.get('/', async (req, res) => {
    try {
        const { 
            departamento, codigoCorto, municipio, tipo, tipoAlquiler, 
            precioMin, precioMax, habitacionesMin,
            lat, lng, distanciaMax = 5000, // distanciaMax por defecto: 5000 metros (5km)
            page = 1, limit = 20 
        } = req.query;

        let filtros = {};

        // 1. PRIORIDAD MÁXIMA: Si buscan por código corto directo
        if (codigoCorto) {
            filtros = { codigoCorto: codigoCorto.toUpperCase().trim() };
        } else {
            // Filtro base para los clientes comunes
            filtros.estado = 'disponible'; 

            // 2. FILTROS GEOGRÁFICOS (MAPA): Buscar por cercanía radial
            if (lat && lng) {
                filtros.ubicacion = {
                    $near: {
                        $geometry: {
                            type: "Point",
                            coordinates: [Number(lng), Number(lat)] // [Longitud, Latitud] obligatoriamente
                        },
                        $maxDistance: Number(distanciaMax) // Distancia máxima en metros
                    }
                };
            }

            // 3. FILTROS TEXTUALES Y CATÁLOGOS
            if (departamento) filtros.departamento = departamento;
            if (municipio) filtros.municipio = { $regex: municipio, $options: 'i' }; 
            if (tipo) filtros.tipo = tipo;
            if (tipoAlquiler) filtros.tipoAlquiler = tipoAlquiler;

            // 4. BÚSQUEDA AVANZADA: Rangos de Precios
            if (precioMin || precioMax) {
                filtros.precio = {};
                if (precioMin) filtros.precio.$gte = Number(precioMin); // Mayor o igual que
                if (precioMax) filtros.precio.$lte = Number(precioMax); // Menor o igual que
            }

            // 5. BÚSQUEDA AVANZADA DENTRO DE ARREGLOS (Zonas/Habitaciones)
            // Filtra inmuebles que tengan una zona llamada 'habitacion' cuya cantidad sea >= a lo pedido
            if (habitacionesMin) {
                filtros.zonas = {
                    $elemMatch: {
                        nombreZona: 'habitacion',
                        cantidad: { $gte: Number(habitacionesMin) }
                    }
                };
            }
        }

        // Paginación Robusta
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
        const skip = (pageNum - 1) * limitNum;

        // Si se usa $near, MongoDB exige usar .find() tradicional para paginar.
        // Contamos los documentos basados en los filtros aplicados.
        const [inmuebles, total] = await Promise.all([
            Propiedad.find(filtros)
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
        res.status(500).json({ error: 'Error en la búsqueda avanzada de inmuebles', detalle: err.message });
    }
});



// GET un inmueble por ID específico — Público
router.get('/:id', async (req, res) => {
    try {
        const inmueble = await Propiedad.findById(req.params.id);
        if (!inmueble) return res.status(404).json({ error: 'Inmueble no encontrado' });

        res.json(inmueble);
    } catch (err) {
        if (err.name === 'CastError') {
            return res.status(400).json({ error: 'ID de inmueble inválido' });
        }
        res.status(500).json({ error: err.message });
    } 
});

// ============================================
// 🔒 RUTAS PRIVADAS (PROPIETARIOS / ADMINS)
// ============================================

// GET mis inmuebles — Privado (Corrección del bug de búsqueda de Mongoose)
router.get('/propios/mis-inmuebles', verificarToken, verificarPublicante, async (req, res) => {
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
        res.status(500).json({ error: 'Error al obtener tus inmuebles' });
    }
});

// GET todas las propiedades — Público con filtros y PAGINACIÓN (Solo Admin)
router.get('/analisis', verificarToken, verificarAdmin, async (req, res) => {
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
        res.status(500).json({ error: 'Error al obtener los inmuebles filtrados', detalle: err.message });
    }
});


// GET - número de estadisticas 
router.get('/analisis/estadisticas', verificarToken, verificarAdmin, async (req, res) => {
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
        res.status(500).json({ error: 'Error al generar las estadísticas', detalle: err.message });
    }
});



// POST crear inmueble — Convención REST limpia sin la palabra '/publicar'
router.post('/', verificarToken, verificarPublicante, validarPropiedad, sanitizarEntradas, async (req, res) => {
    try {
        // Generamos un código aleatorio único de 6 caracteres (ej: A9F3B2)
        const codigoAleatorio = crypto.randomBytes(3).toString('hex').toUpperCase();

        const datosInmueble = { 
            ...req.body, 
            codigoCorto: codigoAleatorio, // <-- El backend lo genera e inyecta aquí automáticamente
            propietario: req.usuario.id, 
            likes: 0 
        };

        const nuevo = await Propiedad.create(datosInmueble);
        res.status(201).json(nuevo);
    } catch (err) {
        // Si por extrema mala suerte el código ya existía, Mongo arrojará el error 11000
        if (err.code === 11000) {
            return res.status(400).json({ error: "Hubo un problema de unicidad con el código generado, por favor intenta enviar el formulario de nuevo." });
        }
        res.status(400).json({ error: err.message }); 
    }
});
// PUT editar inmueble — Convención REST limpia sin la palabra '/editar'
router.put('/:id', verificarToken, verificarPublicante, validarPropiedad, sanitizarEntradas, async (req, res) => {
    try {
        const inmueble = await Propiedad.findById(req.params.id).select('propietario');
        if (!inmueble) return res.status(404).json({ error: 'La publicación no existe' });

        const esDueño = inmueble.propietario.equals(req.usuario.id);
        const esAdmin = req.usuario.rol === 'admin'; 

        if (!esDueño && !esAdmin) {
            return res.status(403).json({ error: 'No tienes permisos para editar esta publicación' });
        }

        // Bloqueamos que intenten editar el codigoCorto manualmente desde el req.body
        delete req.body.codigoCorto;

        const editar = await Propiedad.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        res.json(editar);
    } catch (err) {
        if (err.name === 'CastError') return res.status(400).json({ error: 'ID de inmueble inválido' });
        res.status(500).json({ error: err.message });
    }
});

router.put('/:id/agregar-areas', verificarToken, verificarPublicante, sanitizarEntradas, async (req, res) => {
    try {
        const inmueble = await Propiedad.findById(req.params.id).select('propietario zonas');
        if (!inmueble) return res.status(404).json({ error: 'La publicación no existe' });

        const esDueño = inmueble.propietario.equals(req.usuario.id);
        const esAdmin = req.usuario.rol === 'admin';
        if (!esDueño && !esAdmin) return res.status(403).json({ error: 'No tienes permisos para editar esta publicación' });

        const { nuevasAreas, tipoZona } = req.body; 
        
        // Validamos que venga una lista real de áreas
        if (!nuevasAreas || !Array.isArray(nuevasAreas) || nuevasAreas.length === 0 || !tipoZona) {
            return res.status(400).json({ error: "Debe enviar una lista 'nuevasAreas' y el 'tipoZona'." });
        }

        // Sabremos cuántas áreas está agregando de golpe (ej: 3 baños = cantidadAIncrementar es 3)
        const cantidadAIncrementar = nuevasAreas.length;

        const existeZona = inmueble.zonas.some(z => z.nombreZona === tipoZona);
        let inmuebleActualizado;

        if (existeZona) {
            // CASO A: La zona existe -> Insertamos todas las áreas ($each) e incrementamos el número exacto
            inmuebleActualizado = await Propiedad.findOneAndUpdate(
                { _id: req.params.id, "zonas.nombreZona": tipoZona },
                { 
                    $push: { areas: { $each: nuevasAreas } }, // 🔥 $each mete toda la lista de golpe
                    $inc: { "zonas.$.cantidad": cantidadAIncrementar } // 🔥 Suma +3, o +2, según corresponda
                },
                { new: true, runValidators: true }
            );
        } else {
            // CASO B: La zona NO existe -> Insertamos las áreas y CREAMOS la zona con la cantidad inicial exacta
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
    } catch (err) { res.status(500).json({ error: err.message }); }
});


// ELIMINAR UNA SOLA ÁREA POR SU ID DE SUBESQUEMA
router.put('/:id/eliminar-area/:areaId/:nombreZona', verificarToken, verificarPublicante, async (req, res) => {
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
    } catch (err) { res.status(500).json({ error: err.message }); }
});



// DELETE eliminar inmueble — Convención REST limpia sin la palabra '/eliminar'
router.delete('/:id', verificarToken, verificarPublicante, async (req, res) => {
    try {
        const inmueble = await Propiedad.findById(req.params.id).select('propietario');
        if (!inmueble) return res.status(404).json({ error: 'La publicación no existe' });

        const esDueño = inmueble.propietario.equals(req.usuario.id);
        const esAdmin = req.usuario.rol === 'admin';

        if (!esDueño && !esAdmin) {
            return res.status(403).json({ error: 'No tienes permisos para eliminar esta publicación' });
        }

        const eliminado = await Propiedad.findByIdAndDelete(req.params.id);
        res.json({ mensaje: 'Inmueble eliminado correctamente', eliminado });
    } catch (err) {
        if (err.name === 'CastError') {
            return res.status(400).json({ error: 'ID de inmueble inválido' });
        }
        res.status(500).json({ error: err.message });
    }
});





module.exports = router;
