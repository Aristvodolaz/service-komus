const express = require('express');
const router = express.Router();
const dataController = require('../controllers/srokController');

router.post('/update', dataController.updateSrokGodnosti);
router.post('/updateNew', dataController.updateSrokGodnostiNew);
module.exports = router;
