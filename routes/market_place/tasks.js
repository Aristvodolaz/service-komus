const express = require('express');
const router = express.Router();
const dataController = require('../../controllers/tasksController');

router.get('/', dataController.getArticulsByTaskNumber);
router.get('/names', dataController.getUniqueTaskNames);

module.exports = router;
