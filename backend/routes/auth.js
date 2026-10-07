const express   = require('express');
const bcrypt    = require('bcryptjs');
const jwt       = require('jsonwebtoken');
const Usuario   = require('../models/Users');

const router = express.Router();
const verificarToken = require('../middleware/auth');
const verificarAdmin = require('../middleware/admin');
const sanitizarEntradas = require('../middleware/sanitizarEntradas');
const validarUsuario = require('../middleware/validarUsuario');
const { limitadorLogin } = require('../middleware/limitadorPeticiones');

// 2. POST /api/auth/registro - Crear cuenta nueva
router.post('/registro',  sanitizarEntradas, validarUsuario, async (req, res) => {
    try {
        const { nombre, email, password, rol, 
            departamento, municipio, verificado } = req.body;

        // Verificar que el email no exista ya
        const existe = await Usuario.findOne({ email });

        if (existe) {
            return res.status(400).json({
                error: 'El email ya está registrado'
            });
        }

        // Encriptar la contraseña en 10 rondas de bcrypt
        const hash = await bcrypt.hash(password, 10);

        // Guardar el usuario con la contraseña encriptada
        const usuario = await Usuario.create({
            nombre,
            email,
            password: hash,
            rol,
            departamento,
            municipio,
            verificado
        });

        // Crear el token JWT - dura 24 horas
        const token = jwt.sign(
            {
                id: usuario._id,
                email: usuario.email,
                verificado: usuario.verificado,
                rol: usuario.rol,
                estado: usuario.estado
            },
            process.env.JWT_SECRET,
            {
                expiresIn: '24h'
            }
        );

        res.status(201).json({
            mensaje: 'Usuario creado e inicio de sesión con exito',
            id: usuario._id,
            token,
            nombre: usuario.nombre,
            rol: usuario.rol,
            verificado: usuario.verificado

        });

    } catch (err) {
        res.status(400).json({
            error: err.message
        });
    }
});

// 3. POST /api/auth/login - Iniciar sesión y recibir token
router.post('/login', limitadorLogin, validarUsuario, async (req, res) => {
    try {
        const { email, password } = req.body;

        // Buscar usuario por email
        const usuario = await Usuario.findOne({ email });

        if (!usuario) {
            return res.status(401).json({
                error: 'Email o contraseña incorrectos'
            });
        }

        // Comprobar la contraseña con el hash guardado en Atlas
        const valida = await bcrypt.compare(password, usuario.password);

        if (!valida) {
            return res.status(401).json({
                error: 'Email o contraseña incorrectos'
            });
        }

        // Crear el token JWT - dura 24 horas
        const token = jwt.sign(
            {
                id: usuario._id,
                email: usuario.email,
                verificado: usuario.verificado,
                rol: usuario.rol, 
                estado: usuario.estado
            },
            process.env.JWT_SECRET,
            {
                expiresIn: '24h'
            }
        );

        // Responder con el token y nombre del usuario
        res.json({
            token,
            nombre: usuario.nombre,
            rol: usuario.rol,
            verificado: usuario.verificado
        });

    } catch (err) {
        res.status(500).json({
            error: err.message
        });
    }
});

// 4. Perfil

router.get('/perfil', verificarToken, async (req, res) => {
    try {
        // req.usuario.id viene del JWT decodificado por verificarToken
        // .select('-password') excluye el hash - NUNCA enviar la contraseña al frontend
        const usuario = await Usuario.findById(req.usuario.id).select('-password');
        if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
        res.json(usuario);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/perfil', verificarToken, sanitizarEntradas, async (req, res) => {
    try {

        const {nombre, imagenPerfil, departamento, municipio  } = req.body;
        const campoActualizar= {};

        if (nombre !== undefined) campoActualizar.nombre = nombre;
        if (imagenPerfil !== undefined) campoActualizar.imagenPerfil = imagenPerfil;
        if (departamento !== undefined) campoActualizar.departamento = departamento;
        if (municipio !== undefined) campoActualizar.municipio = municipio;

        const modificacion = await Usuario.findByIdAndUpdate (
            req.usuario.id,
            campoActualizar,
            {new: true, runValidators: true}
        ).select('-password');
        if (!modificacion) {
            return res.status(404).json({ error: 'El perfil no existe'});
        }
        res.json({
            mensaje: 'perfil actualizado con éxito',
            perfil: modificacion, 
        });
    } catch (err) {
        res.status(500).json({error: err.message})
    }
});

router.put('/cambiar-password', verificarToken, async (req,res) => {
    try {
        const usuario = await Usuario.findById(req.usuario.id).select('password');

        if (!usuario) {
            return res.status(404).json({ error: 'La cuenta no existe' });
        }

        const {passwordActual, passwordNueva} = req.body;

        if (typeof passwordActual !== 'string' || typeof passwordNueva !== 'string') {
            return res.status(400).json({ error: "Los datos enviados deben ser texto puro." });
        }

        // Validación de longitud mínima antes de procesar
        if (passwordNueva.length < 6) {
            return res.status(400).json({ error: "La nueva contraseña debe tener al menos 6 caracteres." });
        }

        const validacion = await  bcrypt.compare(passwordActual, usuario.password);
        if (!validacion) {
            return res.status(401).json({
                error: 'contraseña incorrecta'
            });
        }
        const comparacion = await bcrypt.compare(passwordNueva, usuario.password);
        if (comparacion) {
            return res.status(400).json({
                error: 'La nueva contraseña no debe ser la misma que la actual '
            })
        }
        const hash = await bcrypt.hash(passwordNueva, 10);
        
        const modificarContraseña = await Usuario.findByIdAndUpdate (
            req.usuario.id,
            {password:hash},
            {new: true, runValidators: true}
        ).select('-password');

        if (!modificarContraseña) { 
            return res.status(404).json({ error: 'No se pudo actualizar la contraseña'})
        }

        res.json({
            mensaje: 'Contraseña actualizada con éxito',
        });
        
    } catch (err) {
        res.status(500).json({error: err.message})
    }
});

router.put('/actualizar-verificacion/:id',verificarToken, verificarAdmin, async (req, res) => {
    try{

        const {rol, verificado, estado} = req.body;
        const camposActualizar = {};

        if (rol !== undefined) camposActualizar.rol = rol;
        if (verificado !== undefined) camposActualizar.verificado = verificado;
        if (estado !== undefined) camposActualizar.estado = estado;

        const modificado = await Usuario.findByIdAndUpdate(
            req.params.id,
            camposActualizar,
            {new: true, runValidators: true}
        ).select('-password');

        if (!modificado) {
            return res.status(404).json({ error: 'La cuenta no existe'});
        }
        res.json({
            mensaje: 'Perfil actualizado con exito',
            perfil: modificado
        });
    } catch (err) {
        res.status(500).json({ error: err.message})
    }
}); 

router.delete('/perfil/:id', verificarToken, async (req, res) => {
    try{

        const esDuenio = (req.usuario.id === req.params.id);
        const esAdmin = (req.usuario.rol === 'admin');

        if (!esDuenio && !esAdmin) {
            return res.status(403).json({ error: 'No tienes permisos para eliminar esta cuenta' });
        }

        const eliminado = await Usuario.findByIdAndDelete(req.params.id).select('-password');

        if (!eliminado) return res.status(404).json({ error: 'Cuenta no encontrada'});
        res.json({ 
            mensaje: 'Cuenta eliminada con exito',
            usuarioEliminado: eliminado.nombre
        });
    } catch (err) {
        res.status(400).json({ error: err.message});
    }
});


// 4. Exportar el router
module.exports = router;