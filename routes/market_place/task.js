const express = require('express');
const router = express.Router();
const dataController = require('../../controllers/taskTController');

router.get('/', dataController.getTask);

module.exports = router;
