// utils/buildPropertyFilter.js
import { filtrarExacto, filtrarRegex, filtrarRango } from './paginationAndFilters.js';
import logger from './logger.js';

export const buildPropertyFilter = (query) => {
    const { codigoCorto, habitacionesMin, bañosMin, likesMin } = query;

    // 1. Búsqueda por código exacto
    if (codigoCorto) {
        return { codigoCorto: codigoCorto.toUpperCase().trim() };
    }

    // 2. Construcción limpia del objeto filtros usando Spread (...)
    const filtros = {
        estado: 'disponible', // Filtro por defecto
        ...filtrarExacto(query, ['departamento', 'tipo', 'tipoAlquiler']),
        ...filtrarRegex(query, ['municipio']),
        ...filtrarRango(query, 'precioMin', 'precioMax', 'precio')
    };

    // 4. Filtro de Likes (opcional)
    if (likesMin) {
        filtros.likes = { $gte: Number(likesMin) };
    }

    // 4. Filtros manuales de Zonas Complejas (Habitaciones y Baños)
    const andConditions = [];
    
    if (habitacionesMin) {
        andConditions.push({
            zonas: {
                $elemMatch: {
                    nombreZona: 'Habitación',
                    cantidad: { $gte: Number(habitacionesMin) }
                }
            }
        });
    }
    
    if (bañosMin) {
        andConditions.push({
            zonas: {
                $elemMatch: {
                    nombreZona: 'Baño',
                    cantidad: { $gte: Number(bañosMin) }
                }
            }
        });
    }

    // Si se agregaron condiciones al array, lo inyectamos en el objeto filtros
    if (andConditions.length > 0) {
        filtros.$and = andConditions;
    }

    logger.info(`Filtros de búsqueda generados: ${JSON.stringify(filtros)}`);

    return filtros;
};