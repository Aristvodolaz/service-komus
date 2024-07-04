const express = require('express');
const router = express.Router();
const dataController = require('../../controllers/filesController');

router.get('/', dataController.getAllDownloadedFiles);
router.post('/', dataController.checkAndLoadNewFiles);

module.exports = router;
