const express = require('express');
const router = express.Router();
const dataController = require('../../controllers/tasksController');

router.get('/', dataController.getArticulsByTaskNumber);
router.get('/names', dataController.getUniqueTaskNames);
router.get('/searchShk', dataController.getByShk); 
router.put('/updateStatus', dataController.updateStatus);
router.get('/serchArticulTask', dataController.getRecordsByArticul)
router.post('/updateTasks', dataController.updateValues)
router.post('/duplicate', dataController.duplicateRecord)
router.post('/recordNewShk', dataController.updateSHKByTaskAndArticul)
router.put('/endStatus', dataController.endStatus);

module.exports = router;
