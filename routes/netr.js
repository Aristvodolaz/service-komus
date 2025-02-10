const express = require('express');
const { addItem } = require('../controllers/netrController');

const router = express.Router();

router.post('/addItemNetr', addItem);

module.exports = router;
