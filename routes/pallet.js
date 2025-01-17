const express = require('express');
const router = express.Router();
const {
  getPalletsByTaskName,
  getArticlesByPalletNumber,
  resetWB, 
  resetOzon
} = require('../controllers/palletController'); // Убедитесь, что пути совпадают

// Маршрут для получения паллетов по названию задания
router.get('/pallets', getPalletsByTaskName);

// Маршрут для получения артикулов по номеру паллета
router.get('/pallets/articles', getArticlesByPalletNumber);
router.post('/resetWB', resetWB)
router.post('/resetOzon',resetOzon)
module.exports = router;
