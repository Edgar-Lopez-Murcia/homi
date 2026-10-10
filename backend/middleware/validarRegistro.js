const validator = require('validator');

const validarRegistro = (req, res, next) => {
    const { nombre, email, password, departamento, municipio } = req.body;

    if (!nombre || nombre.trim().length < 3) {
        return res.status(400).json({ error: "El nombre es obligatorio y debe tener al menos 3 caracteres." });
    }
    if (!departamento || departamento.trim() === "") {
        return res.status(400).json({ error: "El departamento es obligatorio." });
    }
    if (!municipio || municipio.trim() === "") {
        return res.status(400).json({ error: "El municipio es obligatorio." });
    }

    // Forzar valores por defecto
    req.body.rol = 'usuario';
    req.body.verificado = false;
    req.body.estado = 'ACTIVE';

    // Validar email
    if (!email || !validator.isEmail(email)) {
        return res.status(400).json({ error: "Por favor, introduce un correo electrónico válido." });
    }

    // Validar contraseña robusta
    if (!password || password.length < 8) {
        return res.status(400).json({ error: "La contraseña debe tener al menos 8 caracteres." });
    }
    const regexPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!regexPassword.test(password)) {
        return res.status(400).json({ 
            error: "La contraseña debe incluir al menos una mayúscula, una minúscula y un número." 
        });
    }

    next();
};

module.exports = validarRegistro;