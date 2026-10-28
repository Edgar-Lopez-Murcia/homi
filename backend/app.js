import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import mongoSanitize from 'express-mongo-sanitize';
import sanitizarEntradas from './middleware/sanitizarEntradas.js';
import { limitadorGlobal } from './middleware/limitadorPeticiones.js';
import manejadorErrores from './middleware/manejadorErrores.js';
import './validators/zodSetup.js'; 

const app = express();

// 1. Seguridad básica
app.set('trust proxy', 1); // Para proxies (Replit, Heroku, etc.)
app.use(helmet()); // Cabeceras HTTP seguras
app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }));
app.use(express.json({ limit: '10mb' })); // Límite de payload

// 2. Sanitización global (XSS + NoSQL Injection)
app.use(mongoSanitize()); // Previene inyección NoSQL ($ y . en inputs)
app.use(sanitizarEntradas); // Previene XSS

// 3. Rate limiting global
app.use(limitadorGlobal);

// 4. Rutas

import authRoutes from './routes/auth.js';
import propertiesRoutes from './routes/properties.routes.js';
import commentsRoutes from './routes/comments.routes.js';
import likesRoutes from './routes/likes.routes.js';
import infractionsRoutes from './routes/infractions.routes.js';

// 5. Manejo de rutas
app.use('/api/auth', authRoutes);    
app.use('/api/properties', propertiesRoutes);
app.use('/api/comments', commentsRoutes);
app.use('/api/likes', likesRoutes);
app.use('/api/infractions', infractionsRoutes);


// 6. Si la petición llega hasta este punto, significa que ninguna ruta de arriba la atrapó.
app.use((req, res, next) => {
    const error = new Error(`No se encontró la ruta solicitada: ${req.originalUrl}`);
    error.status = 404; // Le asignamos el número de error 404
    next(error); // Mandamos este error directo al manejador global
});

// 7. Manejo de errores (SIEMPRE al final)
app.use(manejadorErrores);

export default app;