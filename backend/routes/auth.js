const express   = require('express');
const bcrypt    = require('bcryptjs');
const jwt       = require('jsonwebtoken');
const Usuario   = require('../models/Users');
const validator = require('validator');

const router = express.Router();
const verificarToken = require('../middleware/auth');
const verificarAdmin = require('../middleware/admin');
const validarRegistro = require('../middleware/validarRegistro');
const validarLogin = require('../middleware/validarLogin');
const { limitadorLogin } = require('../middleware/limitadorPeticiones');
const {limitadorCambioPassword} = require('../middleware/limitadorPeticiones')

// 2. POST /api/auth/registro - Crear cuenta nueva
router.post('/registro',   validarRegistro, async (req, res) => {
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
router.post('/login', limitadorLogin, validarLogin,  async (req, res) => {
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
        usuario.ultimoLogin = new Date();
        await usuario.save();

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

// GET todos los usuarios — Público con filtros y PAGINACIÓN (Solo Admin)
router.get('/analisis', verificarToken, verificarAdmin, async (req, res) => {
    try {
        const todos = await Usuario.countDocuments();
        const { departamento, municipio, nombre, email, rol, estado, verificado, page = 1, limit = 20 } = req.query;
        
        const filtros = {}; 
        if (departamento) filtros.departamento = departamento;
        if (municipio) filtros.municipio = { $regex: municipio, $options: 'i' }; 
        if (rol) filtros.rol = rol;
        if (nombre) filtros.nombre = { $regex: nombre, $options: 'i' }; // Opcional: Búsqueda inteligente por nombre
        if (email) filtros.email = email;
        if (estado) filtros.estado = estado; 

        // REPARADO: Conversión estricta de string a booleano real para MongoDB
        if (verificado !== undefined && verificado !== '') {
            filtros.verificado = verificado === 'true'; 
        }

        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
        const skip = (pageNum - 1) * limitNum;

        // REPARADO: Agregamos .select('-password') para no filtrar los hashes por la red
        const [usuarios, totalFiltrado] = await Promise.all([
            Usuario.find(filtros)
                .select('-password') 
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum),
            Usuario.countDocuments(filtros)
        ]);
        
        res.json({
            totalGlobal: todos,
            totalFiltrado: totalFiltrado,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(totalFiltrado / limitNum),
            usuarios // Corregido: el nombre semántico correcto es usuarios, no inmuebles
        });
    } catch (err) {
        res.status(500).json({ error: 'Error al obtener los usuarios filtrados', detalle: err.message });
    }
});

// GET - número de estadisticas 
router.get('/analisis/estadisticas', verificarToken, verificarAdmin, async (req, res) => {
    try {
        // 1. Recibimos las fechas desde la URL (ej: /estadisticas?fechaInicio=2026-01-01&fechaFin=2026-12-31)
        const { fechaInicio, fechaFin } = req.query;
        
        // Creamos un objeto de filtro para la agregación
        const filtroGlobal = {};

        // Si el administrador envía fechas, armamos el rango usando el campo de Mongo "createdAt"
        if (fechaInicio || fechaFin) {
            filtroGlobal.createdAt = {};
            if (fechaInicio) filtroGlobal.createdAt.$gte = new Date(fechaInicio); // $gte: Mayor o igual que
            if (fechaFin) filtroGlobal.createdAt.$lte = new Date(fechaFin);       // $lte: Menor o igual que
        }

        // 2. Ejecutamos la agregación con el filtro de fechas al inicio
        const estadisticas = await Usuario.aggregate([
            // ETAPA 1: Filtrado de fechas inicial (Afecta a todo el proceso)
            { $match: filtroGlobal },

            // ETAPA 2: El Súper Agrupador protegido
            {
                $facet: {
                    porEstado: [
                        { $match: { estado: { $exists: true, $ne: null, $nin: ["", " "] } } },
                        { $group: { _id: "$estado", cantidad: { $sum: 1 } } }
                    ],
                    porRol: [
                        { $match: { rol: { $exists: true, $ne: null, $nin: ["", " "] } } },
                        { $group: { _id: "$rol", cantidad: { $sum: 1 } } }
                    ]
                }
            }
        ]);

        if (!estadisticas || estadisticas.length === 0) {
            return res.json({ totalGlobal: 0, porEstado: [], porRol: [] });
        }

        // Tu línea se mantiene exactamente igual 
        const { porEstado, porRol } = estadisticas[0];

        // 3. Calculamos el total dinámico basado en lo que devolvieron los filtros
        // Sumamos las cantidades de cualquiera de los grupos para saber el total de este período
        const totalPeriodo = porEstado.reduce((acumulador, item) => acumulador + item.cantidad, 0);

        res.json({
            totalGlobal: totalPeriodo, // Ahora representa el total del período seleccionado
            porEstado,  
            porRol 
        });

    } catch (err) {
        res.status(500).json({ error: 'Error al generar las estadísticas', detalle: err.message });
    }
});
router.put('/perfil', verificarToken,  async (req, res) => {
    try {

        const {nombre, imagenPerfil, departamento, municipio  } = req.body;
        const campoActualizar= {};

        if (nombre !== undefined) campoActualizar.nombre = nombre;
        if (imagenPerfil !== undefined) {
            if (!validator.isURL(imagenPerfil, { require_protocol: true })) {
                return res.status(400).json({ error: 'La URL de la imagen de perfil no es válida.' });
            }
            campoActualizar.imagenPerfil = imagenPerfil;
        }
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

router.put('/cambiar-password', verificarToken, limitadorCambioPassword, async (req,res) => {
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
        if (passwordNueva.length < 8) {
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

        const {tipoUsuario, verificado, estado} = req.body;
        
        // Validar tipoUsuario
        if (tipoUsuario !== undefined && !['propietario', 'empresa', 'arrendatario'].includes(tipoUsuario)) {
            return res.status(400).json({ error: 'tipoUsuario no es válido.' });
        }
        // Validar verificado
        if (verificado !== undefined && typeof verificado !== 'boolean') {
            return res.status(400).json({ error: 'verificado debe ser booleano.' });
        }
        // Validar estado
        const estadosPermitidos = ['ACTIVE', 'SUSPENDED', 'RESTRICTED', 'BANNED', 'INACTIVE'];
        if (estado !== undefined && !estadosPermitidos.includes(estado)) {
            return res.status(400).json({ error: 'estado no es válido.' });
        }
        const camposActualizar = {};

        if (tipoUsuario !== undefined) camposActualizar.tipoUsuario = tipoUsuario;
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
            mensaje: 'Perfil actualizado con exito por el administrador',
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