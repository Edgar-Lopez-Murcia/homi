// middleware/limitadorPeticiones.js
const rateLimit = require('express-rate-limit');

const limitadorLogin = rateLimit({
    windowMs: 15 * 60 * 1000, // Ventana de tiempo: 15 minutos
    max: 5, // Máximo 5 intentos por IP
    message: { 
        error: "Demasiados intentos de inicio de sesión. Por favor, inténtalo de nuevo en 15 minutos." 
    },
    standardHeaders: true, // Devuelve información del límite en los headers 'RateLimit-*'
    legacyHeaders: false, // Desactiva los headers antiguos 'X-RateLimit-*'
});

module.exports = { limitadorLogin };
