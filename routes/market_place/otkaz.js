const express = require('express');
const router = express.Router();
const dataController = require('../../controllers/otkazController');

router.post('/', dataController.setFactSize);