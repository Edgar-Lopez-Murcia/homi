const {Schema, model } = require('mongoose')

const areasCasaShema = new Schema ({

    nombre: { type: String, required: true},
    imagen1: { type: String, required: true},
    imagen2: { type: String},
    imagen3: { type: String}
})

const inmuebleShema = new Schema({

    id:   { type: Number, required: true},

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
    areas: [areasCasaShema],
    
    departamento: { type: String, required: true },
    municipio:    { type: String, required: true },
    direccionExacta: { type: String, required: true },
    detallesDireccion: { type: String }, // Ej: "Frente al parque principal, apto 201"

    estado: { type: String, 
        enum: ['disponible', 'arrendado', 'suspendido']
    },

}, { timestamps : true});

const Properties = model('Properties', inmuebleShema);
module.exports = Properties;