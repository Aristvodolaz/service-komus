const express = require('express');
const router = express.Router();
const dataController = require('../../controllers/otkazController');

router.post('/', dataController.setFactSize);
router.get('/getSum', dataController.getQtyOrderedSum)
router.post('/addTaskData', dataController.addOrUpdateTaskData);
router.get('/getTransferData', dataController.getTransferNumsData);
router.post('/addRecordForOzon', dataController.addRecordForOzon)
router.post('/addRecordForWB', dataController.addRecordForWB)

module.exports = router;
