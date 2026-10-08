const {Schema, model} = require('mongoose')

const infraccionSchema = new Schema ({

    nombre: {type: String, required: true, unique: true},
    descripcion: { type: String }, // Explicación de la infracción
    gravedad: {type: String, enum: ['pequeña', 'leve', 'moderada', 'grave', 'critica'], required: true},
    diasSuspencion: {type: Number, default: 0, min: 0},
    multa: {type: Number, default: 0, min: 0}
})

const Infractions = model('Infractions', infraccionSchema);
module.exports = Infractions;
