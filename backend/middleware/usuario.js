// middleware/verificarUsuario.js
import Usuario from '../models/Users.js'

async function verificarUsuario(req, res, next) {
    if (!req.usuario) {
        return res.status(401).json({ error: 'Sin autenticación. Inicie sesión.' });
    }

    try {
        // 1. Buscamos el estado fresco directamente en la Base de Datos Atlas
        const usuarioDB = await Usuario.findById(req.usuario.id);
        
        
        if (!usuarioDB) {
            return res.status(404).json({ error: 'El usuario ya no existe en el sistema.' });
        }

        
        const estadosBaneados = [ 'SUSPENDED', 'RESTRICTED'];
        if (estadosBaneados.includes(usuarioDB.estado)) {
            return res.status(403).json({ error: 'Tu cuenta ha sido penalizada o suspendida. Acceso denegado.' });
        };

        
        next();

    }  catch (err) {
        next(err)
    }
}

export default verificarUsuario;