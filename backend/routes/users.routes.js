import express from 'express';

const router = express.Router();
import verificarToken from '../middleware/auth.js';
import verificarAdmin from '../middleware/admin.js';

// GET todos los usuarios — Público con filtros y PAGINACIÓN (Solo Admin)
router.get('/analisis', verificarToken, verificarAdmin);

// GET - número de estadisticas 
// GET - número de estadisticas 
router.get('/analisis/estadisticas', verificarToken, verificarAdmin);


// Ruta para actualizar el tipo de usuario, la verificación y el estado del usuario ( Solo administradores )
router.put('/actualizar-verificacion/:id',verificarToken, verificarAdmin); 

export default router;