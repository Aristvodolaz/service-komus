const express = require('express');
const router = express.Router();
const dataController = require('../controllers/dataController');

router.get('/', dataController.getDataTest);
router.post('/', dataController.createData);

module.exports = router;
