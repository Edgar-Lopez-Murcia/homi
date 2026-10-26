// utils/buildPropertyFilter.js
import { calcularPaginacion, filtrarExacto, filtrarRegex,
    filtrarBooleano } from './paginationAndFilters.js'

export const buildPropertyFilter = (query) => {
    const {
        departamento, codigoCorto, municipio, tipo, tipoAlquiler,
        precioMin, precioMax, habitacionesMin, bañosMin,
        likesMin // Añadido por si quieres filtrar por popularidad
    } = query;

    let filtros = {};

    // 1. Búsqueda por código exacto
    if (codigoCorto) {
        return { codigoCorto: codigoCorto.toUpperCase().trim() };
    }

    // 2. Filtros generales
    filtros.estado = 'disponible'; // Por defecto solo mostramos disponibles

    if (departamento) filtros.departamento = departamento;
    if (municipio) filtros.municipio = { $regex: municipio, $options: 'i' };
    if (tipo) filtros.tipo = tipo;
    if (tipoAlquiler) filtros.tipoAlquiler = tipoAlquiler;

    // 3. Rango de precios
    if (precioMin || precioMax) {
        filtros.precio = {};
        if (precioMin) filtros.precio.$gte = Number(precioMin);
        if (precioMax) filtros.precio.$lte = Number(precioMax);
    }

    // 4. Filtro de Likes (opcional)
    if (likesMin) {
        filtros.likes = { $gte: Number(likesMin) };
    }

    // 5. Filtros de Zonas (Habitaciones y Baños) - SOLUCIÓN AL BUG
    // Usamos $and para que no se sobrescriban entre sí
    filtros.$and = [];
    
    if (habitacionesMin) {
        filtros.$and.push({
            zonas: {
                $elemMatch: {
                    nombreZona: 'Habitación',
                    cantidad: { $gte: Number(habitacionesMin) }
                }
            }
        });
    }
    
    if (bañosMin) {
        filtros.$and.push({
            zonas: {
                $elemMatch: {
                    nombreZona: 'Baño', // Ojo: en tu modelo está con mayúscula
                    cantidad: { $gte: Number(bañosMin) }
                }
            }
        });
    }

    // Si no hay filtros en $and, lo eliminamos para no enviar un array vacío a Mongo
    if (filtros.$and.length === 0) delete filtros.$and;
    logger.info(`Filtros de búsqueda generados: ${JSON.stringify(filtros)}`);

    return filtros;
};