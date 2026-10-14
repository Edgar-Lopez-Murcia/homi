const verificarDuenio = (modelo, campoDuenio = 'propietario', camposExtra = '') => {
    return async (req, res, next) => {
        try {
            // Unimos el campo del dueño con los campos extra separados por un espacio
            const camposASeleccionar = `${campoDuenio} ${camposExtra}`.trim();

            // Buscamos en la base de datos trayendo solo lo que pediste
            const recurso = await modelo.findById(req.params.id).select(camposASeleccionar);
            
            if (!recurso) {
                return res.status(404).json({ error: 'La publicación no existe' });
            }
            
            // Aquí siempre usará el campo individual correcto (ej: 'propietario') para comparar el ID
            const esDuenio = recurso[campoDuenio].equals(req.usuario.id);
            const esAdmin = req.usuario.rol === 'admin';
            
            if (!esDuenio && !esAdmin) {
                return res.status(403).json({ error: 'No tienes permisos sobre este recurso' });
            }
            
            // 📦 ¡Ventaja! Si pediste 'zonas' y 'areas', ya viajan guardadas dentro de req.recurso
            req.recurso = recurso; 
            next();
        } catch (err) {
            next(err);
        }
    };
};

export default verificarDuenio;
