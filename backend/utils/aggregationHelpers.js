// utils/aggregationHelpers.js

// Respuesta paginada unificada (una sola fuente de verdad)
export const buildPagedResponse = (total, page, limit, inmuebles) => ({
    total,
    page,
    limit,
    totalPages: limit > 0 ? Math.ceil(total / limit) : 0,
    inmuebles
});

// Valida y parsea lat/lng/distanciaMax. Devuelve null si no hay geo,
// { error } si son inválidos, o { latN, lngN, distN } si son válidos.
export const parseGeoParams = (lat, lng, distanciaMax) => {
    if (lat === undefined || lng === undefined || lat === '' || lng === '') return null;

    const latN = Number(lat);
    const lngN = Number(lng);
    const distN = (distanciaMax === undefined || distanciaMax === '')
        ? 5000
        : Number(distanciaMax);

    if (!Number.isFinite(latN) || latN < -90 || latN > 90) {
        return { error: 'lat debe ser un número entre -90 y 90' };
    }
    if (!Number.isFinite(lngN) || lngN < -180 || lngN > 180) {
        return { error: 'lng debe ser un número entre -180 y 180' };
    }
    if (!Number.isFinite(distN) || distN <= 0) {
        return { error: 'distanciaMax debe ser un número positivo en metros' };
    }
    return { latN, lngN, distN };
};

// Ordenamiento con tiebreaker _id (paginación estable).
// En modo geo, el default respeta la distancia que ya calculó $geoNear.
export const buildSortObj = (sort, isGeo = false) => {
    switch (sort) {
        case 'precio_asc':  return { precio: 1,  _id: 1 };
        case 'precio_desc': return { precio: -1, _id: -1 };
        case 'likes_desc':  return { likes: -1,  _id: -1 };
        default:
            return isGeo
                ? { distancia: 1, _id: 1 }
                : { createdAt: -1, _id: -1 };
    }
};

// Construimos el bloque que nos permitira traer el numero de cada campo del objeto

export const construirFacetEstadisticas = (campos = []) => {
    const facetObj = {};

    for (const campo of campos) {
        // Creamos la propiedad dinámica en el objeto (ej: porEstado, porTipo, porRol)
        const nombreLlave = `por${campo.charAt(0).toUpperCase()}${campo.slice(1)}`;

        facetObj[nombreLlave] = [
            {
                $match: {
                    [campo]: { $exists: true, $ne: null, $nin: ["", " "] }
                }
            },
            {
                $group: {
                    _id: `$${campo}`,
                    cantidad: { $sum: 1 }
                }
            }
        ];
    }

    return facetObj;
};
