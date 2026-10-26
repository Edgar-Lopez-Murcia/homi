// Librería oficial para crear y verificar tokens JWT
import jwt from 'jsonwebtoken';
import logger from '../utils/logger.js';

// Middleware que verifica el token JWT en el header Authorization
function verificarToken(req, res, next) {
    const authHeader = req.headers['authorization'];

    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        logger.warn(`Intento de acceso denegado: Petición sin token en la ruta ${req.originalUrl}`)
        return res.status(401).json({
            error: 'Acceso denegado - token requerido'
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (!decoded.id || !decoded.rol) {
            return res.status(403).json({ error: 'Token inválido - estructura incorrecta' });
        };

        if (decoded.estado === 'BANNED') {
            logger.warn(`Usuario BANEADO intentó ingresar. ID: ${decoded.id} - Email: ${decoded.email}`);
            return res.status(403).json({ error: 'Esta cuenta ha sido expulsada permanentemente del sistema.' });
        };


        req.usuario = decoded;

        next();

    } catch (err) {
        next(err)
    }
}
export default verificarToken;