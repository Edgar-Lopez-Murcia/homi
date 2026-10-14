import 'dotenv/config';
import validarEnv from './config/env.js';
validarEnv(); // Valida antes de arrancar

import conectarDB from './config/db.js';
import app from './app.js';

const PORT = process.env.PORT || 3000;

const iniciar = async () => {
    await conectarDB();
    app.listen(PORT, () => {
        console.log(`🚀 Servidor en puerto ${PORT}`);
    });
};

iniciar();