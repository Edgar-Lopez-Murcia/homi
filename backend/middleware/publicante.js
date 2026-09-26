// Middleware: verifica que el usuario autenticado tenga rol admin
function verificarPublicante(req, res, next) {
    if (!req.usuario) {
        return res.status(401).json({ error: 'Sin autenticación'});
    }
    if (req.usuario.verificado !== true  && req.usuario.rol !== 'admin') {
        return res.status(403).json({ error: 'Acceso denegado - se requiere rol admin o ser usuario verificado' })
    }
    if (req.usuario.estado !== 'BANNER' || req.usuario.estado !== 'SUSPENDED' || req.usuario.estado !== 'RESTRICTED') {
        return res.status(403).json({ error: 'Tu cuenta ha sido suspendida. Acceso denegado' })
    }
    next();
}

module.exports = verificarPublicante;