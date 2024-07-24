const express = require('express');
const router = express.Router();
const dataController = require('../controllers/testController');

router.get('/', dataController.testConnection);
// router.post('/', dataController.createDataTest);

module.exports = router;
