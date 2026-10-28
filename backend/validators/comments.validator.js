import { z } from 'zod';

export const comentarioSchema = z.object({

    comentario: z.string().trim().min(3).max(500),

    imagenes: z
        .array(z.string().url())
        .max(5)
        .optional()
        .default([]),

    calificacion: z.coerce
        .number()
        .int({ message: "La calificación debe ser un número entero (sin decimales)" }) 
        .min(1)
        .max(5)
});

export const editarComentarioSchema = comentarioSchema.partial();

export const respuestaPropietarioSchema = z.object({
    respuestaPropietario: z.string().trim().min(2).max(50)
})