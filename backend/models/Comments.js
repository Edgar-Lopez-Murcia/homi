import { Schema, model } from 'mongoose';

const comentarioSchema = new Schema({
    propiedad: {
        type: Schema.Types.ObjectId,
        ref: 'Properties',
        required: true,
        index: true
    },
    usuarioComentario: {
        type: Schema.Types.ObjectId,
        ref: 'Users',
        required: true
    },
    comentario: {
        type: String,
        required: true,
        trim: true,
        minlength: 3,
        maxlength: 500
    },
    imagenes: {
        type: [String],
        default: [],
        validate: {
            validator: (arr) => arr.length <= 5,
            message: 'Máximo 5 imágenes por reseña'
        }
    },
    calificacion: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    likes: {
        type: Number,
        default: 0,
        min: 0
    },
    // 🔒 Evita que un usuario dé like múltiples veces
    usuariosLike: [{
        type: Schema.Types.ObjectId,
        ref: 'Users',
        select: false // no lo devolvemos al cliente por defecto
    }],
    // Respuesta del propietario (opcional pero muy útil)
    respuestaPropietario: {
        texto:  { type: String, trim: true, maxlength: 500 },
        fecha:  { type: Date, default: Date.now  }
    },
    // Moderación
    estado: {
        type: String,
        enum: ['visible', 'oculto', 'reportado'],
        default: 'visible',
        index: true
    }
}, { timestamps: true });

// Un usuario solo puede reseñar una vez la misma propiedad
comentarioSchema.index({ propiedad: 1, usuarioComentario: 1 }, { unique: true });

// Para listar reseñas de una propiedad ordenadas por fecha
comentarioSchema.index({ propiedad: 1, createdAt: -1 });

const Comments = model('Comments', comentarioSchema);
export default Comments;