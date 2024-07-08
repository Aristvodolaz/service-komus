const express = require('express');
const path = require('path');
const fs = require('fs');
const SftpClient = require('ssh2-sftp-client');
const xlsx = require('xlsx');
const mssql = require('mssql'); 
const {connectToDatabase, sql } = require('../dbConfig')

const router = express.Router();
const sftp = new SftpClient();


// Функция для скачивания файла с сервера SFTP
const downloadFile = async (serverInfo, remoteFilePath, localFilePath) => {
  try {
    await sftp.connect(serverInfo);
    await sftp.get(remoteFilePath, localFilePath);
    return localFilePath; // Возвращаем путь к локальному файлу
  } finally {
    sftp.end();
  }
};

// Функция для перемещения файла на сервере SFTP
const moveFile = async (serverInfo, oldPath, newPath) => {
  try {
    await sftp.connect(serverInfo);
    await sftp.rename(oldPath, newPath);
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

const insertDataToDB = async (data, fileName, dbConfig) => {
  const pool = await connectToDatabase(); // Подключение к базе данных

  try {
    const transaction = await pool.transaction();
    await transaction.begin();

    for (const item of data) {
      const request = transaction.request();

      const query = `
        INSERT INTO Test_MPP (Nazvanie_Zadaniya, Status, Artikul, Artikul_Syrya, Nomenklatura, Nazvanie_Tovara, SHK, SHK_SPO, SHK_SPO_1, Kol_vo_Syrya, Itog_Zakaz, Sht_v_MP, Itog_MP, SOH, Tip_Postavki, Srok_Godnosti, Op_1_Bl_1_Sht, Op_2_Bl_2_Sht, Op_3_Bl_3_Sht, Op_4_Bl_4_Sht, Op_5_Bl_5_Sht, Op_6_Blis_6_10_Sht, Op_7_Pereschyot, Op_9_Fasovka_Sborka, Op_10_Markirovka_SHT, Op_11_Markirovka_Prom, Op_12_Markirovka_Prom, Op_13_Markirovka_Fabr, Op_14_TU_1_Sht, Op_15_TU_2_Sht, Op_16_TU_3_5, Op_17_TU_6_8, Op_468_Proverka_SHK, Op_469_Spetsifikatsiya_TM, Op_470_Dop_Upakovka, Mesto, Vlozhennost, Pallet_No)
        VALUES (@Nazvanie_Zadaniya, @Status, @Artikul, @Artikul_Syrya, @Nomenklatura, @Nazvanie_Tovara, @SHK, @SHK_SPO, @SHK_SPO_1, @Kol_vo_Syrya, @Itog_Zakaz, @Sht_v_MP, @Itog_MP, @SOH, @Tip_Postavki, @Srok_Godnosti, @Op_1_Bl_1_Sht, @Op_2_Bl_2_Sht, @Op_3_Bl_3_Sht, @Op_4_Bl_4_Sht, @Op_5_Bl_5_Sht, @Op_6_Blis_6_10_Sht, @Op_7_Pereschyot, @Op_9_Fasovka_Sborka, @Op_10_Markirovka_SHT, @Op_11_Markirovka_Prom, @Op_12_Markirovka_Prom, @Op_13_Markirovka_Fabr, @Op_14_TU_1_Sht, @Op_15_TU_2_Sht, @Op_16_TU_3_5, @Op_17_TU_6_8, @Op_468_Proverka_SHK, @Op_469_Spetsifikatsiya_TM, @Op_470_Dop_Upakovka, @Mesto, @Vlozhennost, @Pallet_No)
      `;

      // Подготовка запроса для текущей записи
      request.input('Nazvanie_Zadaniya', mssql.NVarChar(255), fileName);
      request.input('Status', mssql.Int, 0);
      request.input('Artikul', mssql.Int, item['Артикул'])
      request.input('Artikul_Syrya', mssql.NVarChar(50), item['Артикул Сырья'].toString())
      request.input('Nomenklatura', mssql.Int, item['Номенклатура'])
      request.input('Nazvanie_Tovara', mssql.NVarChar(255), item['Название товара'])
      request.input('SHK', mssql.NVarChar(255), item['ШК'].toString()); // Преобразуйте SHK в строку
      request.input('SHK_SPO', mssql.NVarChar(255), item['ШК СПО'].toString()); // Преобразуйте SHK СПО в строку
      request.input('SHK_SPO_1', mssql.NVarChar(255), item['ШК СПО'].toString());
      request.input('Kol_vo_Syrya', mssql.Int, parseInt(item['Кол-во сырья'], 10));
      request.input('Itog_Zakaz', mssql.Int, item['Итог Заказ'])
      request.input('Sht_v_MP', mssql.Int, item['шт в мп'])
      request.input('Itog_MP', mssql.Int, item['итог мп'])
      request.input('SOH', mssql.NVarChar(10), item['СОХ'])
      request.input('Tip_Postavki', mssql.NVarChar(50), item['тип поставки'])
      request.input('Srok_Godnosti', mssql.NVarChar(50), item['Срок годности'])
      request.input('Op_1_Bl_1_Sht', mssql.NVarChar(10), item['Оп 1 бл. 1 шт'])
      request.input('Op_2_Bl_2_Sht', mssql.NVarChar(10), item['Оп 2 бл.2 шт'])
      request.input('Op_3_Bl_3_Sht', mssql.NVarChar(10), item['Оп 3 бл.3 шт'])
      request.input('Op_4_Bl_4_Sht', mssql.NVarChar(10), item['Оп 4 бл.4шт'])
      request.input('Op_5_Bl_5_Sht', mssql.NVarChar(10), item['Оп 5 бл.5 шт'])
      request.input('Op_6_Blis_6_10_Sht', mssql.NVarChar(10), item['Оп 6 блис.6-10шт'])
      request.input('Op_7_Pereschyot', mssql.NVarChar(10), item['Оп 7 пересчет'])
      request.input('Op_9_Fasovka_Sborka', mssql.NVarChar(10), item['Оп 9 фасовка/сборка'])
      request.input('Op_10_Markirovka_SHT', mssql.NVarChar(10), item['Оп 10 Маркировка ШТ'])
      request.input('Op_11_Markirovka_Prom', mssql.NVarChar(10), item['Оп 11 маркировка пром'])
      request.input('Op_12_Markirovka_Prom', mssql.NVarChar(10), item['Оп 11 маркировка пром'])
      request.input('Op_13_Markirovka_Fabr', mssql.NVarChar(10), item['Оп 13 маркировка фабр'])
      request.input('Op_14_TU_1_Sht', mssql.NVarChar(10), item['Оп 14 ТУ 1шт'])
      request.input('Op_15_TU_2_Sht', mssql.NVarChar(10), item['Оп 15 ТУ 2 шт'])
      request.input('Op_16_TU_3_5', mssql.NVarChar(10), item['Оп 16 ТУ 3-5'])
      request.input('Op_17_TU_6_8', mssql.NVarChar(10), item['Оп 17 ТУ 6-8'])
      request.input('Op_468_Proverka_SHK', mssql.NVarChar(10), item['Оп 468 проверка ШК'])
      request.input('Op_469_Spetsifikatsiya_TM', mssql.NVarChar(10), item['Оп 469 Спецификация ТМ'])
      request.input('Op_470_Dop_Upakovka', mssql.NVarChar(10), item['Оп 470 доп упаковка'])
      request.input('Mesto', mssql.NVarChar(50), item['Место'])
      request.input('Vlozhennost', mssql.NVarChar(50), item['Вложенность '])
      request.input('Pallet_No', mssql.NVarChar(50), item['Паллет №'])

      await request.query(query);
    }

    await transaction.commit();
    console.log('Данные успешно добавлены в базу данных');
  } catch (error) {
    console.error('Ошибка при вставке данных в БД:', error.originalError ? error.originalError.message : error.message);
    throw error;
  }
};



// Функция для получения списка файлов
const listFiles = async (serverInfo, remoteDirectory) => {
  try {
    await sftp.connect(serverInfo);
    const fileList = await sftp.list(remoteDirectory);
    await sftp.end();
    return fileList.map(file => file.name);
  } catch (error) {
    console.error('Ошибка при получении списка файлов:', error);
    throw error;
  }
};

// Маршрут для получения списка файлов
router.get('/list-files', async (req, res) => {
  const { host, port, username, password } = req.query;
  const remoteDirectory = '/root/task_file/wait'; // Укажите нужную директорию

  const serverInfo = {
    host,
    port: parseInt(port, 10),
    username,
    password,
  };

  try {
    const files = await listFiles(serverInfo, remoteDirectory);
    res.json({ directory: remoteDirectory, files });
  } catch (error) {
    console.error('Ошибка при получении списка файлов:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении списка файлов',
      error: error.message,
    });
  }
});

// Маршрут для скачивания, преобразования и вставки данных в БД, а также перемещения файла
router.post('/process-excel', async (req, res) => {
  const { fileName, host, port, username, password } = req.body;
  const remoteFilePath = `/root/task_file/wait/${fileName}`; // Путь к файлу на сервере SFTP
  console.log(remoteFilePath);
  const localFilePath = path.join(__dirname, '..', 'downloads', fileName); // Локальный путь для сохранения файла
  const newRemoteFilePath = `/root/task_file/work/${fileName}`; // Новый путь для перемещения файла

  const serverInfo = {
    host,
    port: parseInt(port, 10),
    username,
    password,
  };

  try {
    // Подключение к базе данных
    await connectToDatabase();

    // Скачивание файла с сервера SFTP
    await downloadFile(serverInfo, remoteFilePath, localFilePath);
    console.log(`Файл ${fileName} успешно скачан и сохранен.`);

    // Преобразование Excel файла в JSON
    const jsonData = readExcelToJson(localFilePath);
    console.log('Содержимое файла в формате JSON:');
    console.log(jsonData);

    // Вставка данных в БД
    await insertDataToDB(jsonData, fileName);
    console.log('Данные успешно вставлены в БД.');

    // Перемещение файла на сервере SFTP
    await moveFile(serverInfo, remoteFilePath, newRemoteFilePath);
    console.log(`Файл ${fileName} успешно перемещен в ${newRemoteFilePath}.`);

    // Отправка успешного ответа клиенту
    res.json({ success: true, message: `Файл ${fileName} успешно обработан и данные вставлены в БД.` });
  } catch (error) {
    console.error(`Ошибка при скачивании и обработке файла ${fileName}:`, error);
    res.status(500).json({
      success: false,
      message: `Ошибка при загрузке и обработке файла ${fileName}`,
      error: error.message,
    });
  }
});

module.exports = router;
