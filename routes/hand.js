const express = require('express');
const router = express.Router();
const controller = require('../controllers/handController');

// … ваши остальные роуты …

// GET /records-by-task?nazvanie_zadaniya=...
router.get('/records-by-task', controller.getTaskRecords);

module.exports = router;
