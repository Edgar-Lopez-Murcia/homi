import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const objectIdSchema = z.string().regex(objectIdRegex);

export const multaInfraccionSchema = z.object({
    usuarioPenalizado: objectIdSchema,

    reportesOrigen: z.array(objectIdSchema).min(1),

    diasSuspecion: z.coerce.number().int().min(1).max(100000),
    precioMulta: z.coerce.number().min(0).max(10000000),

    fechaInicio: z.coerce.date().default(() => new Date()),
});

// ESQUEMA PARCIAL PARA EDICIÓN (Por si necesitan actualizar el estado del pago o la multa)
export const editarMultaInfraccionSchema = multaInfraccionSchema
    .extend({
        pagada: z.coerce.boolean().default(false),
        estadoPenalizacion: z.enum(['PENDIENTE', 'PAGO_CONFIRMADO', 'EXPIRADA']).default('PENDIENTE')
    })
    .partial(); 
