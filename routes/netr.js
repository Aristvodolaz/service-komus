const express = require('express');
const { 
    addItem, 
    getAcceptedQuantity, 
    updateItem, 
    getItemsByNazvanieZdaniya,
    getPalletToShkWpsMapping,
    uploadData,
    downloadData,
    distinctName,
    uploadWPS,
    getListVp,
    deleteRecordsByArtikul
} = require('../controllers/netrController');

const router = express.Router();

// Добавление нового элемента
router.post('/addItemNetr', addItem);

router.post('/uploadData', uploadData);
router.post('/uploadWPS', uploadWPS);
router.get('/downloadData', downloadData);
router.get('/distinctName', distinctName);
router.get('/getListVp', getListVp);
// Получение принятого количества
router.get('/prinyato', getAcceptedQuantity);

// Обновление данных (mesto, vlozhennost, pallet) по ID
router.put('/updateItemNetr', updateItem);

// Получение списка всех записей по названию задания
router.get('/itemsByTask', getItemsByNazvanieZdaniya);

// Получение связки pallet - shk_wps по названию задания
router.get('/palletToShkWps', getPalletToShkWpsMapping);

// Удаление записей по артикулу и названию задания
router.post('/deleteByArtikul', deleteRecordsByArtikul);

module.exports = router;
