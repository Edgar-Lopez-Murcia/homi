import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const objectIdSchema = z.string().regex(objectIdRegex);

export const crearReporteSchema = z.object({
    // IDs de relación (Vienen del Token o del Body según tu lógica)
    usuarioReporte: objectIdSchema,
    usuarioReportado: objectIdSchema,
    asunto: objectIdSchema, 

    // Campo opcional (No requerido en Mongoose)
    publicacionReportada: objectIdSchema.optional(),

    comentario: z.string().trim().min(1).max(500),

    // Un arreglo de URLs para las imágenes de prueba
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
    adminResponsable: objectIdSchema.optional()
});
