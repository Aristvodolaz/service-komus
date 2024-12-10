const express = require('express');
const router = express.Router();
const {
  getPalletsByTaskName,
  getArticlesByPalletNumber,
} = require('../controllers/palletController'); // Убедитесь, что пути совпадают

// Маршрут для получения паллетов по названию задания
router.get('/pallets', getPalletsByTaskName);

// Маршрут для получения артикулов по номеру паллета
router.get('/pallets/articles', getArticlesByPalletNumber);

module.exports = router;
