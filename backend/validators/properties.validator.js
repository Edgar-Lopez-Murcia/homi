// validators/property.validator.js
import { z } from 'zod';


// 1. Esquema para validar un área individual por separado (POST/PUT de áreas)
export const areaSchema = z.object({
    nombre: z.string().trim()
        .min(2)
        .max(50),
    imagen1: z.string().url({ message: "La URL de la imagen principal (imagen1) no es válida" }),
    imagen2: z.string().url().optional().or(z.literal('')),
    imagen3: z.string().url().optional().or(z.literal(''))
});

// Esquema parcial para cuando edites un área (hace todos sus campos opcionales)
export const areaEditarSchema = areaSchema.partial();

// 2. Esquema para validar una zona del catálogo por separado (POST/PUT de zonas)
export const zonaCatalogoSchema = z.object({
    nombreZona: z.enum([
        'Exterior', 'Cocina', 'Baño', 'Habitación', 'Cuarto de lavado', 
        'Vestidor', 'Bodega', 'Sala de estar', 'Comedor', 'Cuarto de estudio', 
        'Piso', 'Patio interior', 'Terraza', 'otros'
    ], {
        errorMap: () => ({ message: "El nombre de la zona proporcionado no es un tipo de zona válido en el sistema" })
    }),
    cantidad: z.coerce.number()
        .int({ message: "La cantidad debe ser un número entero" })
        .min(0, { message: "La cantidad de la zona no puede ser negativa" })
});

// Esquema parcial para cuando edites una zona por separado
export const zonaEditarSchema = zonaCatalogoSchema.partial();

// 3. Esquema para la ubicación geográfica en formato GeoJSON de MongoDB
const ubicacionGeoJSONSchema = z.object({
    type: z.literal('Point', {
        errorMap: () => ({ message: "El tipo de ubicación geográfica debe ser obligatoriamente 'Point'" })
    }).default('Point'),
    
    // [Longitud, Latitud] - Valida límites reales del planeta Tierra
    coordinates: z.array(z.coerce.number())
        .length(2, { message: "Las coordenadas de ubicación deben contener exactamente [Longitud, Latitud]" })
        .refine((coords) => coords[0] >= -180 && coords[0] <= 180, {
            message: "La Longitud geográfica debe ser un número decimal entre -180 y 180"
        })
        .refine((coords) => coords[1] >= -90 && coords[1] <= 90, {
            message: "La Latitud geográfica debe ser un número decimal entre -90 y 90"
        })
});

// ============================================
//  ESQUEMAS PRINCIPALES DEL INMUEBLE
// ============================================

// 4. Esquema Completo para Crear una Propiedad (POST)
export const propiedadSchema = z.object({
    titulo: z.string().trim().min(5).max(100),
    
    descripcion: z.string().trim().min(10).max(500),
    
    tipo: z.enum(['casa', 'apartamento', 'apartamento-estudio', 'habitacion', 'local'], {
        errorMap: () => ({ message: "El tipo de inmueble debe ser: casa, apartamento, apartamento-estudio, habitacion o local" })
    }),
    
    tipoAlquiler: z.enum(['Larga Estancia', 'Corta Estancia', 'Flexible'], {
        errorMap: () => ({ message: "El tipo de alquiler debe ser: Larga Estancia, Corta Estancia o Flexible" })
    }).default('Larga Estancia'),
    
    estado: z.enum(['disponible', 'arrendado', 'suspendido'], {
        errorMap: () => ({ message: "El estado del inmueble debe ser: disponible, arrendado o suspendido" })
    }).default('disponible'),
    
    precio: z.coerce.number().min(0).max(100000000),
    
    imagenPrincipal: z.string().url(),
    planosInmueble: z.string().url().optional().or(z.literal('')),
    contrato: z.string().optional().or(z.literal('')),
    
    departamento: z.string().trim().min(1),
    municipio: z.string().trim().min(1,),
    direccionExacta: z.string()
        .min(1)
        .max(500),
    detallesDireccion: z.string().trim()
        .max(500)
        .optional().or(z.literal('')),
    
    ubicacion: ubicacionGeoJSONSchema,
    
    // Arrays de subdocumentos usando los esquemas individuales definidos arriba
    areas: z.array(areaSchema).max(50, { message: "No puedes agregar más de 50 áreas en total" }).optional(),
    zonas: z.array(zonaCatalogoSchema).optional()
});

// 5. Esquema Parcial para Editar una Propiedad (PUT)
export const propiedadEditarSchema = propiedadSchema
    .omit({ codigoCorto: true, propietario: true, likes: true })
    .partial();
