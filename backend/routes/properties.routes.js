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

// GET todas las propiedades — Público con filtros y PAGINACIÓN (Estilo tu compañero)
router.get('/', async (req, res) => {
    try {
        const { departamento, codigoCorto, municipio, tipo, precioMax, tipoAlquiler, page = 1, limit = 20 } = req.query;
        let filtros = {};

        // Si buscan por código corto, ignoramos los demás filtros para encontrar el inmueble específico
        if (codigoCorto) {
            filtros = { codigoCorto: codigoCorto.toUpperCase().trim() };
        } else {
            // Filtros normales de catálogo para los clientes navegando la web
            filtros.estado = 'disponible'; 
            if (departamento) filtros.departamento = departamento;
            if (municipio) filtros.municipio = { $regex: municipio, $options: 'i' }; 
            if (tipo) filtros.tipo = tipo;
            if (tipoAlquiler) filtros.tipoAlquiler = tipoAlquiler;
            if (precioMax) filtros.precio = { $lte: Number(precioMax) }; 
        }

        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
        const skip = (pageNum - 1) * limitNum;

        const [inmuebles, total] = await Promise.all([
            Propiedad.find(filtros)
                .sort({ createdAt: -1 })
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
        res.status(500).json({ error: 'Error al obtener los inmuebles filtrados', detalle: err.message });
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
router.put('/:id', verificarToken, verificarPublicante, validarPropiedad, async (req, res) => {
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
