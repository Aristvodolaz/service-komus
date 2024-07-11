const express = require('express');
const router = express.Router();
const exportController = require('../controllers/exportController');

// Роут для сборки Excel файла и загрузки его на сервер по названию задания
router.get('/export-excel', exportController.exportExcel);

module.exports = router;
