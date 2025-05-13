const express = require('express');
const router = express.Router();
const { searchTasksByName, deleteTasksByName } = require('../controllers/taskNameController');

// Поиск задач по названию
router.get('/search', searchTasksByName);

// Удаление задач по названию
router.delete('/delete', deleteTasksByName);

module.exports = router; 