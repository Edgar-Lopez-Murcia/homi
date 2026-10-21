const validarInfraccion = (req, res, next) => {
    const {nombreUsuario, tipoDocumento, numeroDocumento, 
        fechaNacimiento, telefono, email, aceptarTratamientoDatos} = req.body;

    const documentossPermitidos = ['Cédula de Ciudadania', 'Cédula de Extranjería', 'Permiso por protección Temporal']

    if (!nombreUsuario || nombreUsuario.trim().length < 3 || nombreUsuario.trim().length > 50) {
        return res.status(400).json({ error: "El nombre es obligatorio y debe tener al menos 3 caracteres y menos de 50 caracteres." });
    };

    if (!tipoDocumento || !documentossPermitidos.includes(tipoDocumento)) return res.status(400).json({ error: "El documento no es válido." });

    if (!fechaNacimiento || typeof fechaNacimiento !== 'string' || fechaNacimiento.trim() === "") {
    return res.status(400).json({ error: "La fecha de nacimiento es obligatoria." });
    };

    // 2. Separar el texto por "/" (o por "-" si usan guiones)
    const partes = fechaNacimiento.split(/[-/]/); // Soporta tanto "20/10/2010" como "20-10-2010"

    if (partes.length !== 3) {
        return res.status(400).json({ error: "El formato debe ser DD/MM/AAAA." });
    };

    const dia = parseInt(partes[0], 10);
    const mes = parseInt(partes[1], 10);
    const anio = parseInt(partes[2], 10);

    // 3. Crear el objeto Date de manera estricta (Mes en JS va de 0 a 11)
    const fechaConvertida = new Date(anio, mes - 1, dia);

    // Validar que JavaScript no haya "auto-arreglado" una fecha falsa (ej. 31/04/2025)
    if (
        fechaConvertida.getFullYear() !== anio ||
        (fechaConvertida.getMonth() + 1) !== mes ||
        fechaConvertida.getDate() !== dia
    ) {
        return res.status(400).json({ error: "La fecha ingresada no es una fecha válida en el calendario." });
    };

    // 4. Calcular los límites de tiempo basados en la fecha actual (Hoy es 2026)
    const fechaActual = new Date();

    // Límite Máximo de Edad: 120 años atrás
    const limitePasado = new Date();
    limitePasado.setFullYear(fechaActual.getFullYear() - 120);

    // Límite de Edad Mínima: Restamos 16 años a la fecha actual para saber el tope de nacimiento
    const limiteEdadMinima = new Date();
    limiteEdadMinima.setFullYear(fechaActual.getFullYear() - 16);

    // 5. Evaluar las reglas de negocio
    if (fechaConvertida > fechaActual) {
        return res.status(400).json({ error: "La fecha de nacimiento no puede ser una fecha futura." });
    };

    if (fechaConvertida < limitePasado) {
        return res.status(400).json({ error: "La fecha de nacimiento no es válida (límite máximo 120 años)." });
    };

    // Validación de los 16 años
    if (fechaConvertida > limiteEdadMinima) {
        return res.status(400).json({ error: "Debes tener al menos 16 años para registrarte." });
    };


    req.body.estado = 'PENDIENTE';
    
    
    if (!email || !validator.isEmail(email)) {
        return res.status(400).json({ error: "Por favor, introduce un correo electrónico válido." });
    }

    if (telefono === undefined || telefono === null) {
        return res.status(400).json({ error: "El 'teléfono' es obligatorio." });
    } else {
        const telefonoNum = Number(telefono);
        if (isNaN(telefonoNum) || telefonoNum < 0 || 
            telefonoNum.trim().length < 10 ||telefonoNum.trim().length > 12) return res.status(400).json({ error: "el 'número teléfonico' deben ser un número valido mayor a cero." });
        req.body.telefono = telefonoNum;
    };

    if (numeroDocumento === undefined || numeroDocumento === null) {
        return res.status(400).json({ error: "El 'numero de documento es obligatorio' es obligatorio." });
    } else {
        const numDocuNum = Number(numeroDocumento);
        if (isNaN(numDocuNum) || numDocuNum < 0 || 
            numDocuNum.trim().length < 3 || numDocuNum.trim().length > 12) return res.status(400).json({ error: "El 'numero de documento' deben ser un número valido mayor a cero." });
        req.body.numeroDocumento = numDocuNum;
    };

    if(!aceptarTratamientoDatos || aceptarTratamientoDatos === "false" ){
        return res.status(400).json({ error: "el campo de aceptar tratamiento de datos es obligatorio y debe ser verdadero"})
    } 



    next();
};

export default validarInfraccion;