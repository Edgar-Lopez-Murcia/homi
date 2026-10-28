import { z } from 'zod';

const customErrorMap = (issue, ctx) => {
  // 1. Campo obligatorio (Required)
    if (issue.code === z.ZodIssueCode.invalid_type && issue.received === 'undefined') {
        return { message: 'Este campo es obligatorio' };
    }

    // 2. Tipo de dato incorrecto (ej: texto en campo numérico)
    if (issue.code === z.ZodIssueCode.invalid_type) {
        let tipoEsperado = issue.expected;
        if (tipoEsperado === 'number') tipoEsperado = 'un número';
        if (tipoEsperado === 'boolean') tipoEsperado = 'un valor verdadero/falso';
        if (tipoEsperado === 'string') tipoEsperado = 'un texto';
        if (tipoEsperado === 'array') tipoEsperado = 'una lista';
        
        return { message: `Debe introducir ${tipoEsperado} válido` };
    }

  // 3. Formatos de texto incorrectos (URLs, Emails, etc.)
    if (issue.code === z.ZodIssueCode.invalid_string) {
        if (issue.validation === 'url') return { message: 'Debe ser un enlace (URL) válido' };
        if (issue.validation === 'email') return { message: 'Debe ser un correo electrónico válido' };
    }

  // 4. Validaciones de mínimos (.min) para números y strings
    if (issue.code === z.ZodIssueCode.too_small) {
        if (issue.type === 'string') return { message: `Debe tener al menos ${issue.minimum} caracteres` };
        if (issue.type === 'number') return { message: `El valor mínimo permitido es ${issue.minimum}` };
    }

  // 5. Validaciones de máximos (.max) para números, strings y arreglos
    if (issue.code === z.ZodIssueCode.too_big) {
        if (issue.type === 'array') return { message: `Máximo ${issue.maximum} elementos permitidos` };
        if (issue.type === 'string') return { message: `Debe tener máximo ${issue.maximum} caracteres` };
        if (issue.type === 'number') return { message: `El valor máximo permitido es ${issue.maximum}` };
    }

  // Si es cualquier otro error no mapeado, usar el de Zod por defecto
    return { message: ctx.defaultError };
};

// Se ejecuta la configuración global en Zod
z.setErrorMap(customErrorMap);
