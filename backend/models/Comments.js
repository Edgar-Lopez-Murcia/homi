const {Schema, model} = require('mongoose')

const reseñasSchema = new Schema({

    usuarioComentario: {
        type: Schema.Types.ObjetId,
        ref: 'Users',
        required: true
    },
    comentario: {type: String, required: true},
    imagen: {type: String},
    imagen: {type: String},
    imagen: {type: String},
    calificacion: {type: Number,
        enum: [1, 2, 3, 4,5],
        required: true
    },
    likes: {type: Number, default: 0}
})

const comentarioSchema = new Schema({
    propiedad: {
        type: Schema.Types.ObjetId,
        ref:'Properties',
        required: true
    },
    reseñas: [reseñasSchema],
    puntuacionFinal: {type: Number},

}, {timestamps: true});

const Comments = model('Comments', comentarioSchema);
module.exports = Comments;