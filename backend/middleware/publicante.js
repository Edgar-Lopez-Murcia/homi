// middleware/verificarPublicante.js
const Usuario = require('../models/Users');

async function verificarPublicante(req, res, next) {
    if (!req.usuario) {
        return res.status(401).json({ error: 'Sin autenticación. Inicie sesión.' });
    }

    try {
        // 1. Buscamos el estado fresco directamente en la Base de Datos Atlas
        const usuarioDB = await Usuario.findById(req.usuario.id);
        
        // BLINDAJE CRÍTICO: Prevenir caídas si el usuario ya no existe en el sistema
        if (!usuarioDB) {
            return res.status(404).json({ error: 'El usuario ya no existe en el sistema.' });
        }

        // 2. LÓGICA DE BANEO CORREGIDA:
        // Si el estado del usuario coincide con alguna de estas tres penalizaciones, lo rebotamos
        const estadosBaneados = ['BANNED', 'SUSPENDED', 'RESTRICTED'];
        if (estadosBaneados.includes(usuarioDB.estado)) {
            return res.status(403).json({ error: 'Tu cuenta ha sido penalizada o suspendida. Acceso denegado.' });
        }

        // 3. VERIFICACIÓN DE PERMISOS:
        // Debe ser un administrador O un usuario que ya esté verificado para poder publicar/editar inmuebles
        if (usuarioDB.verificado !== true && usuarioDB.rol !== 'admin') {
            return res.status(403).json({ error: 'Acceso denegado - Requiere verificación de cuenta o rol de administrador.' });
        }

        // Si pasó todos los filtros de sanidad, avanzamos
        next();

    }  catch (err) {
        console.error('Error en verificarPublicante:', err);
        return res.status(500).json({ error: 'Error interno al validar los permisos del usuario.' });
    }
}

module.exports = verificarPublicante;
