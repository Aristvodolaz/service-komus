const express = require('express');
const router = express.Router();
const dataController = require('../controllers/srokController');

router.post('/update', dataController.updateSrokGodnosti);

module.exports = router;
