// middleware/limitadorPeticiones.js
const rateLimit = require('express-rate-limit');

const limitadorGlobal = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // Límite de 100 peticiones por IP cada 15 min
    message: { error: "Demasiadas peticiones desde esta IP. Intenta más tarde." },
    standardHeaders: true,
    legacyHeaders: false,
});

const limitadorLogin = rateLimit({
    windowMs: 15 * 60 * 1000, // Ventana de tiempo: 15 minutos
    max: 5, // Máximo 5 intentos por IP
    message: { 
        error: "Demasiados intentos de inicio de sesión. Por favor, inténtalo de nuevo en 15 minutos." 
    },
    standardHeaders: true, // Devuelve información del límite en los headers 'RateLimit-*'
    legacyHeaders: false, // Desactiva los headers antiguos 'X-RateLimit-*'
});

const limitadorLikes = rateLimit({
    windowMs: 1 * 60 * 1000, // Ventana de tiempo: 1 minuto
    max: 15, // Máximo 15 clics (Likes/Unlikes) por IP en ese minuto
    message: {
        error: "Estás interactuando demasiado rápido con los botones de 'Me gusta'. Por favor, espera un minuto."
    },
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = { limitadorGlobal, limitadorLogin, limitadorLikes };
