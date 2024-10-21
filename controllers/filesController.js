const axios = require('axios');
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const logger = require('../utils/logger');
const {connectToDatabase, sql } = require('../dbConfig')

const filesListUrl = 'http://31.128.44.48/root/task_file/wait'; // замените на URL списка файлов
const downloadDir = path.join(__dirname, '../downloads');

// Создание директории для загрузки файлов, если она не существует
if (!fs.existsSync(downloadDir)) {
  fs.mkdirSync(downloadDir);
}

// Функция для скачивания файла
const downloadFile = async (url, outputPath) => {
  const writer = fs.createWriteStream(outputPath);

  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream',
  });

  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
};

// Функция для обработки и загрузки Excel файла в базу данных
const processAndLoadFile = async (filePath) => {
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  let data = xlsx.utils.sheet_to_json(worksheet);

  // Добавление двух новых колонок
  data = data.map(row => ({
    ...row,
    newColumn1: 'значение1', // замените на реальное значение
    newColumn2: 'значение2'  // замените на реальное значение
  }));

  await loadToDatabase(data);
};

// Функция для загрузки данных в базу данных
const loadToDatabase = async (data) => {
  let pool = await connectToDatabase();
  const table = new sql.Table('tableName'); // замените на ваше название таблицы
  table.create = false;

  // Определите столбцы таблицы
  table.columns.add('column1', sql.NVarChar(255), { nullable: true });
  table.columns.add('column2', sql.NVarChar(255), { nullable: true });
  table.columns.add('newColumn1', sql.NVarChar(255), { nullable: true });
  table.columns.add('newColumn2', sql.NVarChar(255), { nullable: true });

  // Добавление строк в таблицу
  data.forEach(row => {
    table.rows.add(row.column1, row.column2, row.newColumn1, row.newColumn2);
  });

  const request = new sql.Request(pool);
  try {
    await request.bulk(table);
    logger.info('Data loaded to database successfully');
  } catch (error) {
    logger.error('Error loading data to database', { error });
    throw error;
  }
};

// Функция для проверки и загрузки новых файлов
const checkAndLoadNewFiles = async (req, res) => {
  try {
    // Получение списка файлов
    const response = await axios.get(filesListUrl);
    const filesList = response.data; // Предполагается, что это массив объектов с полем 'url'

    for (const file of filesList) {
      const fileName = path.basename(file.url);
      const outputFilePath = path.join(downloadDir, fileName);

      // Проверка, если файл уже был обработан
      if (fs.existsSync(outputFilePath)) {
        logger.info(`File ${fileName} already exists, skipping.`);
        continue;
      }

      // Скачивание и обработка нового файла
      await downloadFile(file.url, outputFilePath);
      logger.info(`File ${fileName} downloaded successfully`);

      await processAndLoadFile(outputFilePath);
      logger.info(`File ${fileName} processed and loaded successfully`);
    }

    res.status(200).send('Files checked and updated successfully');
  } catch (error) {
    logger.error('Error checking and loading new files', { error });
    res.status(500).json({
      success: false,
      message: "Ошибка работы сервера",
      errorCode: 500
    });
  }
};

// Функция для получения списка всех загруженных файлов
const getAllDownloadedFiles = (req, res) => {
  try {
    const files = fs.readdirSync(downloadDir);
    res.status(200).json(files);
  } catch (error) {
    logger.error('Error retrieving downloaded files', { error });
    res.status(500).json({
      success: false,
      message: "Ошибка работы сервера",
      errorCode: 500
    });
  }
};

// Экспорт функций контроллера
module.exports = {
  checkAndLoadNewFiles,
  getAllDownloadedFiles
};
