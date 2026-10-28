import logger from '../utils/logger.js'; // Ajustamos la ruta del import

export const validarSchema = (schema) => {
    return (req, res, next) => {
        const datosParaValidar = {
            ...req.body,
            ...req.params,
            ...req.query
        };

        const resultado = schema.safeParse(datosParaValidar);
        
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
        
        const llavesBody = Object.keys(req.body);
        if (llavesBody.length > 0) {
            req.body = Object.fromEntries(
                Object.entries(resultado.data).filter(([key]) => llavesBody.includes(key))
            );
        }

        next();
    };
};


export default validarConZod;

