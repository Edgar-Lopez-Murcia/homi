const express   = require('express');
const bcrypt    = require('bcryptjs');
const jwt       = require('jsonwebtoken');
const Usuario   = require('../models/Usuario');

const router = express.Router();
const verificarToken = require('../middleware/auth');

// 2. POST /api/auth/registro - Crear cuenta nueva
router.post('/registro', async (req, res) => {
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
            imagenPerfil,
            email,
            password: hash,
            rol,
            departamento,
            municipio,
            verificado,
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
router.post('/login', async (req, res) => {
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



// 4. Exportar el router
module.exports = router;