// routes/comments.routes.js
import express from 'express';
import Comments from '../models/Comments.js';

import verificarToken from '../middleware/auth.js';
import verificarAdmin from '../middleware/admin.js';
import verificarUsuario from '../middleware/usuario.js';
import verificarDuenio from '../middleware/verificarDuenio.js';

import { validarSchema } from '../utils/modelValidation.js';
import { 
    comentarioSchema, 
    editarComentarioSchema,
    cambiarEstadoSchema, 
    respuestaPropietarioSchema 
} from '../validators/comments.validator.js';

import {
    createComment,
    getCommentsByProperty,
    getAverageScore,
    replyToComment,
    updateComment,
    changeCommentStatus,
    deleteComment,
    toggleLike
} from '../controllers/comments.controller.js';

const router = express.Router();

// =========================================================
// RUTAS ESTÁTICAS / ESPECÍFICAS (SIEMPRE PRIMERO)
// =========================================================

router.post('/propiedad/:id', verificarToken, verificarUsuario, validarSchema(comentarioSchema), createComment);

router.patch('/reseña/:id/propietario', 
    verificarToken, 
    validarSchema(respuestaPropietarioSchema), 
    replyToComment
);

router.patch('/reseña/:id/estado', 
    verificarToken, 
    verificarAdmin, 
    validarSchema(cambiarEstadoSchema), 
    changeCommentStatus
);

router.patch('/reseña/:id', 
    verificarToken, 
    verificarDuenio(Comments, 'usuarioComentario', 'propiedad'), 
    validarSchema(editarComentarioSchema),
    updateComment
);

router.delete('/reseña/:id', 
    verificarToken, 
    verificarDuenio(Comments, 'usuarioComentario', 'propiedad'), 
    deleteComment
);

router.post('/:reseñaId/like', verificarToken, toggleLike);

router.get('/:propiedadId/promedio', getAverageScore);


// =========================================================
// RUTAS DINÁMICAS (AL FINAL)
// =========================================================

router.get('/:propiedadId', getCommentsByProperty);

export default router;