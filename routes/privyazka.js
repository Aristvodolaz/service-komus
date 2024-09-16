const express = require('express');
const router = express.Router();
const dataController = require('../controllers/privyazkaController');

router.post('/add', dataController.addZapis);
router.get('/getZapis', dataController.getZapis)
router.post('/addSrokGodnosti', dataController.addSrokGodnosti)

module.exports = router;
