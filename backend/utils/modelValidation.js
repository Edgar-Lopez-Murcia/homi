import logger from '../utils/logger.js';

export const validarSchema = (schema) => {
    return (req, res, next) => {
        
        const resultado = schema.safeParse(req.body);
        
        if (!resultado.success) {
            const listaDeErrores = resultado.error.issues.map(issue => ({
                campo: issue.path.join('.'),
                mensaje: issue.message
            }));
            
            const stringErrores = resultado.error.issues.map(i => i.message).join(', ');
            logger.warn(`Validación fallida en [${req.method}] ${req.originalUrl} - Errores: ${stringErrores}`);
            
            return res.status(400).json({ 
                error: "Error de validación", 
                detalles: listaDeErrores 
            });
        }
        
        req.body = resultado.data;

        next();
    };
};



