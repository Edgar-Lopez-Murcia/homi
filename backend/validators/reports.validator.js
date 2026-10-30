import { z } from 'zod';
import { idSchema } from './globals.validator.js';

export const crearReporteSchema = z.object({
    
    usuarioReportado: z.string().regex(idSchema, { message: "ID de usuario reportado no válido" }),

    asunto: z.string().regex(idSchema, { message: "ID de infracción no válido" }), 

    
    publicacionReportada: z.string().regex(idSchema, { message: "ID de propiedad no válido" }).optional(),

    comentario: z.string().trim().min(1).max(500),

    imagenPrueba: z
        .array(z.string().url())
        .max(4)
        .optional()
        .default([]),
});

// ESQUEMA EXCLUSIVO PARA CUANDO EL ADMIN ACTUALIZA EL ESTADO
export const actualizarEstadoReporteSchema = z.object({
    estado: z.enum([
        'PENDIENTE_REVISION', 
        'EN_PROCESO', 
        'EVALUACION', 
        'DENEGADO', 
        'CONFIRMADO', 
        'FINALIZADO'
    ]),
    
    adminResponsable: z.string().regex(idSchema).optional()
});
