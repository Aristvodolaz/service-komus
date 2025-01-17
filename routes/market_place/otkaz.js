const express = require('express');
const router = express.Router();
const dataController = require('../../controllers/otkazController');

router.post('/', dataController.setFactSize);
router.get('/getSum', dataController.getQtyOrderedSum)
router.post('/addTaskData', dataController.addTaskData);
router.get('/getTransferData', dataController.getTransferNumsData);

module.exports = router;
