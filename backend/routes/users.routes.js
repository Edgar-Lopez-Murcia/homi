import express from 'express';
import Users from '../models/Users.js';

const router = express.Router();
import verificarToken from '../middleware/auth.js';
import verificarAdmin from '../middleware/admin.js';
import { calcularPaginacion, filtrarExacto, filtrarRegex,
    filtrarRangoFechas, filtrarBooleano } from '../utils/paginationAndFilters.js';

// GET todos los usuarios — Público con filtros y PAGINACIÓN (Solo Admin)
router.get('/analisis', verificarToken, verificarAdmin, async (req, res, next) => {
    try {
        const todos = await Users.countDocuments();

        const { pageNum, limitNum, skip } = calcularPaginacion(req.query);
        
        const filtros = {
            ...filtrarExacto(req.query, ['departamento', 'rol', 'email', 'estado']),
            ...filtrarRegex(req.query, ['municipio', 'nombre']),
            ...filtrarRangoFechas(req.query, 'fechaInicio', 'fechaFin', 'createdAt'),
            ...filtrarBooleano(req.query, 'verificado') 
        };



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
// GET - número de estadisticas 
router.get('/analisis/estadisticas', verificarToken, verificarAdmin, async (req, res, next) => {
    try {
        // 1. Usamos la función modular para limpiar el rango de fechas
        const filtroGlobal = {
            ...filtrarRangoFechas(req.query, 'fechaInicio', 'fechaFin', 'createdAt'),
            ...filtrarExacto(req.query, ['departamento'])
        };

        // 2. Ejecutamos la agregación con el filtro de fechas al inicio
        const estadisticas = await Users.aggregate([
            // ETAPA 1: Filtrado de fechas inicial
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

        // Corregido: agregamos el [0] que faltaba abajo para leer bien la agregación
        const { porEstado, porRol } = estadisticas[0];

        // 3. Calculamos el total dinámico basado en el período seleccionado
        const totalPeriodo = porEstado.reduce((acumulador, item) => acumulador + item.cantidad, 0);

        res.json({
            totalGlobal: totalPeriodo, 
            porEstado,  
            porRol 
        });

    } catch (err) {
        next(err);
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