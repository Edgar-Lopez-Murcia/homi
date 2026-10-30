// routes/infractions.routes.js
import express from 'express';
import verificarToken from '../middleware/auth.js';
import verificarAdmin from '../middleware/admin.js';

// Importamos el validador estándar y los esquemas de Zod
import { validarSchema } from '../utils/modelValidation.js';
import { infraccionSchema, editarInfraccionSchema } from '../validators/infractions.validator.js'; // Ajusta la ruta a tu carpeta real

// Importamos los controladores
import { 
    getInfractions, 
    createInfraction, 
    updateInfraction, 
    deleteInfraction 
} from '../controllers/infractions.controller.js';

const router = express.Router();


// RUTAS

// Cualquier usuario logueado puede ver la lista (con filtros)
router.get('/', verificarToken, getInfractions);

// Solo Admin puede crear
router.post('/', 
    verificarToken, 
    verificarAdmin, 
    validarSchema(infraccionSchema), 
    createInfraction
);

// Solo Admin puede editar (Usamos el esquema parcial para permitir editar solo un campo)
router.put('/:id', 
    verificarToken, 
    verificarAdmin, 
    validarSchema(editarInfraccionSchema), 
    updateInfraction
);

// Solo Admin puede eliminar
router.delete('/:id', 
    verificarToken, 
    verificarAdmin, 
    deleteInfraction
);

export default router;