import express from 'express';
import Users from '../models/Users.js';

const router = express.Router();
import verificarToken from '../middleware/auth.js';
import verificarAdmin from '../middleware/admin.js';

// GET todos los usuarios — Público con filtros y PAGINACIÓN (Solo Admin)
router.get('/analisis', verificarToken, verificarAdmin, async (req, res, next) => {
    try {
        const todos = await Users.countDocuments();
        const { departamento, municipio, nombre, email, rol, estado, verificado, page = 1, limit = 20 } = req.query;
        
        const filtros = {}; 
        if (departamento) filtros.departamento = departamento;
        if (municipio) filtros.municipio = { $regex: municipio, $options: 'i' }; 
        if (rol) filtros.rol = rol;
        if (nombre) filtros.nombre = { $regex: nombre, $options: 'i' }; // Opcional: Búsqueda inteligente por nombre
        if (email) filtros.email = email;
        if (estado) filtros.estado = estado; 

        // REPARADO: Conversión estricta de string a booleano real para MongoDB
        if (verificado !== undefined && verificado !== '') {
            filtros.verificado = verificado === 'true'; 
        }

        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
        const skip = (pageNum - 1) * limitNum;

        // REPARADO: Agregamos .select('-password') para no filtrar los hashes por la red
        const [usuarios, totalFiltrado] = await Promise.all([
            Users.find(filtros)
                .select('-password') 
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum),
            Users.countDocuments(filtros)
        ]);
        
        res.json({
            totalGlobal: todos,
            totalFiltrado: totalFiltrado,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(totalFiltrado / limitNum),
            usuarios // Corregido: el nombre semántico correcto es usuarios, no inmuebles
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
        const estadisticas = await Users.aggregate([
            // ETAPA 1: Filtrado de fechas inicial (Afecta a todo el proceso)
            { $match: filtroGlobal },

            // ETAPA 2: El Súper Agrupador protegido
            {
                $facet: {
                    porEstado: [
                        { $match: { estado: { $exists: true, $ne: null, $nin: ["", " "] } } },
                        { $group: { _id: "$estado", cantidad: { $sum: 1 } } }
                    ],
                    porRol: [
                        { $match: { rol: { $exists: true, $ne: null, $nin: ["", " "] } } },
                        { $group: { _id: "$rol", cantidad: { $sum: 1 } } }
                    ]
                }
            }
        ]);

        if (!estadisticas || estadisticas.length === 0) {
            return res.json({ totalGlobal: 0, porEstado: [], porRol: [] });
        }

        // Tu línea se mantiene exactamente igual 
        const { porEstado, porRol } = estadisticas[0];

        // 3. Calculamos el total dinámico basado en lo que devolvieron los filtros
        // Sumamos las cantidades de cualquiera de los grupos para saber el total de este período
        const totalPeriodo = porEstado.reduce((acumulador, item) => acumulador + item.cantidad, 0);

        res.json({
            totalGlobal: totalPeriodo, // Ahora representa el total del período seleccionado
            porEstado,  
            porRol 
        });

    } catch (err) {
        next(err)
    }
});

// Ruta para actualizar el tipo de usuario, la verificación y el estado del usuario ( Solo administradores )
router.put('/actualizar-verificacion/:id',verificarToken, verificarAdmin, async (req, res, next) => {
    try{

        const {tipoUsuario, verificado, estado} = req.body;
        
        // Validar tipoUsuario
        if (tipoUsuario !== undefined && !['propietario', 'empresa', 'arrendatario'].includes(tipoUsuario)) {
            return res.status(400).json({ error: 'tipoUsuario no es válido.' });
        }
        // Validar verificado
        if (verificado !== undefined && typeof verificado !== 'boolean') {
            return res.status(400).json({ error: 'verificado debe ser booleano.' });
        }
        // Validar estado
        const estadosPermitidos = ['ACTIVE', 'SUSPENDED', 'RESTRICTED', 'BANNED', 'INACTIVE'];
        if (estado !== undefined && !estadosPermitidos.includes(estado)) {
            return res.status(400).json({ error: 'estado no es válido.' });
        }
        const camposActualizar = {};

        if (tipoUsuario !== undefined) camposActualizar.tipoUsuario = tipoUsuario;
        if (verificado !== undefined) camposActualizar.verificado = verificado;
        if (estado !== undefined) camposActualizar.estado = estado;

        const modificado = await Users.findByIdAndUpdate(
            req.params.id,
            camposActualizar,
            {new: true, runValidators: true}
        ).select('-password');

        if (!modificado) {
            return res.status(404).json({ error: 'La cuenta no existe'});
        }
        res.json({
            mensaje: 'Perfil actualizado con exito por el administrador',
            perfil: modificado
        });
    } catch (err) {
        next(err)
    }
}); 

export default router;