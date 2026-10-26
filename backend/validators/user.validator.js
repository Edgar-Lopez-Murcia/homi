// validators/user.validator.js
import { z } from 'zod';


const passwordRobusto = z.string()
    .min(8, { message: "La contraseña debe tener al menos 8 caracteres" })
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, { 
        message: "La contraseña debe incluir al menos una mayúscula, una minúscula y un número" 
    });

const emailBase = z.string().email({ message: "Formato de correo inválido" });

// Esquema para el Registro Completo
export const registroSchema = z.object({
    nombre: z.string().min(3, { message: "El nombre debe tener al menos 3 caracteres" }),
    email: emailBase,
    password: passwordRobusto,
    departamento: z.string().min(1, { message: "El departamento es obligatorio" }),
    municipio: z.string().min(1, { message: "El municipio es obligatorio" })
});

// Esquema para el Login (Permisivo)
export const loginSchema = z.object({
    email: emailBase,
    password: z.string().min(8, { message: "La contraseña es obligatoria" })
});

// Esquema para la Edición de Perfil
export const usuarioEditarSchema = registroSchema
    .omit({ password: true, email: true }) // Quitamos los campos prohibidos
    .extend({
        imagenPerfil: z.string().url({ message: "La foto de perfil debe ser una URL válida" }).optional()
    })
    .partial(); 


// Esquema exclusivo para el Cambio de Contraseña
// Zod tiene una herramienta llamada .refine() que sirve para comparar dos campos entre sí
export const cambioPasswordSchema = z.object({
    passwordActual: z.string().min(1, { message: "Debes introducir tu contraseña actual" }),
    passwordNueva: passwordRobusto // Reutiliza la regla de mayúsculas, minúsculas y números
}).refine((datos) => datos.passwordActual !== datos.passwordNueva, {
    message: "No se permite el mismo valor en ambos campos",
    path: ["passwordNueva"] // El error se marcará específicamente en el campo nuevo
});
