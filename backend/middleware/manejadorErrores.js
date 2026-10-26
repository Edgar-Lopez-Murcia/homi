import logger from './logger.js';

const manejadorErrores = (err, req, res, next) => {
    // 1. Siempre registrar el error en la consola para el desarrollador
    logger.error(`Error detectado: ${err.message}`, err);
    
    // Error de validación de Mongoose (campos obligatorios, mínimos, máximos)
    if (err.name === 'ValidationError') {
        const errores = Object.values(err.errors).map(e => e.message);
        return res.status(400).json({ error: 'Error de validación', detalles: errores });
    }
    
    // Error de duplicado en MongoDB (ej. código de casa o email ya registrado)
    if (err.code === 11000) {
        const campo = Object.keys(err.keyPattern)[0];
        return res.status(400).json({ error: `El campo [${campo}] ya está registrado en el sistema.` });
    }
    
    // Error de ID inválido (CastError)
    if (err.name === 'CastError') {
        return res.status(400).json({ error: 'El ID proporcionado no tiene un formato válido.' });
    }

    //  Error cuando el Token JWT expiró
    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.' });
    }

    //  Error cuando el Token JWT es falso o inválido
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({ error: 'Token de seguridad inválido o corrupto.' });
    }
    
    // Error genérico para imprevistos (Backblaze, Sharp, errores de código tuyos)
    const status = err.status || 500;
    
    res.status(status).json({ 
        error: process.env.NODE_ENV === 'production' 
            ? 'Ocurrió un error interno en el servidor' 
            : err.message 
    });
};

export default manejadorErrores;
