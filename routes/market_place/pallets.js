const express = require('express');
const router = express.Router();
const dataController = require('../../controllers/palletsController');

router.get('/', dataController.getPallets);

module.exports = router;
