const express = require('express');
const router = express.Router();
const dataController = require('../../controllers/newTaskController');


router.put('/getWork', dataController.updateStatusNew);
router.put('/duplicate', dataController.duplicateRecordNew);
router.get('/getLdu', dataController.getLDUNew);
router.put('/updateShkWps', dataController.updateSHKWPSNew);
router.put('/updateShk', dataController.updateSHKNew);
router.post('/updateLdu', dataController.updateLduNEW)
router.get('/checkOrderCompletionWB', dataController.checkOrderCompletion)
router.get('/checkOrderCompletionOzon', dataController.checkOrderCompletionOzon)
router.get('/checkOrderCompletionWBBox', dataController.checkOrderCompletionForBox)
router.post('/closeTask', dataController.addTaskStatusExitNew);
router.post('/sendEndData', dataController.endStatusNew)
module.exports = router;
