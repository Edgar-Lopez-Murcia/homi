import { z } from 'zod';
import { emailNormal } from './globals.validator.js';

export const verificarCompaniaSchema = z.object({ 
    razonSocial: z.string().trim().min(3).max(80),
    
    nit: z.string().trim().min(3).max(30), 

    tipoDocumento: z.enum([
        'Cédula de Ciudadania', 
        'Cédula de Extranjería', 
        'Permiso por protección Temporal'
    ], {
        errorMap: () => ({ message: "El tipo de documento seleccionado no es válido" })
    }).default('Cédula de Ciudadania'),

    numeroDocumento: z.string().trim().regex(/^[0-9]{3,12}$/, { 
        message: "El número de documento debe contener solo dígitos y tener entre 3 y 12 caracteres" 
    }),

    
    nombreRepresentante: z.string().trim().min(3).max(30),

    telefonoCorporativo: z.string().trim().regex(/^[0-9]{9,15}$/, { 
        message: "El número telefónico corporativo debe contener solo dígitos y tener entre 9 y 15 caracteres" 
    }),
    
    
    emailCorporativo: emailNormal,

    documentoRepresentante: z.array(z.string().url())
        .length(2, { message: "Debes subir exactamente 2 imágenes de tu documento (Frente y Reverso)" }),
    
    rut: z.string().url({ message: "El archivo del RUT debe ser una URL válida (PDF o Imagen)" }),
    camaraComercio: z.string().url({ message: "El archivo de Cámara de Comercio debe ser una URL válida (PDF o Imagen)" }),

    aceptaTratamientoDatos: z.preprocess((val) => {
        if (val === "true") return true;
        if (val === "false") return false;
        return val;
    }, z.literal(true, {
        errorMap: () => ({ message: "El campo de aceptar tratamiento de datos es obligatorio" })
    }))
});

export const editarCompaniaSchema = verificarCompaniaSchema.partial();

export const verificacionCompaniaEditarSchema = verificarCompaniaSchema
    .extend({
        estado: z.enum(['PENDIENTE', 'APROBADO', 'RECHAZADO']),
        motivoRechazo: z.string().optional().or(z.literal(''))
    })
    .partial();