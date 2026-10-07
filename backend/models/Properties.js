const {Schema, model } = require('mongoose')

const areasCasaSchema = new Schema ({

    nombre: { type: String, required: true},
    imagen1: { type: String, required: true},
    imagen2: { type: String},
    imagen3: { type: String}
})

const numeroZonasSchema = new Schema ({
    nombreZona: {type: String, enum: ['Exterior','Cocina', 'Baño', 'habitacion', 'Cuarto de lavado', 
        'Vestidor', 'Bodega', 'Sala de estar', 'Comedor', 'Cuarto de estudio', 'Piso',
        'Patio interior', 'Terrasa', 'otros'
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

    areas: [areasCasaSchema],
    zonas: [numeroZonasSchema],

    planosInmueble: {type: String },
    
    departamento: { type: String, required: true },
    municipio:    { type: String, required: true },
    direccionExacta: { type: String, required: true },
    detallesDireccion: { type: String }, // Ej: "Frente al parque principal, apto 201"

     // 🔥 NUEVO CAMPO: Geolocalización en formato GeoJSON
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

inmuebleSchema.index({ ubicacion: "2dsphere" });

inmuebleSchema.index({ departamento: 1, municipio: 1, estado: 1 });
inmuebleSchema.index({ precio: 1 });

const Properties = model('Properties', inmuebleSchema);
module.exports = Properties;