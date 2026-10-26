import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Usuario from '../models/Users.js';

// registro de usuarios
export const  postRegistro =  async (req, res, next) => {
    try {
        const { nombre, email, password,  
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
        next(err)
    }
};

// Login para entrar a la cuenta
export const postLogin = async (req, res, next) => {
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
        next(err)
    }
};


// Ver perfil
export const getPerfil = async (req, res, next) => {
    try {
        const usuario = await Usuario.findById(req.usuario.id).select('-password');
        if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });
        res.json(usuario);
    } catch (err) { next(err) }
};

// Editar perfil
export const putPerfil = async (req, res, next) => {
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
        next(err)
    }
};

// Cambiar de contraseña
export const putCambiarPassword = async (req, res, next) => {
    try {
        const usuario = await Usuario.findById(req.usuario.id).select('password');

        if (!usuario) {
            return res.status(404).json({ error: 'La cuenta no existe' });
        }

        const {passwordActual, passwordNueva} = req.body;



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
        next(err)
    }
};

// Eliminacion de cuenta
export const deleteEliminarCuenta = async (req, res, next) => {
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
        next(err)
    }
}