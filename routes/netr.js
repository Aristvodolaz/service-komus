const express = require('express');
const { addItem } = require('../controllers/netrController');

const router = express.Router();

router.post('/add-item', addItem);

module.exports = router;
