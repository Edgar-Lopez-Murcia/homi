const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET', 'PORT','NODE_ENV' ];

const validarEnv = () => {
    const faltantes = requiredEnvVars.filter(v => !process.env[v]);
    if (faltantes.length > 0) {
        console.error(`❌ Faltan variables de entorno: ${faltantes.join(', ')}`);
        process.exit(1);
    }
};

export default validarEnv;