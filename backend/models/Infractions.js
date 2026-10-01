const {Schema, model} = require('mongoose')

const infraccionSchema = new Schema ({

    nombre: {type: String, required: true, unique: true},
    gravedad: {type: String, enum: ['pequeña', 'leve', 'moderada', 'grave', 'critica'], required: true},
    diasSuspencion: {type: Number, required: true},
    multa: {type: Number, required: true, min: 0}
})

const Infractions = model('Infractions', infraccionSchema);
module.exports = Infractions;
