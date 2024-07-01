const express = require('express');
const router = express.Router();
const dataController = require('../../controllers/tasksController');

router.get('/', dataController.getTasks);

module.exports = router;
