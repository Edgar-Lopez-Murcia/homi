import express from 'express';
import Inmovables from '../models/verification/Inmovables.js';

import verificarToken from '../middleware/auth.js';
import verificarAdmin from '../middleware/admin.js';
import verificarDuenio from '../middleware/verificarDuenio.js';
import { validarSchema } from '../utils/modelValidation.js';

import { 
    verificacionInmuebleSchema, 
    verificacionInmuebleEditarSchema, 
    validarInmuebleEditarSchema 
} from '../validators/verificationInmobables.validator.js';

import {
    getAllVerifications,
    getMyVerifications,
    createVerification,
    updateMyVerification,
    changeVerificationStatus,
    deleteVerification
} from '../controllers/verificationInmovables.controller.js';

const router = express.Router();


// RUTAS ESTÁTICAS Y DEL USUARIO


// Ver mis solicitudes de inmuebles
router.get('/me', verificarToken, getMyVerifications);

// Crear solicitud para un inmueble específico
router.post('/inmueble/:inmuebleId', 
    verificarToken, 
    validarSchema(verificacionInmuebleSchema), 
    createVerification
);

// Editar mi solicitud
router.put('/:id', 
    verificarToken, 
    verificarDuenio(Inmovables, 'usuario'), 
    validarSchema(verificacionInmuebleEditarSchema), 
    updateMyVerification
);


// RUTAS DE ADMINISTRACIÓN


// Listar todas
router.get('/', verificarToken, verificarAdmin, getAllVerifications);

// Cambiar estado (activo/inactivo)
router.put('/:id/estado', 
    verificarToken, 
    verificarAdmin, 
    validarSchema(validarInmuebleEditarSchema), 
    changeVerificationStatus
);


// RUTAS GENERALES (Dinámicas)


router.delete('/:id', 
    verificarToken, 
    verificarDuenio(Inmovables, 'usuario'), 
    deleteVerification
);

export default router;