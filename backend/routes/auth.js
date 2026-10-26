// routes/auth.js
import express from 'express';

// 1. Importamos los controladores limpios de lógica de validación manual
import { postRegistro, postLogin,
    getPerfil, putPerfil,
    putCambiarPassword, deleteEliminarCuenta } from '../controllers/auth.controller.js';

// 2. Importamos las herramientas de seguridad y aduana
import verificarToken from '../middleware/auth.js';
import { limitadorLogin, limitadorCambioPassword } from '../middleware/limitadorPeticiones.js';
import validarConZod from '../utils/modelValidation.js';

// 3. Importamos los esquemas específicos desde la nueva estructura dividida
import { 
    registroSchema, 
    loginSchema,
    usuarioEditarSchema,
    cambioPasswordSchema 
} from '../validators/user.validator.js';

const router = express.Router();

// 4. POST /api/auth/registro - Crear cuenta nueva
router.post('/registro', validarConZod(registroSchema), postRegistro);

// 5. POST /api/auth/login - Iniciar sesión y recibir token
router.post('/login', limitadorLogin, validarConZod(loginSchema), postLogin );

// 6. GET /api/aunth/perfil - Ver información de perfil  
router.get('/perfil', verificarToken, getPerfil );

// 7. PUT /api/aunth/perfil - Editar información de perfil
router.put('/perfil', validarConZod(usuarioEditarSchema),verificarToken, putPerfil );

// 8. PUT /api/aunth/cambiar-password - cambio  de contraseña
router.put('/cambiar-password', verificarToken, 
    validarConZod(cambioPasswordSchema), limitadorCambioPassword, putCambiarPassword );

// 9. DELETE /api/aunth/perfil/:id - elimnacion de cuenta
router.delete('/perfil/:id', verificarToken, deleteEliminarCuenta);


// 4. Exportar el router
export default router;