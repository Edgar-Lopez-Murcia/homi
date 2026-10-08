// 1. Importar Las dependencias
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const Producto = require('./models/Producto');
const authRoutes = require('./routes/auth');
const verificarToken = require('./middleware/auth')
const productosRoutes = require('./routes/productos');
const ordenesRoutes = require('./routes/ordenes');
const pagoRoutes   = require('./routes/pago');
const { limitadorGlobal } = require('./middleware/limitadorPeticiones');

// 2. Crear la aplicación y definir el puerto
const app = express();
const PORT = process.env.PORT || 3000;

// 3. Activar middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set('trust proxy', 1);

// 2. Limitador GLOBAL (se aplica a TODAS las rutas)
app.use(limitadorGlobal);

// 4. Conectar a MongoDB Atlas  
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ Conectado a MongoDB Atlas'))
    .catch((err) => console.error('❌ Error de coneccion: ', err))




// 9. Ruta de prueba 
app.get('/', (req,res) => {
    res.json({mensaje: 'Servidor TechStore Pro✅'});
});

// 10. Arrancar Servidor
app.listen(PORT, () => {
    console.log(`Servidor en http://localhost:${PORT}`);
});

// 11. Rutas de autenticacion
app.use('/api/auth', authRoutes);

// 12.Rutas de productos
app.use('/api/productos', productosRoutes);

// 13.Rutas de órdenes
app.use('/api/ordenes', ordenesRoutes);

// 14.Rutas de pagos
app.use('/api/pagos',pagoRoutes);

app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
});
