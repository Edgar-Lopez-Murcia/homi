// routes/likes.routes.js
import express from 'express';
import verificarToken from '../middleware/auth.js';
import { limitadorLikes } from '../middleware/limitadorPeticiones.js';

import { 
    likeProperty, 
    unlikeProperty, 
    getMyLikedProperties 
} from '../controllers/likes.controller.js';

const router = express.Router();


// RUTAS

// GET — Ver todos mis inmuebles favoritos
router.get('/my-likes', verificarToken, getMyLikedProperties);

// POST — Dar like a un inmueble
router.post('/:propertyId/like', verificarToken, limitadorLikes, likeProperty);

// DELETE — Quitar like a un inmueble
router.delete('/:propertyId/unlike', verificarToken, limitadorLikes, unlikeProperty);

export default router;