// Middleware: verifica que el usuario autenticado tenga rol admin
function verificarAdmin(req, res, next) {
    if (!req.usuario) {
        return res.status(401).json({ error: 'Sin autenticación. Inicie sesión.' });
    }
    // Normalizamos el rol a string y minúsculas para evitar errores de tipado o mayúsculas
    const rolUsuario = String(req.usuario.rol || '').toLowerCase();


    if (req.usuario?.rol !== 'admin') {
        return res.status(403).json({ error: 'Acceso denegado - se requiere rol admin' })
    }
    next();
}

module.exports = verificarAdmin;