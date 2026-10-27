import { z } from 'zod';

export const infraccionSchema = z.object({

    nombre: z.string().trim()
        .min(5, {message: "El nombre de la infraccion es obligatoria y debe tener al menos 5 caracteres"})
        .max(100, {message: "El nombre no debe superar los 100 caracteres"}),
    
    descripcion: z.string().trim()
        .min(10, {message: "La descripción de la infraccion es obligatoria y debe tener al menos 10 caracteres"})
        .max(300, {message: "La descripcion no debe superar los 300 caracteres"}),
    
    gravedad: z.enum([
        'pequeña', 'leve', 'moderada', 'grave', 'critica'
    ], {
        errorMap: () => ({message: "El tipo de gravedad proporcionado no corresponde a uno válido en el sistema"})
    }),

    diasSuspecion: z.coerce.number()
        .min(0, {message: "Los dias de suspencion son obligatorios y deben ser un numero mayor o igual a cero"})
        .max(10000, {message: "Los dias de suspencion exceden el límite máximo permitido por el sistema"}),

    multa: z.coerce.number()
        .min(0, {message: "La multa es obligatoria y debe ser un número mayor o igual a cero"})
        .max(100000, {message: "La multa excede el límite máximo permitidopor el sistema"})
        .optional()
});

export const editarInfraccionSchema = infraccionSchema
    .partial();