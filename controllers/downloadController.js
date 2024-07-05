const express = require('express');
const path = require('path');
const fs = require('fs');
const SftpClient = require('ssh2-sftp-client');
const xlsx = require('xlsx');

const router = express.Router();
const sftp = new SftpClient();

// Функция для скачивания файла с сервера SFTP
const downloadFile = async (serverInfo, remoteFilePath, localFilePath) => {
  try {
    await sftp.connect(serverInfo);

    // Скачиваем файл и сохраняем его локально
    await sftp.get(remoteFilePath, localFilePath);

    return localFilePath; // Возвращаем путь к локальному файлу
  } finally {
    sftp.end();
  }
};

// Функция для чтения Excel файла и преобразования его в JSON с включением пустых строк
const readExcelToJson = (filePath) => {
  try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Преобразование листа в JSON с включением пустых строк
    const jsonData = xlsx.utils.sheet_to_json(worksheet, { raw: true, defval: null });
    return jsonData;
  } catch (error) {
    console.error(`Ошибка при чтении Excel файла ${path.basename(filePath)}`, error);
    throw error;
  }
};

// Функция для получения списка файлов в директории и её поддиректориях
const listFiles = async (serverInfo, remoteDir) => {
  try {
    await sftp.connect(serverInfo);
    const files = await sftp.list(remoteDir);

    const fileTree = {};

    for (const file of files) {
      if (file.type === 'd') {
        fileTree[file.name] = await listFiles(serverInfo, path.join(remoteDir, file.name));
      } else {
        if (!fileTree[remoteDir]) {
          fileTree[remoteDir] = [];
        }
        fileTree[remoteDir].push(file.name);
      }
    }

    return fileTree;
  } finally {
    sftp.end();
  }
};

// Маршрут для скачивания и преобразования файла
router.post('/download-excel', async (req, res) => {
  const { fileName, host, port, username, password } = req.body;
  const remoteFilePath = `/root/task_file/wait/${fileName}`; // Путь к файлу на сервере SFTP
  const localFilePath = path.join(__dirname, '..', 'downloads', fileName); // Локальный путь для сохранения файла

  const serverInfo = {
    host,
    port: parseInt(port, 10),
    username,
    password,
  };

  try {
    // Скачивание файла с сервера SFTP
    await downloadFile(serverInfo, remoteFilePath, localFilePath);
    console.log(`Файл ${fileName} успешно скачан и сохранен.`);

    // Преобразование Excel файла в JSON
    const jsonData = readExcelToJson(localFilePath);
    console.log('Содержимое файла в формате JSON:');
    console.log(jsonData);

    // Отправка JSON клиенту
    res.json(jsonData);
  } catch (error) {
    console.error(`Ошибка при скачивании и обработке файла ${fileName}:`, error);
    res.status(500).json({
      success: false,
      message: `Ошибка при загрузке и обработке файла ${fileName}`,
      error: error.message,
    });
  }
});

// Маршрут для получения списка файлов
router.post('/list-files', async (req, res) => {
  const { host, port, username, password } = req.body;
  const remoteDir = '/root/task_file/wait'; // Директория на сервере SFTP

  const serverInfo = {
    host,
    port: parseInt(port, 10),
    username,
    password,
  };

  try {
    // Получение списка файлов с сервера SFTP
    const files = await listFiles(serverInfo, remoteDir);
    console.log('Список файлов:');
    console.log(files);

    // Отправка списка файлов клиенту
    res.json(files);
  } catch (error) {
    console.error('Ошибка при получении списка файлов:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении списка файлов',
      error: error.message,
    });
  }
});

module.exports = router;
