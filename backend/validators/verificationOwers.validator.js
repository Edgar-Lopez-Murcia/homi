// validators/verificationOwers.validator.js
import { z } from 'zod';
import { fechaNacimientoSchema, emailNormal } from './globals.validator.js';

export const verificacionDuenioSchema = z.object({
    nombreUsuario: z.string().trim()
        .min(3, { message: "El nombre es obligatorio y debe tener al menos 3 caracteres" })
        .max(30, { message: "El nombre no puede superar los 30 caracteres" }),
    
    tipoDocumento: z.enum([
        'Cédula de Ciudadania', 
        'Cédula de Extranjería', 
        'Permiso por protección Temporal'
    ], {
        errorMap: () => ({ message: "El tipo de documento seleccionado no es válido" })
    }).default('Cédula de Ciudadania'),
    
    numeroDocumento: z.string().trim()
        .regex(/^[0-9]{3,12}$/, { 
            message: "El número de documento debe contener solo dígitos y tener entre 3 y 12 caracteres" 
        }),
    
    fechaNacimiento: fechaNacimientoSchema,
    
    telefono: z.string().trim()
        .regex(/^[0-9]{9,15}$/, { 
            message: "El número telefónico debe contener solo dígitos y tener entre 9 y 15 caracteres" 
        }),
    
    email: emailNormal,
    
    documento: z.array(z.string().url({ message: "Cada enlace del documento debe ser una URL válida" }))
        .length(2, { message: "Debes subir exactamente 2 imágenes de tu documento (Frente y Reverso)" }),
    
    selfiDocumento: z.string().url({ message: "La URL de la selfi no es válida" }).optional().or(z.literal('')),

    rut: z.string().url({ message: "El archivo del RUT debe ser una URL válida (PDF o Imagen)" }),
    

    aceptaTratamientoDatos: z.preprocess((val) => {
        if (val === "true") return true;
        if (val === "false") return false;
        return val;
    }, z.literal(true, {
        errorMap: () => ({ message: "El campo de aceptar tratamiento de datos es obligatorio" })
    }))
});

export const editarDuenioSchema = verificacionDuenioSchema.partial();

// Esquema de edición para el administrador (para cuando cambie estados o agregue motivos)
export const verificacionDuenioEditarSchema = verificacionDuenioSchema
    .extend({
        estado: z.enum(['PENDIENTE', 'APROBADO', 'RECHAZADO']),
        motivoRechazo: z.string().optional().or(z.literal(''))
    })
    .partial();
