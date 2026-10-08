const { Schema, model } = require('mongoose');

const resenaSchema = new Schema({
    propiedad: { type: Schema.Types.ObjectId, ref: 'Properties', required: true },
    usuarioComentario: { type: Schema.Types.ObjectId, ref: 'Users', required: true },
    comentario: { type: String, required: true, maxlength: 500 },
    imagenes: [{ type: String }], // Array de URLs de imágenes (más flexible)
    calificacion: { type: Number, required: true, min: 1, max: 5 },
    likes: { type: Number, default: 0 }
}, { timestamps: true });

// Índice para evitar que un usuario reseñe la misma propiedad dos veces
resenaSchema.index({ propiedad: 1, usuarioComentario: 1 }, { unique: true });

module.exports = model('Comments', resenaSchema);