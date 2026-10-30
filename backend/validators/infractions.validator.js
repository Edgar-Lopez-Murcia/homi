import { z } from 'zod';

export const infraccionSchema = z.object({

    nombre: z.string().trim().min(5).max(100),

    descripcion: z.string().trim().min(10).max(300),
    
    gravedad: z.enum([
        'pequeña', 'leve', 'moderada', 'grave', 'critica'
    ], {
        errorMap: () => ({message: "El tipo de gravedad proporcionado no corresponde a uno válido en el sistema"})
    }),

    diasSuspension: z.coerce.number().min(0).max(10000).optional(), 
    multa: z.coerce.number().min(0).max(100000).optional()
});

export const editarInfraccionSchema = infraccionSchema.partial();