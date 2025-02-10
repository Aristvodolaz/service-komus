const express = require('express');
const { 
    addItem, 
    getAcceptedQuantity, 
    updateItem, 
    getItemsByNazvanieZdaniya,
    getPalletToShkWpsMapping 
} = require('../controllers/netrController');

const router = express.Router();

// Добавление нового элемента
router.post('/addItemNetr', addItem);

// Получение принятого количества
router.get('/prinyato', getAcceptedQuantity);

// Обновление данных (mesto, vlozhennost, pallet) по ID
router.put('/updateItemNetr', updateItem);

// Получение списка всех записей по названию задания
router.get('/itemsByTask', getItemsByNazvanieZdaniya);

// Получение связки pallet - shk_wps по названию задания
router.get('/palletToShkWps', getPalletToShkWpsMapping);

module.exports = router;
