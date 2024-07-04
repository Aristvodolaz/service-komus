const axios = require('axios');
const fs = require('fs');
const path = require('path');

const filesListUrl = 'http://31.128.44.48/root/task_file/wait'; // Замените на URL списка файлов
const downloadDir = path.join(__dirname, '../downloads');

// Задаем значения для аутентификации
const auth = {
  username: 'root',
  password: 'Arishka_2002!',
};

// Функция для скачивания файла с сервера
const downloadFile = async (url, outputPath) => {
  const writer = fs.createWriteStream(outputPath);

  const config = {
    method: 'GET',
    url,
    responseType: 'stream',
    auth: {
      username: auth.username,
      password: auth.password,
    },
  };

  try {
    const response = await axios(config);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
  } catch (error) {
    console.error(`Ошибка при скачивании файла ${path.basename(url)}`, error);
    throw error;
  }
};

// Экспортируем функции для использования в роуте
module.exports = {
  downloadFile,
  auth,
  filesListUrl,
  downloadDir
};
