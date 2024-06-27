const express = require('express');
const router = express.Router();
const dataController = require('../../controllers/placesController');

router.get('/', dataController.getPlaces);

module.exports = router;
