const {Schema, model } = require('mongoose')

const likeSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    publicationId: {
        type: Schema.Types.ObjectId,
        ref: 'Publication',
        required: true
    }
}, { timestamps: true });

// Esto evita que un mismo usuario le dé "dos veces" like a la misma propiedad
likeSchema.index({ userId: 1, publicationId: 1 }, { unique: true });

const Likes = model('Likes', likeSchema);
module.exports = Likes;
