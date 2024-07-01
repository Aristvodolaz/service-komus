const express = require('express');
const router = express.Router();
const dataController = require('../../controllers/palletTController');

router.get('/', dataController.getPallet_t);

module.exports = router;
