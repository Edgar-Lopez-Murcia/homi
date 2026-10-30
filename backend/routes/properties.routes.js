// routes/properties.routes.js
import express from 'express';
import Properties from '../models/Properties.js';

import verificarToken from '../middleware/auth.js';
import verificarAdmin from '../middleware/admin.js';
import verificarPublicante from '../middleware/publicante.js';
import verificarDuenio from '../middleware/verificarDuenio.js';

// Importamos el validador corregido (con llaves)
import { validarSchema } from '../utils/modelValidation.js';
import { propiedadSchema, propiedadEditarSchema } from '../validators/property.validator.js';

// Importamos TODOS los controladores
import { 
    getProperties, 
    getPropertyById,
    getMyProperties,
    getPropertiesAnalysis,
    getPropertiesStats,
    createProperty,
    updateProperty,
    addAreasToProperty,
    removeAreaFromProperty,
    deleteProperty
} from '../controllers/properties.controller.js';

const router = express.Router();

// ============================================
// 🌐 RUTAS PÚBLICAS
// ============================================
router.get('/', getProperties);


// ============================================
// 🔒 RUTAS PRIVADAS Y DE ADMINISTRACIÓN
// ============================================

router.get('/propios/mis-inmuebles', verificarToken, verificarPublicante, getMyProperties);
router.get('/analisis', verificarToken, verificarAdmin, getPropertiesAnalysis);
router.get('/analisis/estadisticas', verificarToken, verificarAdmin, getPropertiesStats);


// ============================================
// 🌐 RUTAS PÚBLICAS DINÁMICAS (Va al final de los GET)
// ============================================
router.get('/:id', getPropertyById);


// ============================================
// ✍️ RUTAS DE MUTACIÓN (POST, PUT, DELETE)
// ============================================

router.post('/', 
    verificarToken, 
    verificarPublicante, 
    validarSchema(propiedadSchema), // Zod se encarga de validar áreas, URLs y coordenadas
    createProperty
);

router.put('/:id', 
    verificarToken, 
    verificarPublicante, 
    verificarDuenio(Properties), 
    validarSchema(propiedadEditarSchema), // Zod valida los campos parciales
    updateProperty
);

router.put('/:id/agregar-areas', 
    verificarToken, 
    verificarPublicante, 
    verificarDuenio(Properties, 'propietario', 'zonas areas'), 
    addAreasToProperty
);

router.put('/:id/eliminar-area/:areaId/:nombreZona', 
    verificarToken, 
    verificarPublicante, 
    removeAreaFromProperty
);

router.delete('/:id', 
    verificarToken, 
    verificarPublicante, 
    verificarDuenio(Properties), 
    deleteProperty
);

export default router;