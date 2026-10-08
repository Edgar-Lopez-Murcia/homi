const {Schema, model} = require('mongoose')

const reseñasSchema = new Schema({

    usuarioComentario: {
        type: Schema.Types.ObjectId,
        ref: 'Users',
        required: true
    },
    comentario: {type: String, required: true, maxlength: 500},
    imagen1: {type: String},
    imagen2: {type: String},
    imagen3: {type: String},
    calificacion: {type: Number,
        required: true,
        min:1,
        max:5
    },
    likes: {type: Number, default: 0}
})

const comentarioSchema = new Schema({
    propiedad: {
        type: Schema.Types.ObjectId,
        ref:'Properties',
        required: true,
        unique: true
    },
    reseñas: [reseñasSchema],
    puntuacionFinal: {type: Number},

}, {timestamps: true});

const Comments = model('Comments', comentarioSchema);
module.exports = Comments;