const express = require('express');
const router = express.Router();
const updateController = require('../controllers/finishController');

// Роут для обновления данных в указанных колонках
router.post('/update', updateController.updateData);
router.post('/updateNew', updateController.updateDataNew);

module.exports = router;
