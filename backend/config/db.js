import mongoose from 'mongoose';

const conectarDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ MongoDB conectado');
    } catch (err) {
        console.error('❌ Error conectando a MongoDB:', err.message);
        process.exit(1); // Detiene el servidor si no hay BD
    }
};

export default conectarDB;