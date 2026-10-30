// validators/user.validator.js
import { z } from 'zod';
import { emailNormal } from './globals.validator.js';


const passwordRobusto = z.string()
    .min(8, { message: "La contraseña debe tener al menos 8 caracteres" })
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, { 
        message: "La contraseña debe incluir al menos una mayúscula, una minúscula y un número" 
    });


// Esquema para el Registro Completo
export const registroSchema = z.object({
    nombre: z.string().trim().min(3).max(50),
    email: emailNormal,
    password: passwordRobusto,
    departamento: z.string().trim()
        .min(1)
        .max(200),
    municipio: z.string().trim()
        .min(1)
        .max(200)
});

// Esquema para el Login (Permisivo)
export const loginSchema = z.object({
    email: emailNormal,
    password: z.string().min(8, { message: "La contraseña es obligatoria" })
});

// Esquema para la Edición de Perfil
export const usuarioEditarSchema = registroSchema
    .omit({ password: true, email: true }) 
    .extend({
        imagenPerfil: z.string().url({ message: "La foto de perfil debe ser una URL válida" }).optional()
    })
    .partial(); 


// Esquema exclusivo para el Cambio de Contraseña
export const cambioPasswordSchema = z.object({
    passwordActual: z.string().min(1, { message: "Debes introducir tu contraseña actual" }),
    passwordNueva: passwordRobusto,
    confirmarPassword: passwordRobusto 
}).refine((datos) => datos.passwordActual !== datos.passwordNueva, {
    message: "No se permite el mismo valor en ambos campos",
    path: ["passwordNueva"] 
}).refine((datos) => datos.passwordNueva === datos.confirmarPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmarPassword"] 
});

// Esquema para actualizar el tipo de usuario, la verificación y el estado del usuario

export const actualizarEstadoSchema = z.object({
    estado: z.enum(['ACTIVE', 'SUSPENDED', 'RESTRICTED', 'BANNED', 'INACTIVE']).optional(),
    tipoUsuario: z.enum(['arrendatario', 'propietario', 'empresa']).optional(),
    verificado: z.preprocess((val) => {
        if (val === "true") return true;
        if (val === "false") return false;
        return val;
    }).optional(),
})