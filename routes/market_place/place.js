const express = require('express');
const router = express.Router();
const dataController = require('../../controllers/placeController');

router.get('/', dataController.getPlace);

module.exports = router;
