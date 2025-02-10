const express = require('express');
const { addItem, getAcceptedQuantity  } = require('../controllers/netrController');

const router = express.Router();

router.post('/addItemNetr', addItem);
router.get('/prinyato', getAcceptedQuantity)

module.exports = router;
