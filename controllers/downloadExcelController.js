const express = require('express');
const path = require('path');
const fs = require('fs');
const SftpClient = require('ssh2-sftp-client');
const multer = require('multer');
const { createProxyMiddleware } = require('http-proxy-middleware');

const router = express.Router();
const sftp = new SftpClient();

// Настройка хранения файлов
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
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
    throw error;  // Пробрасываем ошибку выше
  } finally {
    sftp.end();
  }
};

// Маршрут для загрузки файла на SFTP сервер через форму
router.post('/upload-file', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded.' });
  }

  const localFilePath = path.join(__dirname, '..', 'uploads', req.file.originalname);
  console.log(`Local file path: ${localFilePath}`); // Логирование пути

  // Путь на SFTP сервере
  const remoteFilePath = `/root/task_file/wait/${req.file.originalname}`;
  console.log(`Remote file path: ${remoteFilePath}`); // Логирование пути

  const serverInfo = {
    host: "31.128.44.48",
    port: 22,
    username: "root",
    password: "Arishka_2002!",
  };

  try {
    if (!fs.existsSync(localFilePath)) {
      return res.status(404).json({ success: false, message: `File not found at path: ${localFilePath}` });
    }

    await uploadFile(serverInfo, localFilePath, remoteFilePath);
    fs.unlinkSync(localFilePath);  // Удаляем файл после успешной загрузки
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

// Маршрут для загрузки файла на SFTP сервер по пути из внутреннего хранилища
router.post('/upload-from-local', async (req, res) => {
  const { filePath } = req.body;

  if (!filePath) {
    return res.status(400).json({ success: false, message: 'No file path provided.' });
  }

  // Преобразование относительного пути в абсолютный
  const absoluteFilePath = path.join(__dirname, '..', filePath);
  console.log(`Attempting to upload file from path: ${absoluteFilePath}`);

  const fileName = path.basename(absoluteFilePath);
  const remoteFilePath = `/root/task_file/wait/${fileName}`;

  const serverInfo = {
    host: "31.128.44.48",
    port: 22,
    username: "root",
    password: "Arishka_2002!",
  };

  try {
    if (!fs.existsSync(absoluteFilePath)) {
      return res.status(404).json({ success: false, message: `File not found at path: ${absoluteFilePath}` });
    }

    await uploadFile(serverInfo, absoluteFilePath, remoteFilePath);
    res.json({ success: true, message: `Файл ${fileName} успешно загружен на SFTP сервер.` });
  } catch (error) {
    console.error(`Ошибка при загрузке файла на SFTP сервер: ${error.message}`);
    res.status(500).json({
      success: false,
      message: `Ошибка при загрузке файла ${fileName} на SFTP сервер.`,
      error: error.message,
    });
  }
});

// Прокси для перенаправления запросов
router.use('/proxy', createProxyMiddleware({
  target: 'http://31.129.100.172:3005',
  changeOrigin: true,
  pathRewrite: {
    '^/proxy': '', // Перенаправляем путь /proxy на корень целевого сервера
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log(`Proxying request to: ${proxyReq.path}`);
  },
  onError: (err, req, res) => {
    console.error('Proxy error:', err);
    res.status(500).json({ success: false, message: 'Proxy error', error: err.message });
  }
}));

module.exports = router;
