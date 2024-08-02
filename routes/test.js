const express = require('express');
const router = express.Router();
const dataController = require('../controllers/testController');

router.post('/update', dataController.updateSrokGodnosti);
// router.post('/', dataController.createDataTest);

module.exports = router;
