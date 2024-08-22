const express = require('express');
const path = require('path');
const fs = require('fs');
const SftpClient = require('ssh2-sftp-client');
const xlsx = require('xlsx');
const mssql = require('mssql'); 
const { connectToDatabase, sql } = require('../dbConfig');

const router = express.Router();
const sftp = new SftpClient();

// Функция для подключения к SFTP-серверу
const connectToSftp = async (serverInfo) => {
  try {
    await sftp.connect(serverInfo);
  } catch (error) {
    console.error('Ошибка подключения к SFTP:', error);
    throw error;
  }
};

// Функция для скачивания файла с сервера SFTP
const downloadFile = async (remoteFilePath, localFilePath) => {
  try {
    await sftp.get(remoteFilePath, localFilePath);
    return localFilePath; // Возвращаем путь к локальному файлу
  } catch (error) {
    console.error('Ошибка скачивания файла:', error);
    throw error;
  }
};

// Функция для перемещения файла на сервере SFTP
const moveFile = async (oldPath, newPath) => {
  try {
    await sftp.rename(oldPath, newPath);
  } catch (error) {
    console.error('Ошибка перемещения файла:', error);
    throw error;
  }
};

// Функция для чтения Excel файла и преобразования его в JSON с включением пустых строк
const readExcelToJson = (filePath) => {
  try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    return xlsx.utils.sheet_to_json(worksheet, { raw: true, defval: null });
  } catch (error) {
    console.error(`Ошибка при чтении Excel файла ${path.basename(filePath)}`, error);
    throw error;
  }
};

const insertDataToDB = async (data, fileName, pref) => {
  const pool = await connectToDatabase(); // Подключение к базе данных
  const transaction = await pool.transaction();
  await transaction.begin();

  try {
    for (const item of data) {
      // Проверка значения поля 'Artikul_Syrya'
      if (item['Артикул Сырья']?.toString().trim().toUpperCase() === 'НЕ ПРИМУТ') {
        continue; // Пропуск записи
      }

      const request = transaction.request();
      const query = `
        INSERT INTO Test_MP (Pref, Nazvanie_Zadaniya, Status_Zadaniya, Status, Ispolnitel, Artikul, Artikul_Syrya, Nomenklatura, Nazvanie_Tovara, SHK, SHK_SPO, SHK_SPO_1, Kol_vo_Syrya, Itog_Zakaz, Sht_v_MP, Itog_MP, SOH, Tip_Postavki, Srok_Godnosti, Op_1_Bl_1_Sht, Op_2_Bl_2_Sht, Op_3_Bl_3_Sht, Op_4_Bl_4_Sht, Op_5_Bl_5_Sht, Op_6_Blis_6_10_Sht, Op_7_Pereschyot, Op_9_Fasovka_Sborka, Op_10_Markirovka_SHT, Op_11_Markirovka_Prom, Op_12_Markirovka_Prom, Op_13_Markirovka_Fabr, Op_14_TU_1_Sht, Op_15_TU_2_Sht, Op_16_TU_3_5, Op_17_TU_6_8, Op_468_Proverka_SHK, Op_469_Spetsifikatsiya_TM, Op_470_Dop_Upakovka, Mesto, Vlozhennost, Pallet_No, Time_Start, Time_Middle, Time_End, Persent)
        VALUES (@Pref, @Nazvanie_Zadaniya, @Status_Zadaniya, @Status, @Ispolnitel, @Artikul, @Artikul_Syrya, @Nomenklatura, @Nazvanie_Tovara, @SHK, @SHK_SPO, @SHK_SPO_1, @Kol_vo_Syrya, @Itog_Zakaz, @Sht_v_MP, @Itog_MP, @SOH, @Tip_Postavki, @Srok_Godnosti, @Op_1_Bl_1_Sht, @Op_2_Bl_2_Sht, @Op_3_Bl_3_Sht, @Op_4_Bl_4_Sht, @Op_5_Bl_5_Sht, @Op_6_Blis_6_10_Sht, @Op_7_Pereschyot, @Op_9_Fasovka_Sborka, @Op_10_Markirovka_SHT, @Op_11_Markirovka_Prom, @Op_12_Markirovka_Prom, @Op_13_Markirovka_Fabr, @Op_14_TU_1_Sht, @Op_15_TU_2_Sht, @Op_16_TU_3_5, @Op_17_TU_6_8, @Op_468_Proverka_SHK, @Op_469_Spetsifikatsiya_TM, @Op_470_Dop_Upakovka, @Mesto, @Vlozhennost, @Pallet_No, @Time_Start, @Time_Middle, @Time_End, @Persent)
      `;

      // Подготовка запроса для текущей записи
      Object.keys(item).forEach(key => {
        request.input(key, sql.NVarChar, item[key]?.toString() || null);
      });

      await request.query(query);
    }

    await transaction.commit();
    console.log('Данные успешно добавлены в базу данных');
  } catch (error) {
    console.error('Ошибка при вставке данных в БД:', error);
    await transaction.rollback();
    throw error;
  }
};

// Функция для получения списка файлов
const listFiles = async (remoteDirectory) => {
  try {
    const fileList = await sftp.list(remoteDirectory);
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
    await connectToSftp(serverInfo);
    const files = await listFiles(remoteDirectory);
    res.json({ directory: remoteDirectory, files });
  } catch (error) {
    console.error('Ошибка при получении списка файлов:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении списка файлов',
      error: error.message,
    });
  } finally {
    sftp.end();
  }
});

// Маршрут для скачивания, преобразования и вставки данных в БД, а также перемещения файла
router.post('/process-excel', async (req, res) => {
  const { fileName, host, port, username, password } = req.body;

  const pref = fileName.split(' ')[0];  // Разделение строки по пробелу и выбор первого элемента
  const remoteFilePath = `/root/task_file/wait/${fileName}`; // Путь к файлу на сервере SFTP
  const localFilePath = path.join(__dirname, '..', 'downloads', fileName); // Локальный путь для сохранения файла
  const newRemoteFilePath = `/root/task_file/work/${fileName}`; // Новый путь для перемещения файла

  const serverInfo = {
    host,
    port: parseInt(port, 10),
    username,
    password,
  };

  try {
    await connectToSftp(serverInfo);

    // Скачивание файла с сервера SFTP
    await downloadFile(remoteFilePath, localFilePath);
    console.log(`Файл ${fileName} успешно скачан и сохранен.`);

    // Преобразование Excel файла в JSON
    const jsonData = readExcelToJson(localFilePath);
    console.log('Содержимое файла в формате JSON:');
    console.log(jsonData);

    // Вставка данных в БД
    await insertDataToDB(jsonData, fileName, pref);
    console.log('Данные успешно вставлены в БД.');

    // Перемещение файла на сервере SFTP
    await moveFile(remoteFilePath, newRemoteFilePath);
    console.log(`Файл ${fileName} успешно перемещен в ${newRemoteFilePath}.`);

    res.json({ success: true, message: `Файл ${fileName} успешно обработан и данные вставлены в БД.` });
  } catch (error) {
    console.error(`Ошибка при скачивании и обработке файла ${fileName}:`, error);
    res.status(500).json({
      success: false,
      message: `Ошибка при загрузке и обработке файла ${fileName}`,
      error: error.message,
    });
  } finally {
    sftp.end();
  }
});

module.exports = router;