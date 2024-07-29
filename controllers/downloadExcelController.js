const express = require('express');
const path = require('path');
const fs = require('fs');
const SftpClient = require('ssh2-sftp-client');
const multer = require('multer'); // Для обработки multipart/form-data

const router = express.Router();
const sftp = new SftpClient();

// Настройка хранения файлов
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // Папка для временного хранения загруженных файлов
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname); // Используем оригинальное имя файла
  }
});

const upload = multer({ storage: storage });

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
  // Проверяем, что файл был загружен
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded.' });
  }

  const localFilePath = path.join(__dirname, '..', 'uploads', req.file.originalname); // Путь к временно сохраненному файлу
  const remoteFilePath = `/root/task_file/wait/${req.file.originalname}`; // Путь для хранения файла на сервере SFTP

  const serverInfo = {
    host: "31.128.44.48",
    port: 22,
    username: "root",
    password: "Arishka_2002!",
  };

  try {
    await uploadFile(serverInfo, localFilePath, remoteFilePath);
    fs.unlinkSync(localFilePath); // Удаление временного файла после загрузки
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
