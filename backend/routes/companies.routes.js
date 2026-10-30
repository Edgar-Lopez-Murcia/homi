import express from 'express';
import Companies from '../models/verification/Companies.js';

import verificarToken from '../middleware/auth.js';
import verificarAdmin from '../middleware/admin.js';
import verificarDuenio from '../middleware/verificarDuenio.js';
import { validarSchema } from '../utils/modelValidation.js';

import { 
    verificarCompaniaSchema, 
    editarCompaniaSchema, 
    verificacionCompaniaEditarSchema 
} from '../validators/verificationCompanies.validator.js';

import {
    getAllCompanies,
    getMyCompany,
    createCompany,
    updateMyCompany,
    changeCompanyStatus,
    deleteCompany
} from '../controllers/verificationCompanies.controller.js';

const router = express.Router();


// RUTAS ESTÁTICAS Y DEL USUARIO


router.get('/me', verificarToken, getMyCompany);

router.post('/', 
    verificarToken, 
    validarSchema(verificarCompaniaSchema), 
    createCompany
);

router.put('/:id', 
    verificarToken, 
    verificarDuenio(Companies, 'usuario'), 
    validarSchema(editarCompaniaSchema), 
    updateMyCompany
);


// RUTAS DE ADMINISTRACIÓN


router.get('/', verificarToken, verificarAdmin, getAllCompanies);

router.put('/:id/estado', 
    verificarToken, 
    verificarAdmin, 
    validarSchema(verificacionCompaniaEditarSchema), 
    changeCompanyStatus
);


// RUTAS GENERALES (Dinámicas)


router.delete('/:id', 
    verificarToken, 
    verificarDuenio(Companies, 'usuario'), 
    deleteCompany
);

export default router;