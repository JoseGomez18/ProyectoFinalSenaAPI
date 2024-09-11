import { Router } from 'express';
import { searchIA, infoDestino, detallesLugar, detallesCard, lugaresPorIds } from '../controllers/aiController.js';
import { register, login } from '../controllers/loginController.js';
import hashMiddleware from '../middleware/hashMiddleware.js'

const router = Router();

router.post('/busquedaIA', searchIA);
router.post('/infoDestino', infoDestino);
router.post('/detallesLugar', detallesLugar);
router.post('/detallesCard', detallesCard);
router.post('/lugaresPorIds', lugaresPorIds);
router.post('/registro', hashMiddleware, register);
router.post('/login', login);

export default router;