const express = require('express');
const router = express.Router();
const updateController = require('../controllers/srokController');

// Роут для обновления данных в указанных колонках
router.post('/update', updateController.updateSrokGodnosti);

module.exports = router;
