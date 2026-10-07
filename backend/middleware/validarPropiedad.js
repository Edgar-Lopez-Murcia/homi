// middleware/validarPropiedad.js

const validarPropiedad = (req, res, next) => {
    const { titulo, descripcion, tipo, tipoAlquiler, departamento, municipio, direccionExacta, estado, precio } = req.body;

    const tiposPermitidos = ['casa', 'apartamento', 'apartamento-estudio', 'habitacion', 'local'];
    const alquilerPermitidos = ['Larga Estancia', 'Corta Estancia', 'Flexible'];
    const estadosPermitidos = ['disponible', 'arrendado', 'suspendido'];

    if (!titulo || titulo.trim() === "") return res.status(400).json({ error: "El 'titulo' es obligatorio." });
    if (!descripcion || descripcion.trim() === "") return res.status(400).json({ error: "La 'descripcion' es obligatoria." });
    if (!departamento || departamento.trim() === "") return res.status(400).json({ error: "El 'departamento' es obligatorio." });
    if (!municipio || municipio.trim() === "") return res.status(400).json({ error: "El 'municipio' es obligatorio." });
    if (!direccionExacta || direccionExacta.trim() === "") return res.status(400).json({ error: "La 'direccionExacta' es obligatoria." });

    if (!tipo || !tiposPermitidos.includes(tipo.toLowerCase())) return res.status(400).json({ error: "El tipo de inmueble no es válido." });
    if (tipoAlquiler && !alquilerPermitidos.includes(tipoAlquiler)) return res.status(400).json({ error: "El tipo de alquiler no es válido." });
    if (estado && !estadosPermitidos.includes(estado.toLowerCase())) return res.status(400).json({ error: "El estado del inmueble no es válido." });

    if (precio === undefined || precio === null) {
        return res.status(400).json({ error: "El 'precio' es obligatorio." });
    } else {
        const precioNum = Number(precio);
        if (isNaN(precioNum) || precioNum < 0) return res.status(400).json({ error: "El 'precio' debe ser un número mayor o igual a cero." });
        req.body.precio = precioNum;
    }
    // Dentro de middleware/validarPropiedad.js (Añadir al bloque de validaciones)

    const { ubicacion } = req.body;

    if (!ubicacion || !ubicacion.coordinates || !Array.isArray(ubicacion.coordinates) || ubicacion.coordinates.length !== 2) {
        return res.status(400).json({ error: "La 'ubicacion' con coordenadas [Longitud, Latitud] es obligatoria." });
    }

    const [longitud, latitud] = ubicacion.coordinates;

    // Validar límites matemáticos reales del planeta Tierra
    if (isNaN(longitud) || longitud < -180 || longitud > 180) {
        return res.status(400).json({ error: "La Longitud debe ser un número entre -180 y 180." });
    }
    if (isNaN(latitud) || latitud < -90 || latitud > 90) {
        return res.status(400).json({ error: "La Latitud debe ser un número entre -90 y 90." });
    }

    next();
};

module.exports = validarPropiedad;
