import { Router } from 'express';
import { searchIA, infoDestino, detallesLugar } from '../controllers/aiController.js';

const router = Router();

router.post('/busquedaIA', searchIA);
router.post('/infoDestino', infoDestino);
router.post('/detallesLugar', detallesLugar);

export default router;