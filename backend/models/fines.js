const { Schema, model } = require('mongoose');

const multaInfraccionSchema = new Schema({
    usuarioPenalizado: { type: Schema.Types.ObjectId, ref: 'Users', required: true },
    
    // 🔥 AQUÍ ESTÁ LA MAGIA: Un array de IDs de los reportes que provocaron esta multa
    reportesOrigen: [{ type: Schema.Types.ObjectId, ref: 'Reports', required: true }],
    
    diasSuspencion: { type: Number, required: true, min: 1 },
    fechaInicio: { type: Date, default: Date.now, required: true },
    fechaFin: { type: Date, required: true },
    precioMulta: { type: Number, required: true, min: 0 }, 
    pagada: { type: Boolean, default: false },
    estadoPenalizacion: { 
        type: String, 
        enum: ['PENDIENTE', 'PAGO_CONFIRMADO', 'EXPIRADA'],
        default: 'PENDIENTE'
    },
}, { timestamps: true });

// El mismo hook automático que calcula el fin de la multa
multaInfraccionSchema.pre('validate', function(next) {
    if (this.fechaInicio && this.diasSuspencion) {
        const fin = new Date(this.fechaInicio);
        fin.setDate(fin.getDate() + this.diasSuspencion);
        this.fechaFin = fin;
    }
    next();
});
multaInfraccionSchema.index({ usuarioPenalizado: 1, estadoPenalizacion: 1 });


const Fines = model('Fines', multaInfraccionSchema);
module.exports = Fines;

