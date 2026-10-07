// middleware/validarUsuario.js

const validarUsuario = (req, res, next) => {
    const { nombre, email, password, departamento, municipio } = req.body;

    // 1. Validaciones para la ruta de Registro
    if (req.path === '/registro') {
        if (!nombre || nombre.trim() === "") return res.status(400).json({ error: "El nombre es obligatorio." });
        if (!departamento || departamento.trim() === "") return res.status(400).json({ error: "El departamento es obligatorio." });
        if (!municipio || municipio.trim() === "") return res.status(400).json({ error: "El municipio es obligatorio." });
        
        // CIBERSEGURIDAD CRÍTICA: Forzar valores por defecto en el backend. 
        // Nadie puede registrarse siendo admin o verificado directamente desde el req.body.
        req.body.rol = 'usuario'; // O el rol básico que desees por defecto
        req.body.verificado = false;
        req.body.estado = 'ACTIVE';
    }

    // 2. Validaciones comunes para Registro y Login (Email y Contraseña)
    if (!email || !email.includes('@')) {
        return res.status(400).json({ error: "Por favor, introduce un correo electrónico válido." });
    }

    if (!password || password.length < 6) {
        return res.status(400).json({ error: "La contraseña es obligatoria y debe tener al menos 6 caracteres." });
    }

    next();
};

module.exports = validarUsuario;
