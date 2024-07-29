const express = require('express');
const router = express.Router();
const dataController = require('../controllers/testController');

router.get('/update', dataController.updateSrokGodnosti);
// router.post('/', dataController.createDataTest);

module.exports = router;
