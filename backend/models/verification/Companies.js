import { Schema, model } from 'mongoose';

const empresaVerificacionSchema = new Schema ({
    usuario: {type: Schema.Types.ObjectId, ref: 'Users', required: true},

    razonSocial: {type: String, required: true},

    nit: {type: String, required: true, 
        trim: true, minlength: 3, maxlength: 30 },

    tipoDocumento: {type: String, 
        enum:['Cédula de Ciudadania', 'Cédula de Extranjería', 'Permiso por protección Temporal'],
        default: 'Cédula de Ciudadania'
    }, 

    numeroDocumento: {type: Number, required: true, min: 0},

    nombreRegresentante: {type: String, required: true},
    telefonoCorporativo: {type: String, required: true, minlength: 9, maxlength: 15 },
    emailCorporativo: {type: String, required: true, trim: true, minlength: 5, maxlength: 50 },
    documentoRepresentante: {type: [String], required: true, 
        validate: {
            validator: (arr) => arr.length <= 2, 
            message: 'Solo se permiten 2 imagenes para el documento'
        }  },

    rut: {type: String, required: true},
    camaraComercio: {type: String, required: true}, 

    aceptaTratamientoDatos: {type: Boolean, required: true},
    estado: {type: String, 
        enum: ['PENDIENTE', 'APROBADO', 'RECHAZADO'],
        default: 'PENDIENTE'
    },

    motivoRechazo: {type: String}
}, { timestamps : true })

empresaVerificacionSchema.index({ usuario: 1 }, { unique: true });

const Companies = model('Companies', empresaVerificacionSchema);
export default Companies;