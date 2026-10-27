import { Schema, model } from 'mongoose';

const propietarioVerificacionSchema = new Schema ({
    usuario: {type: Schema.Types.ObjectId, ref: 'Users', required: true},

    nombreUsuario: {type: String, required: true, 
        trim: true, minlength: 3, maxlength: 30 },

    tipoDocumento: {type: String, 
        enum:['Cédula de Ciudadania', 'Cédula de Extranjería', 'Permiso por protección Temporal'],
        default: 'Cédula de Ciudadania'
    }, 

    numeroDocumento: {type: Number, required: true, min: 0},

    fechaNacimiento: {type: Date, required: true},
    telefono: {type: String, required: true, minlength: 9, maxlength: 15 },
    email: {type: String, required: true, trim: true, minlength: 5, maxlength: 50 },
    documento: {type: [String], required: true, 
        validate: {
            validator: (arr) => arr.length <= 2, 
            message: 'Solo se permiten 2 imagenes para el documento'
        }  },

    selfiDocumento: {type: String}, 
    rut: {type: String, required: true},

    aceptaTratamientoDatos: {type: Boolean, required: true},
    estado: {type: String, 
        enum: ['PENDIENTE', 'APROBADO', 'RECHAZADO'],
        default: 'PENDIENTE'
    },

    motivoRechazo: {type: String}
}, { timestamps : true })

propietarioVerificacionSchema.index({ usuario: 1 }, { unique: true });

const Owners = model('Owners', propietarioVerificacionSchema);
export default Owners;