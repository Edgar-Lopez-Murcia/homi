import { Schema, model } from 'mongoose';

const inmuebleVerificacionSchema = new Schema({
    usuario: {type: Schema.Types.ObjectId, ref: 'Users', required: true},
    inmueble: {type: Schema.Types.ObjectId, ref: 'Properties', required: true},

    esDueño: {type: Boolean, required: true},

    documentoPropiedad: {type: String, 
        enum: ['Certificado de Tradición', 'Escritura', 'Recibo Público'], required: true
    },

    autorizacion: {type: String},
    estado: {type: String, 
        enum: ['activo', 'inactivo'], default: 'activo'
    }
}, { timestamps : true });

inmuebleVerificacionSchema.index({ inmueble: 1 }, { unique: true });

const Inmovables = model('Inmovables', inmuebleVerificacionSchema);
export default Inmovables;