import Users from '../models/Users.js';
import { calcularPaginacion, filtrarExacto, filtrarRegex,
    filtrarRangoFechas, filtrarBooleano } from '../utils/paginationAndFilters.js';
import { construirFacetEstadisticas } from '../utils/aggregationHelpers.js';

export const getAnalisis = async (req, res, next) => {
    try {
        const todos = await Users.countDocuments();

        const { pageNum, limitNum, skip } = calcularPaginacion(req.query);
        
        const filtros = {
            ...filtrarExacto(req.query, ['departamento', 'rol', 'email', 'estado']),
            ...filtrarRegex(req.query, ['municipio', 'nombre']),
            ...filtrarRangoFechas(req.query, 'fechaInicio', 'fechaFin', 'createdAt'),
            ...filtrarBooleano(req.query, 'verificado') 
        };

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
            usuarios 
        });
    } catch (err) {
        next(err)
    }
};

export const getEstadisticas = async (req, res, next) => {
    try {
        // 1. Usamos la función modular para limpiar el rango de fechas
        const filtroGlobal = {
            ...filtrarRangoFechas(req.query, 'fechaInicio', 'fechaFin', 'createdAt'),
            ...filtrarExacto(req.query, ['departamento'])
        };

        const camposUsuarios = ['estado', 'rol'];

        // 2. Ejecutamos la agregación con el filtro de fechas al inicio
        const estadisticas = await Users.aggregate([
            // ETAPA 1: Filtrado de fechas inicial
            { $match: filtroGlobal },

            // ETAPA 2: El Súper Agrupador protegido
            {
                $facet: construirFacetEstadisticas(camposUsuarios)
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
};

export const putActualizar =  async (req, res, next) => {
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
}