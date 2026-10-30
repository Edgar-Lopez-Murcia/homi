// routes/verificationOwners.routes.js
import express from 'express';
import Owners from '../models/verification/Owners.js';

import verificarToken from '../middleware/auth.js';
import verificarAdmin from '../middleware/admin.js';
import verificarDuenio from '../middleware/verificarDuenio.js';

import { validarSchema } from '../utils/modelValidation.js';
import { 
    verificacionDuenioSchema, 
    editarDuenioSchema, 
    verificacionDuenioEditarSchema 
} from '../validators/verificationOwers.validator.js';

import {
    getAllVerifications,
    getMyVerification,
    createVerification,
    updateMyVerification,
    changeVerificationStatus,
    deleteVerification
} from '../controllers/verificationOwners.controller.js';

const router = express.Router();


// RUTAS ESTÁTICAS Y DEL USUARIO 

// El usuario revisa su propio estado de verificación
router.get('/me', verificarToken, getMyVerification);

// Crear solicitud
router.post('/', 
    verificarToken, 
    validarSchema(verificacionDuenioSchema), 
    createVerification
);

// Editar solicitud (Solo el dueño de la solicitud)
router.put('/:id', 
    verificarToken, 
    verificarDuenio(Owners, 'usuario'), 
    validarSchema(editarDuenioSchema), 
    updateMyVerification
);


// RUTAS DE ADMINISTRACIÓN

// Listar todas las solicitudes
router.get('/', verificarToken, verificarAdmin, getAllVerifications);

// Cambiar estado 
router.put('/:id/estado', 
    verificarToken, 
    verificarAdmin, 
    validarSchema(verificacionDuenioEditarSchema), 
    changeVerificationStatus
);


// RUTAS GENERALES (Dinámicas)

router.delete('/:id', 
    verificarToken, 
    verificarDuenio(Owners, 'usuario'), 
    deleteVerification
);

export default router;