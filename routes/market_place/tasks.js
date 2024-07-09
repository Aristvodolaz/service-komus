const express = require('express');
const router = express.Router();
const dataController = require('../../controllers/tasksController');

router.get('/', dataController.getArticulsByTaskNumber);
router.get('/names', dataController.getUniqueTaskNames);
router.get('/searchShk', dataController.getByShk); 
router.put('/updateStatus', dataController.updateStatus);
router.get('/serchArticulTask', dataController.getRecordsByArticul)
module.exports = router;
