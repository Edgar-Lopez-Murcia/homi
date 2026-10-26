// utils/controllerPagination.js


// controlador de paginacion de información
export const controlarPaginacion = (query) => {
        
        const { page = 1, limit = 20 } = query;

        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
        const skip = (pageNum - 1) * limitNum;

        return {pageNum, limitNum, skip}

};

// Filtra de forma exacta los campos que le pases en el array
export const filtrarExacto = (query, campos = []) => {
        const filtros = {};
        for (const campo of campos) {
                if (query[campo]) filtros[campo] = query[campo];
        }
        return filtros;
};

// Filtra usando $regex (búsqueda inteligente/parcial) para texto
export const filtrarRegex = (query, campos = []) => {
        const filtros = {};
        for (const campo of campos) {
                if (query[campo]) {
                filtros[campo] = { $regex: query[campo], $options: 'i' };
                }
        }
        return filtros;
};

// filtrar por rangos, tanto minimo como maximo 
export const filtrarRango = (query, campoDesde, campoHasta, nombreCampoDB) => {
        const filtroRango = {};
        if (query[campoDesde]) filtroRango.$gte = query[campoDesde];
        if (query[campoHasta]) filtroRango.$lte = query[campoHasta];
        
        // Si se usó al menos uno de los dos límites, retornamos el filtro
        return Object.keys(filtroRango).length > 0 ? { [nombreCampoDB]: filtroRango } : {};
};

// Función para rangos de fechas (Convierte strings de la URL a objetos Date de Mongo)
export const filtrarRangoFechas = (query, campoQueryDesde, campoQueryHasta, campoDB) => {
        const filtroRango = {};
        if (query[campoQueryDesde]) filtroRango.$gte = new Date(query[campoQueryDesde]);
        if (query[campoQueryHasta]) filtroRango.$lte = new Date(query[campoQueryHasta]);
        
        return Object.keys(filtroRango).length > 0 ? { [campoDB]: filtroRango } : {};
};


// Convierte strings 'true'/'false' de la URL en booleanos reales para la DB
export const filtrarBooleano = (query, campo) => {
        const valor = query[campo];
        if (valor !== undefined && valor !== '') {
                return { [campo]: valor === 'true' };
        }
        return {}; // Si no viene en la URL, devuelve un objeto vacío
};
