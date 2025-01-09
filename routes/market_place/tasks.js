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
router.post('/setStatus', dataController.updateStatusTaskAndArticul)
router.get('/getInfoWPS', dataController.getRecordsBySHKWPS)
router.put('/updateShkStat', dataController.updateRecordsBySHKWPS)
router.post('/createShkWPS', dataController.updateSHKWPS)
router.post('/sendInformation', dataController.updatePalletInfoBySHKWPS)
router.post('/updateStatusForID', dataController.setStatusNew)
router.get('/getInfoByWPS', dataController.getRecordsByWPS)
router.get('/getLDU', dataController.getLDUBySHK)
router.get('/getDataWithStatus', dataController.getTaskByStatus)
router.post('/cancel', dataController.addTaskStatus)
router.delete('/deleteRecordByWB', dataController.deleteRecordsByWB)
router.post('/updateTasksNew', dataController.updateRecordsBySHKWPSNEW)
router.put('/deleteRecordByOzon', dataController.deleteRecordByOzon)
router.post('/resetWB', dataController.resetWB)
router.post('/resetOzon', dataController.resetOzon)
module.exports = router;
