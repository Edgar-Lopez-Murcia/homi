// middleware/limitadorPeticiones.js
const rateLimit = require('express-rate-limit');

const limitadorGlobal = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // Límite de 100 peticiones por IP cada 15 min
    keyGenerator: (req) => {
        // Si el usuario está autenticado, usa su ID; si no, usa la IP
        return req.usuario ? req.usuario.id : req.ip;
    },
    message: { error: "Demasiadas peticiones desde esta IP. Intenta más tarde." },
    standardHeaders: true,
    legacyHeaders: false,
});

const limitadorLogin = rateLimit({
    windowMs: 15 * 60 * 1000, // Ventana de tiempo: 15 minutos
    max: 5, // Máximo 5 intentos por IP
    keyGenerator: (req) => {
        // Si el usuario está autenticado, usa su ID; si no, usa la IP
        return req.usuario ? req.usuario.id : req.ip;
    },
    message: { 
        error: "Demasiados intentos de inicio de sesión. Por favor, inténtalo de nuevo en 15 minutos." 
    },
    standardHeaders: true, // Devuelve información del límite en los headers 'RateLimit-*'
    legacyHeaders: false, // Desactiva los headers antiguos 'X-RateLimit-*'
});

const limitadorLikes = rateLimit({
    windowMs: 1 * 60 * 1000, // Ventana de tiempo: 1 minuto
    max: 15, // Máximo 15 clics (Likes/Unlikes) por IP en ese minuto
    keyGenerator: (req) => {
        // Si el usuario está autenticado, usa su ID; si no, usa la IP
        return req.usuario ? req.usuario.id : req.ip;
    },
    message: {
        error: "Estás interactuando demasiado rápido con los botones de 'Me gusta'. Por favor, espera un minuto."
    },
    standardHeaders: true,
    legacyHeaders: false,
});

const limitadorComentarios = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 5,
    keyGenerator: (req) => {
        // Si el usuario está autenticado, usa su ID; si no, usa la IP
        return req.usuario ? req.usuario.id : req.ip;
    },
    message: {
        error: "Estás inetractuando demasiado rápido con los 'Comentarios. Por favor, espera un minuto."
    },
    standardHeaders: true,
    legacyHeaders: false,
});

const limitadorCambioPassword = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 3, // Máximo 3 intentos por hora
    keyGenerator: (req) => {
        // Si el usuario está autenticado, usa su ID; si no, usa la IP
        return req.usuario ? req.usuario.id : req.ip;
    },
    message: { error: "Demasiados intentos de cambio de contraseña. Intenta de nuevo en 1 hora." },
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = { limitadorGlobal, limitadorLogin, limitadorLikes, limitadorComentarios, limitadorCambioPassword };
