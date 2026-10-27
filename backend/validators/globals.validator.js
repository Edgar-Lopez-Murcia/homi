import { z } from 'zod';


export const idSchema = z.object({
    id: z.string().mongodb({ message: "ID inválido" })
});

export const emailNormal = z.object({
    email: z.string().trim()
        .email({ message: "Por favor, introduce un correo electrónico válido" })
        .min(5, { message: "El correo debe tener al menos 5 caracteres" })
        .max(100, { message: "El correo no puede superar los 100 caracteres" }),
});


/**
 * Validador global para fechas de nacimiento con control estricto de edad (Mínimo 16 años, Máximo 120 años)
 * Soporta formatos de texto DD/MM/AAAA, DD-MM-AAAA y formatos ISO estándar.
 */
export const fechaNacimientoSchema = z.string({
    required_error: "La fecha de nacimiento es obligatoria"
})
.min(1, { message: "La fecha de nacimiento no puede estar vacía" })
.transform((val, ctx) => {
    // 1. Intentar romper el texto si viene separado por barras o guiones
    const partes = val.split(/[-/]/);
    let fechaConvertida;

    if (partes.length === 3) {
        const dia = parseInt(partes[0], 10);
        const mes = parseInt(partes[1], 10);
        const anio = parseInt(partes[2], 10);
        
        // El mes en JavaScript va de 0 a 11
        fechaConvertida = new Date(anio, mes - 1, dia);

        // Validar que JS no haya "auto-arreglado" una fecha falsa (ej. 31/04/2025 -> 01/05/2025)
        if (
            fechaConvertida.getFullYear() !== anio ||
            (fechaConvertida.getMonth() + 1) !== mes ||
            fechaConvertida.getDate() !== dia
        ) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "La fecha ingresada no es una fecha válida en el calendario"
            });
            return z.NEVER;
        }
    } else {
        // Si viene en otro formato (como ISO nativo), intentamos construirlo directamente
        fechaConvertida = new Date(val);
    }

    // Verificar si el texto ingresado generó un objeto Date inválido (NaN)
    if (isNaN(fechaConvertida.getTime())) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "El formato de fecha no es válido. Usa el formato DD/MM/AAAA"
        });
        return z.NEVER;
    }

    return fechaConvertida; // Retornamos el objeto Date real y limpio
})
.refine((fecha) => {
    // 2. Validar que no sea una fecha en el futuro remoto
    const hoy = new Date();
    return fecha <= hoy;
}, { message: "La fecha de nacimiento no puede ser una fecha futura" })
.refine((fecha) => {
    // 3. Validar límite máximo de edad (120 años atrás)
    const hoy = new Date();
    const limitePasado = new Date();
    limitePasado.setFullYear(hoy.getFullYear() - 120);
    return fecha >= limitePasado;
}, { message: "La fecha de nacimiento no es válida (límite máximo 120 años)" })
.refine((fecha) => {
    // 4. Validar límite de edad mínima (16 años)
    const hoy = new Date();
    const limiteEdadMinima = new Date();
    limiteEdadMinima.setFullYear(hoy.getFullYear() - 16);
    // Para tener 16 años o más, debiste haber nacido en o antes de la fecha límite
    return fecha <= limiteEdadMinima;
}, { message: "Debes tener al menos 16 años para registrarte en el sistema" });
