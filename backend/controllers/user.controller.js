import Users from '../models/Users.js';
import { calcularPaginacion, filtrarExacto, filtrarRegex,
    filtrarRangoFechas, filtrarBooleano } from '../utils/paginationAndFilters.js';
import { construirFacetEstadisticas } from '../utils/aggregationHelpers.js';

export const getAnalysis = async (req, res, next) => {
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

export const getStatistics = async (req, res, next) => {
    try {
        const filtroGlobal = {
            ...filtrarRangoFechas(req.query, 'fechaInicio', 'fechaFin', 'createdAt'),
            ...filtrarExacto(req.query, ['departamento'])
        };

        const camposUsuarios = ['estado', 'rol'];

        const estadisticas = await Users.aggregate([

            { $match: filtroGlobal },

            {
                $facet: construirFacetEstadisticas(camposUsuarios)
            }
        ]);

        if (!estadisticas || estadisticas.length === 0) {
            return res.json({ totalGlobal: 0, porEstado: [], porRol: [] });
        }

        const { porEstado, porRol } = estadisticas[0];

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

export const putActualize =  async (req, res, next) => {
    try{

        const modificado = await Users.findByIdAndUpdate(
            req.params.id,
            req.body,
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