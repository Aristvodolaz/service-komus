const express = require('express');
const router = express.Router();
const dataController = require('../controllers/reasonController');

router.get('/', dataController.getDataReason);

module.exports = router;
