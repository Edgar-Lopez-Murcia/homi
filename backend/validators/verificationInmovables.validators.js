// validators/verificationInmobables.validator.js
import { z } from 'zod';


export const verificacionInmuebleSchema = z.object({

    esDueño: z.preprocess((val) => {
        if (val === "true") return true;
        if (val === "false") return false;
        return val;
    }, z.boolean({ required_error: "Es obligatorio especificar si eres el dueño del inmueble" })),

    DocumentoPropiedad: z.enum(['Certificado de Tradición', 'Escritura', 'Recibo Público'], {
        errorMap: () => ({ message: "El documento de propiedad debe ser: Certificado de Tradición, Escritura o Recibo Público" })
    }),

    autorizacion: z.string().url({ message: "La autorización debe ser una URL válida de archivo" }).optional().or(z.literal('')),

})
.superRefine((datos, ctx) => {

    if (datos.esDueño === false) {
        
        if (!datos.autorizacion || datos.autorizacion.trim() === "") {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "El documento de autorización es obligatorio si no eres el dueño directo del inmueble",
                path: ["autorizacion"] 
            });
        }
    }
});


export const verificacionInmuebleEditarSchema = verificacionInmuebleSchema.partial();

export const validarInmuebleEditarSchema = verificacionInmuebleSchema
    .extend({
        estado: z.enum(['activo', 'inactivo'])
    })
    .partial();
    
