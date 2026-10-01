const Usuario = require('../models/Users');

// Middleware: verifica que el usuario autenticado tenga rol admin
async function verificarPublicante(req, res, next) {
    if (!req.usuario) {
        return res.status(401).json({ error: 'Sin autenticación'});
    }

    const usuarioDB = await Usuario.findById(req.usuario.id)
    
    if (usuarioDB.verificado !== true  && usuarioDB.rol !== 'admin') {
        return res.status(403).json({ error: 'Acceso denegado - se requiere rol admin o ser usuario verificado' })
    }
    if (usuarioDB.estado !== 'BANNER' || usuarioDB.estado !== 'SUSPENDED' || usuarioDB.estado !== 'RESTRICTED') {
        return res.status(403).json({ error: 'Tu cuenta ha sido suspendida. Acceso denegado' })
    }
    next();
}

module.exports = verificarPublicante;