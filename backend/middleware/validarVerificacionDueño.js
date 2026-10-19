const validarInfraccion = (req, res, next) => {
    const {nombreUsuario, tipoDocumento, numeroDocumento, 
        fechaNacimiento, telefono, email, aceptarTratamientoDatos} = req.body;

    const documentossPermitidos = ['Cédula de Ciudadania', 'Cédula de Extranjería', 'Permiso por protección Temporal']

    if (!nombreUsuario || nombreUsuario.trim().length < 3 || nombreUsuario.trim().length > 50) {
        return res.status(400).json({ error: "El nombre es obligatorio y debe tener al menos 3 caracteres y menos de 50 caracteres." });
    };

    if (!tipoDocumento || !documentossPermitidos.includes(tipoDocumento)) return res.status(400).json({ error: "El documento no es válido." });

    if (!numeroDocumento || numeroDocumento.trim().length < 5 || descripcion.trim().length > 20) {
        return res.status(400).json({ error: "el numero del documento es obligatori0 y debe tener mas de 5 caracteres y menos de 20 caracteres." });
    };


    req.body.estado = 'PENDIENTE';
    
    
    if (!email || !validator.isEmail(email)) {
        return res.status(400).json({ error: "Por favor, introduce un correo electrónico válido." });
    }

    if (diasSuspencion === undefined || diasSuspencion === null) {
        return res.status(400).json({ error: "Los 'dias de suspencion' son obligatorios." });
    } else {
        const diasNum = Number(diasSuspencion);
        if (isNaN(diasNum) || diasNum < 0) return res.status(400).json({ error: "los 'dias de suspencion' deben ser un número mayor o igual a cero." });
        req.body.diasSuspencion = diasNum;
    };

    if (multa === undefined || diasSuspencion === null) {
        return res.status(400).json({ error: "La 'multa' es obligatorios." });
    } else {
        const multaNum = Number(multa);
        if (isNaN(multaNum) || multaNum < 0) return res.status(400).json({ error: "los 'dias de suspencion' deben ser un número mayor o igual a cero." });
        req.body.multa = multaNum;
    }


    next();
};

export default validarInfraccion;