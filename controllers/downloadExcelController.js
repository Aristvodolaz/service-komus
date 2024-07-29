const express = require('express');
const path = require('path');
const fs = require('fs');
const SftpClient = require('ssh2-sftp-client');
const multer = require('multer'); // Для обработки multipart/form-data
const { connectToDatabase } = require('../dbConfig'); // Подключение к базе данных

const router = express.Router();
const sftp = new SftpClient();
const upload = multer({ dest: 'uploads/' }); // Папка для временного хранения загруженных файлов

// Функция для загрузки файла на сервер SFTP
const uploadFile = async (serverInfo, localFilePath, remoteFilePath) => {
  try {
    await sftp.connect(serverInfo);
    await sftp.put(localFilePath, remoteFilePath);
    console.log(`Файл ${localFilePath} успешно загружен на ${remoteFilePath}`);
  } catch (error) {
    console.error(`Ошибка при загрузке файла на SFTP: ${error.message}`);
    throw error;
  } finally {
    sftp.end();
  }
};

// Маршрут для загрузки файла на SFTP сервер
router.post('/upload-file', upload.single('file'), async (req, res) => {
  const { host, port, username, password } = req.body;
  const localFilePath = req.file.path; // Путь к временно сохраненному файлу
  const remoteFilePath = `/root/task_file/wait/${req.file.originalname}`; // Путь для хранения файла на сервере SFTP

  const serverInfo = {
    host,
    port: parseInt(port, 10),
    username,
    password,
  };

  try {
    // Загрузка файла на сервер SFTP
    await uploadFile(serverInfo, localFilePath, remoteFilePath);
    
    // Удаление временного файла после загрузки
    fs.unlinkSync(localFilePath);

    // Отправка успешного ответа клиенту
    res.json({ success: true, message: `Файл ${req.file.originalname} успешно загружен на SFTP сервер.` });
  } catch (error) {
    console.error(`Ошибка при загрузке файла на SFTP сервер: ${error.message}`);
    res.status(500).json({
      success: false,
      message: `Ошибка при загрузке файла ${req.file.originalname} на SFTP сервер.`,
      error: error.message,
    });
  }
});

module.exports = router;
