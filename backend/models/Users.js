// 1. Importar Mongoose
const { Schema, model } = require('mongoose');

// 2. sub-esquema de favoritos 
const favoritoSchema = new Schema({ 
    inmueble: {
        type: Schema.Types.ObjectId,
        ref : 'Properties',
        required: true
    }
},{ timestamps: true})

// 3. Schema del usuario
const usuarioSchema = new Schema({
    nombre:          {type: String, required: true},
    imagenPerfil:    {type: String, default: 'https://i.pinimg.com/564x/9d/6b/9d/9d6b9db2dcb0526a09b89fb35d075c72.jpg'},
    email:           {type: String, required: true, unique: true},
    password:        {type: String, required: true},
    rol:             {type: String, 
        enum: ['admin', 'usuario'],
        default:'usuario' },
    tipoUsuario: {type: String,
        enum: ['arrendatario', 'propietario', 'empresa'],
        default: 'arrendatario'
    },
    estado: {type: String,
        enum: ['ACTIVE', 'SUSPENDED', 'RESTRICTED', 'BANNED', 'INACTIVE'],
        default: 'ACTIVE'
    },
    departamento:     {type: String, required: true},
    municipio:        {type: String, required: true},
    verificado:       {type: Boolean, default: false},
    favoritos: [favoritoSchema]

}, { timestamps : true });

// 4. Exportar el Model
const Users = model('Users', usuarioSchema);
module.exports = Users;