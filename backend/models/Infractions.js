import { Schema, model } from 'mongoose';

const infraccionSchema = new Schema ({

    nombre: {type: String, required: true, unique: true},
    descripcion: { type: String, trim: true }, // Explicación de la infracción
    gravedad: {type: String, enum: ['pequeña', 'leve', 'moderada', 'grave', 'critica'], required: true},
    diasSuspension: {type: Number, default: 0, min: 0},
    multa: {type: Number, default: 0, min: 0}
})

const Infractions = model('Infractions', infraccionSchema);
export default Infractions;
