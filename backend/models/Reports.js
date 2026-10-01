const {Schema, model} = require('mongoose')

const reportesSchema = new Schema ({
    usuarioReporte: {
        type: Schema.Types.ObjectId,
        ref: 'Users',
        required: true
    },
    usuarioReportado: {
        type: Schema.Types.ObjectId,
        ref: 'Users',
        required: true
    },
    publicacionReportada:  {
        type: Schema.Types.ObjectId,
        ref: 'Properties'
    },
    asunto: {
        type: Schema.Types.ObjectId,
        ref: 'Infractions',
        required: true
    },
    comentario: {type: String, required: true},

    imagenPrueba: [{type:String, required: true}],

    estado: {type: String, enum: ['PENDIENTE_REVISION', 'EN_PROCESO', 
        'EVALUACION', 'DENEGADO', 'CONFIRMADO', 'FINALIZADO'], default: 'PENDIENTE_REVISION'}

}, { timestamps : true })



const Reports = model('Reports', reportesSchema);
module.exports = Reports;