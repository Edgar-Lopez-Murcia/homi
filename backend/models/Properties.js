const {Schema, model } = require('mongoose')

const areasCasaShema = new Schema ({

    nombre: { type: String, required: true},
    imagen1: { type: String, required: true},
    imagen2: { type: String},
    imagen3: { type: String}
})

const numeroZonasSchema = new Schema ({
    nombreZona: {type: String, enum: ['Exterior','Cocina', 'Baño', 'habitacion', 'Cuarto de lavado', 
        'Vestidor', 'Bodega', 'Sala de estar', 'Comedor', 'Cuarto de estudio', 'Piso',
        'Patio interior', 'Terrrasa', 'otros'
    ], required: true },
    cantidad: {type: Number, required: true}
})

const inmuebleShema = new Schema({

    codigoCorto:   { type: 'String', required: true},

    propietario: {
        type: Schema.Types.ObjectId,
        ref: 'Users',
        required: true
    }, 
    titulo: { type: String, required: true},
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

    areas: [areasCasaShema],
    Zonas: [numeroZonasSchema],

    planosInmueble: {type: String },
    
    departamento: { type: String, required: true },
    municipio:    { type: String, required: true },
    direccionExacta: { type: String, required: true },
    detallesDireccion: { type: String }, // Ej: "Frente al parque principal, apto 201"

    estado: { type: String, 
        enum: ['disponible', 'arrendado', 'suspendido']
    },

    contrato: {type: String},

    Precio: { type: Number, required: true}

}, { timestamps : true});

const Properties = model('Properties', inmuebleShema);
module.exports = Properties;