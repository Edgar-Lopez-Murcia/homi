// utils/logger.js
import winston from 'winston';
import fs from 'fs';
import path from 'path';

// Definimos la ruta de la carpeta de logs
const carpetaLogs = 'logs';

// Verificamos si la carpeta NO existe; si es así, la creamos automáticamente
if (!fs.existsSync(carpetaLogs)) {
    fs.mkdirSync(carpetaLogs, { recursive: true });
}

// 1. Definimos el formato de los mensajes
const formatoBase = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), // Agrega la fecha
    winston.format.printf(({ timestamp, level, message, stack }) => {
        // Si hay un error (stack), lo mostramos, si no, solo el mensaje
        return `[${timestamp}] ${level.toUpperCase()}: ${message} ${stack ? '\n' + stack : ''}`;
    })
);

// 2. Creamos los filtros estrictos para separar por niveles
const filtroSoloInfo = winston.format(info => info.level === 'info' ? info : false)();
const filtroSoloWarn = winston.format(info => info.level === 'warn' ? info : false)();

// 3. Creamos el logger
const logger = winston.createLogger({
    level: 'info', // Nivel mínimo a registrar
    format: formatoBase,
    transports: [
        // Transporte 1: Mostrar en consola (útil en desarrollo)
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(), // Le da colores a los niveles
                formatoBase
            )
        }),
        // Transporte 2: Guardar en un archivo (útil en producción)
        new winston.transports.File({ filename: path.join(carpetaLogs, 'error.log'), level: 'error' }),// solo errores
        new winston.transports.File({ 
        filename: path.join(carpetaLogs, 'warn.log'), 
        level: 'warn',
        format: winston.format.combine(filtroSoloWarn, formatoBase)
        }),
        new winston.transports.File({ 
        filename: path.join(carpetaLogs, 'info.log'), 
        level: 'info',
        format: winston.format.combine(filtroSoloInfo, formatoBase) // Filtro estricto
        
        })
    ]
});

export default logger;