// validators/schemas.js
import { z } from 'zod';

// ... (Aquí guardas tus esquemas anteriores: registroSchema, loginSchema)

// 1. Sub-esquema para las áreas individuales (Ej: cada habitación o baño)
const areaSchema = z.object({
    nombre: z.string().min(2, { message: "El nombre del área debe tener al menos 2 caracteres" }),
    imagen1: z.string().url({ message: "La URL de la imagen 1 no es válida" }),
    imagen2: z.string().url({ message: "La URL de la imagen 2 no es válida" }).optional(),
    imagen3: z.string().url({ message: "La URL de la imagen 3 no es válida" }).optional()
});

// 2. Sub-esquema para el resumen de zonas (Ej: { nombreZona: 'Baño', cantidad: 2 })
const zonaCatalogoSchema = z.object({
    nombreZona: z.string().min(1, { message: "El nombre de la zona es obligatorio" }),
    cantidad: z.coerce.number().min(0, { message: "La cantidad de la zona no puede ser negativa" })
});

// 3. Esquema Principal para Crear o Editar una Propiedad
export const propiedadSchema = z.object({
    titulo: z.string()
        .min(10, { message: "El título debe tener al menos 10 caracteres" })
        .max(100, { message: "El título no puede superar los 100 caracteres" }),
    
    descripcion: z.string()
        .min(30, { message: "La descripción debe ser detallada (mínimo 30 caracteres)" }),
    
    // Usamos z.coerce para transformar automáticamente los strings del frontend en números reales
    precio: z.coerce.number()
        .positive({ message: "El precio debe ser un número mayor a cero" }),
    
    departamento: z.string().min(1, { message: "El departamento es obligatorio" }),
    municipio: z.string().min(1, { message: "El municipio es obligatorio" }),
    
    tipo: z.enum(['Casa', 'Apartamento', 'Local', 'Terreno'], {
        errorMap: () => ({ message: "El tipo de inmueble debe ser Casa, Apartamento, Local o Terreno" })
    }),
    
    tipoAlquiler: z.enum(['Mensual', 'Diario', 'Venta'], {
        errorMap: () => ({ message: "El tipo de negocio debe ser Mensual, Diario o Venta" })
    }),

    // Validamos que sea un arreglo de objetos que cumplan con el molde de áreas
    areas: z.array(areaSchema).max(50, { message: "No puedes agregar más de 50 áreas en total" }).optional(),

    // Validamos el catálogo resumen de zonas
    zonas: z.array(zonaCatalogoSchema).optional()
});
