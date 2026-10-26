// utils/modelValidation.js
import logger from './logger.js'; 

const validarConZod = (schema) => {
    return (req, res, next) => {
        const resultado = schema.safeParse(req.body);
        
        if (!resultado.success) {
            const listaDeErrores = resultado.error.issues.map(issue => issue.message);
            
            // Guardamos el fallo en tu archivo logs/warn.log automáticamente
            logger.warn(`Validación fallida en la ruta [${req.method}] ${req.originalUrl} - Errores: ${listaDeErrores.join(', ')}`);
            
            return res.status(400).json({ 
                error: "Error de validación", 
                detalles: listaDeErrores 
            });
        }
        
        req.body = resultado.data; 
        next();
    };
};

export default validarConZod;

