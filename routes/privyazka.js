const express = require('express');
const router = express.Router();
const dataController = require('../controllers/privyazkaController');

router.post('/add', dataController.addZapis);
router.get('/getZapis', dataController.getZapis)
router.post('/addSrokGodnosti', dataController.addSrokGodnosti)
router.post('/endStatus', dataController.endZapis)
router.get('/getData', dataController.getAllByNazvanieZadaniya)
router.put('/updateInfo', dataController.updatePalletAndKolvo)
router.get('/sklads', dataController.getSklads)

module.exports = router;
