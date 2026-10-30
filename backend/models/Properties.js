import { Schema, model } from 'mongoose';

const areasCasaSchema = new Schema ({

    nombre: { type: String, required: true},
    imagen1: { type: String},
    imagen2: { type: String},
    imagen3: { type: String}
})

const numeroZonasSchema = new Schema ({
    nombreZona: {type: String, enum: ['Exterior','Cocina', 'Baño', 'Habitación', 'Cuarto de lavado', 
        'Vestidor', 'Bodega', 'Sala de estar', 'Comedor', 'Cuarto de estudio', 'Piso',
        'Patio interior', 'Terraza', 'otros'
    ], required: true },
    cantidad: {type: Number, required: true, min:0}
})

const inmuebleSchema = new Schema({

    codigoCorto:   { type: String, required: true, unique:true},

    propietario: {
        type: Schema.Types.ObjectId,
        ref: 'Users',
        required: true
    }, 
    titulo: { type: String, required: true, trim: true},
    descripcion: { type: String, required: true},
    tipo: { type: String, 
        enum: ['casa', 'apartamento', 'apartamento-estudio', 'habitacion', 'local'],
        required: true
    },

    tipoAlquiler: {
        type: String,
        enum: ['Larga Estancia', 'Corta Estancia', 'Flexible'],
        required: true,
        default: 'Larga Estancia'
    },
    imagenPrincipal: {type: String, required: true},

    areas: [areasCasaSchema],
    zonas: [numeroZonasSchema],

    planosInmueble: {type: String },
    
    departamento: { type: String, required: true },
    municipio:    { type: String, required: true },
    direccionExacta: { type: String, required: true },
    detallesDireccion: { type: String }, // Ej: "Frente al parque principal, apto 201"

     // Geolocalización en formato GeoJSON
    ubicacion: {
        type: {
            type: String,
            enum: ['Point'], // Obligatoriamente debe ser un 'Punto' geográfico
            required: true,
            default: 'Point'
        },
        // [Longitud, Latitud] - OJO: MongoDB exige la Longitud PRIMERO y la Latitud SEGUNDO
        coordinates: {
            type: [Number],
            required: true
        }
    },

    estado: { type: String, 
        enum: ['disponible', 'arrendado', 'suspendido'],
        default: 'disponible',
        required: true
    },

    contrato: {type: String},

    precio: { type: Number, required: true, min:0},
    likes: {
        type: Number,
        default: 0
    }

}, { timestamps : true});

// 1. Geolocalización eficiente combinada con filtros comunes
inmuebleSchema.index({ ubicacion: "2dsphere", estado: 1, tipo: 1 });

// 2. Búsqueda por ubicación textual básica (Filtro exacto o Regex)
inmuebleSchema.index({ departamento: 1, municipio: 1, estado: 1 });

// 3. El Súper Índice de Búsqueda Normal (Sigue la regla ESR: estado/dept/tipo son Igualdad, createdAt es Orden)
inmuebleSchema.index({ estado: 1, departamento: 1, tipo: 1, createdAt: -1 });

// 4. Consultas combinadas de estado y precio (Para ordenamientos e intervalos de precio comunes)
inmuebleSchema.index({ estado: 1, precio: 1 });

// 5. Consultas que ordenan por popularidad (Likes)
inmuebleSchema.index({ estado: 1, likes: -1 });

const Properties = model('Properties', inmuebleSchema);
export default Properties;