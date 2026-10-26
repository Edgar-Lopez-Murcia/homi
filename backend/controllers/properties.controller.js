// controllers/properties.controller.js (o donde prefieras)
import Properties from '../models/Properties.js';
import { buildPropertyFilter } from '../utils/buildPropertyFilter.js';
import { calcularPaginacion } from '../utils/paginationAndFilters.js';

export const getProperties = async (req, res, next) => {
    try {
        const { lat, lng, distanciaMax = 5000, sort } = req.query;

        const { pageNum, limitNum, skip } = calcularPaginacion(req.query);

        // 2. Construir los filtros base
        const filtros = buildPropertyFilter(req.query);

        // 3. Manejo de ordenamiento (Sort)
        let sortObj = { createdAt: -1 }; // Por defecto, los más nuevos
        if (sort === 'precio_asc') sortObj = { precio: 1 };
        if (sort === 'precio_desc') sortObj = { precio: -1 };
        if (sort === 'likes_desc') sortObj = { likes: -1 };

        // 4. BÚSQUEDA GEOGRÁFICA (Agregación)
        if (lat && lng) {
            const pipeline = [
                {
                    $geoNear: {
                        near: { type: "Point", coordinates: [Number(lng), Number(lat)] },
                        distanceField: "distancia",
                        maxDistance: Number(distanciaMax),
                        spherical: true,
                        query: filtros // ¡Aquí pasamos TODOS los filtros anteriores! (Precio, tipo, etc.)
                    }
                },
                // Unir con el propietario
                {
                    $lookup: {
                        from: "users", // Asegúrate de que este sea el nombre real de tu colección
                        localField: "propietario",
                        foreignField: "_id",
                        as: "propietarioData"
                    }
                },
                {
                    $unwind: {
                        path: "$propietarioData",
                        preserveNullAndEmptyArrays: true
                    }
                },
                // Moldear la respuesta
                {
                    $project: {
                        document: "$$ROOT",
                        propietario: {
                            nombre: "$propietarioData.nombre",
                            imagenPerfil: "$propietarioData.imagenPerfil"
                        }
                    }
                },
                {
                    $replaceRoot: {
                        newRoot: { $mergeObjects: ["$document", { propietario: "$propietario" }] }
                    }
                },
                // Ocultar el objeto de datos extra del propietario
                { $project: { propietarioData: 0 } },
                { $sort: sortObj }, // Ordenamiento
                { $skip: skip },
                { $limit: limitNum }
            ];

            // Ejecutar consulta y conteo total
            const [inmuebles, totalResult] = await Promise.all([
                Properties.aggregate(pipeline),
                Properties.aggregate([
                    { $geoNear: { near: { type: "Point", coordinates: [Number(lng), Number(lat)] }, distanceField: "distancia", maxDistance: Number(distanciaMax), spherical: true, query: filtros } },
                    { $count: "total" }
                ])
            ]);

            const total = totalResult.length > 0 ? totalResult[0].total : 0;

            return res.json({
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum),
                inmuebles
            });
        }

        // 5. BÚSQUEDA NORMAL (Sin geolocalización)
        const [inmuebles, total] = await Promise.all([
            Properties.find(filtros)
                .populate('propietario', 'nombre imagenPerfil')
                .sort(sortObj)
                .skip(skip)
                .limit(limitNum),
            Properties.countDocuments(filtros)
        ]);

        res.json({
            total,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(total / limitNum),
            inmuebles
        });

    } catch (err) {
        next(err);
    }
};