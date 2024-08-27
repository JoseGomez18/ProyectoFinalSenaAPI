// import { Router } from 'express';
// import { searchIA, infoDestino, detallesLugar } from '../controllers/aiController.js';


const express = require('express');
const { searchIA, infoDestino, detallesLugar } = require('../controllers/aiController.js');

const router = express.Router();

// const router = Router();

router.post('/busquedaIA', searchIA);
router.post('/infoDestino', infoDestino);
router.post('/detallesLugar', detallesLugar);

// export default router;
module.exports = router;