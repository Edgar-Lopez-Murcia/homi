// routes/auth.js
import express from 'express';

// 1. Importamos los controladores limpios de lógica de validación manual
import { getAnalysis, getStatistics,
    putActualize } from '../controllers/user.controller.js';

// 2. Importamos las herramientas de seguridad y aduana
import verificarToken from '../middleware/auth.js';
import verificarAdmin from '../middleware/admin.js';
import validarSchema from '../utils/modelValidation.js';

// 3. Importamos los esquemas específicos desde la nueva estructura dividida
import { 
    actualizarEstadoSchema
} from '../validators/user.validator.js';

const router = express.Router();


// GET todos los usuarios — Público con filtros y PAGINACIÓN (Solo Admin)
router.get('/analisis', verificarToken, verificarAdmin, getAnalysis);

// GET - número de estadisticas 
router.get('/analisis/estadisticas', verificarToken, verificarAdmin, getStatistics);


// Ruta para actualizar el tipo de usuario, la verificación y el estado del usuario ( Solo administradores )
router.put('/actualizar-verificacion/:id',verificarToken, 
    verificarAdmin, validarSchema(actualizarEstadoSchema), putActualize); 

export default router;