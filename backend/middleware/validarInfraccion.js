const validarInfraccion = (req, res, next) => {
    const {nombre, descripcion, gravedad, diasSuspencion, multa} = req.body;

    const gravedadesPermitidas = ['pequeña', 'leve', 'moderada', 'grave', 'critica']

    if (!nombre || nombre.trim().length < 3 || nombre.trim().length > 50) {
        return res.status(400).json({ error: "El nombre es obligatorio y debe tener al menos 3 caracteres y menos de 50 caracteres." });
    }
    if (!descripcion || descripcion.trim().length < 10 || descripcion.trim().length > 500) {
        return res.status(400).json({ error: "la descripcion es obligatoria y debe tener al menos 10 caracteres y menos de 500 caracteres." });
    }
    if (!gravedad || !gravedadesPermitidas.includes(gravedad.toLowerCase())) return res.status(400).json({ error: "la gravedad no es válido." });

    if (diasSuspencion === undefined || diasSuspencion === null) {
        return res.status(400).json({ error: "Los 'dias de suspencion' son obligatorios." });
    } else {
        const diasNum = Number(diasSuspencion);
        if (isNaN(diasNum) || diasNum < 0) return res.status(400).json({ error: "los 'dias de suspencion' deben ser un número mayor o igual a cero." });
        req.body.diasSuspencion = diasNum;
    };

    if (multa === undefined || multa === null) {
        return res.status(400).json({ error: "La 'multa' es obligatorios." });
    } else {
        const multaNum = Number(multa);
        if (isNaN(multaNum) || multaNum < 0) return res.status(400).json({ error: "la 'multa' debe ser un número mayor o igual a cero." });
        req.body.multa = multaNum;
    }


    next();
};

export default validarInfraccion;