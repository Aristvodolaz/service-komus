const express = require('express');
const router = express.Router();
const dataController = require('../../controllers/articleController');

router.get('/', dataController.searchBySHKOrArticul);


module.exports = router;
