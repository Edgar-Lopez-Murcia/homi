const validator = require('validator');

const validarLogin = (req, res, next) => {
    const { email, password } = req.body;

    if (!email || !validator.isEmail(email)) {
        return res.status(400).json({ error: "Por favor, introduce un correo electrónico válido." });
    }
    if (!password || password.length < 8) {
        return res.status(400).json({ error: "La contraseña es obligatoria." });
    }

    next();
};

module.exports = validarLogin;