const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const { sql, connectToDatabase } = require('../dbConfig');
const path = require('path');
const xlsx = require('xlsx'); // Для работы с Excel
const mssql = require('mssql');

const router = express.Router();



// Подключение к базе данных
connectToDatabase();


// 2. Метод для получения списка складов
router.get('/sklads', async (req, res) => {
  try {
      // Подключаемся к базе данных и получаем пул подключений
      const pool = await connectToDatabase();
      if (!pool) {
          return res.status(500).json({ message: "Ошибка подключения к базе данных." });
      }

      // Выполняем запрос через пул
      const query = "SELECT Pref, City FROM Scklad_City_MP";
      const result = await pool.request().query(query);  // Используем request() для выполнения запроса

      // Формируем список складов
      const sklads = result.recordset.map(row => `${row.Pref}`);
      
      // Отправляем ответ с данными
      res.status(200).json({ sklads });
  } catch (err) {
      console.error('Ошибка при выполнении запроса:', err);
      res.status(500).json({ message: "Ошибка при загрузке списка складов." });
  }
});


// 3. Метод для получения списка выполненных файлов для выбранного склада
router.get('/files', async (req, res) => {
  try {
      const skladPref = req.query.skladPref;

      // Проверка, был ли передан параметр склада
      if (!skladPref) {
          return res.status(400).json({ message: "Параметр 'skladPref' обязателен." });
      }

      // Подключаемся к базе данных и получаем пул подключений
      const pool = await connectToDatabase();
      if (!pool) {
          return res.status(500).json({ message: "Ошибка подключения к базе данных." });
      }

      // Формируем запрос и передаем параметр
      const query = "SELECT DISTINCT Nazvanie_Zadaniya FROM Test_MP WHERE Scklad_Pref = @skladPref";
      const request = pool.request();
      request.input('skladPref', sql.NVarChar, skladPref);

      // Выполняем запрос к базе данных
      const result = await request.query(query);

      // Формируем список выполненных файлов
      const files = result.recordset.map(row => row.Nazvanie_Zadaniya);

      // Отправляем ответ с полученными файлами
      res.status(200).json({ files });
  } catch (err) {
      console.error('Ошибка при выполнении запроса:', err);
      res.status(500).json({ message: "Ошибка при загрузке списка файлов." });
  }
});


// 4. Метод для скачивания файла (создание и скачивание Excel файла)
router.get('/download', async (req, res) => {
  try {
      const taskName = req.query.task;

      if (!taskName) {
          return res.status(400).json({ message: "Параметр 'task' обязателен." });
      }

      const isWB = taskName.includes('WB');

      // Подключаемся к базе данных
      const pool = await connectToDatabase();
      if (!pool) {
          return res.status(500).json({ message: "Ошибка подключения к базе данных." });
      }

      // Формируем SQL-запрос в зависимости от типа файла
      let query;
      if (isWB) {
          query = `
              SELECT Nazvanie_Zadaniya, Artikul, Barcode, Kolvo_Tovarov, SHK_Coroba, Srok_Godnosti, Pallet_No, SHK_WPS
              FROM Test_MP_Privyazka WHERE Nazvanie_Zadaniya = @Nazvanie_Zadaniya`;
      } else {
          query = `
              SELECT Nazvanie_Zadaniya, Artikul, Artikul_Syrya, Nazvanie_Tovara, SHK, SHK_Syrya, Kol_vo_Syrya, Itog_Zakaz,
                     Itog_MP, SOH, Srok_Godnosti, Op_1_Bl_1_Sht, Op_2_Bl_2_Sht, Op_3_Bl_3_Sht, Op_4_Bl_4_Sht, Op_5_Bl_5_Sht,
                     Op_6_Blis_6_10_Sht, Op_7_Pereschyot, Op_9_Fasovka_Sborka, Op_10_Markirovka_SHT, Op_11_Markirovka_Prom,
                     Op_13_Markirovka_Fabr, Op_14_TU_1_Sht, Op_15_TU_2_Sht, Op_16_TU_3_5, Op_17_TU_6_8, Op_468_Proverka_SHK,
                     Op_469_Spetsifikatsiya_TM, Op_470_Dop_Upakovka, Mesto, Vlozhennost, Pallet_No, Ispolnitel, SHK_WPS
              FROM Test_MP WHERE Nazvanie_Zadaniya = @Nazvanie_Zadaniya`;
      }

      const request = pool.request();
      request.input('Nazvanie_Zadaniya', mssql.NVarChar(255), taskName);

      const result = await request.query(query);

      if (result.recordset.length === 0) {
          return res.status(404).json({ message: "Данные для указанного задания не найдены." });
      }

      // Отправляем данные построчно
      res.setHeader('Content-Type', 'application/json');
      for (let row of result.recordset) {
          res.write(JSON.stringify(row) + '\n'); // Отправляем строку данных в формате JSON
      }

      res.end(); // Заканчиваем поток
  } catch (err) {
      console.error('Ошибка при обработке запроса:', err);
      res.status(500).json({ message: "Ошибка при скачивании файла." });
  }
});


router.get('/completed-tasks', async (req, res) => {
  try {
    // Подключаемся к базе данных
    const pool = await connectToDatabase();
    if (!pool) {
      return res.status(500).json({ message: "Ошибка подключения к базе данных." });
    }

    // Выполняем SQL-запрос для получения названий всех заданий, где Status_Zadaniya = 1
    const query = "SELECT DISTINCT Nazvanie_Zadaniya FROM Test_MP WHERE Status_Zadaniya = 1";
    const result = await pool.request().query(query);

    // Формируем список названий заданий
    const tasks = result.recordset.map(row => row.Nazvanie_Zadaniya);

    // Отправляем ответ с полученными названиями заданий
    res.status(200).json({ tasks });
  } catch (err) {
    console.error('Ошибка при выполнении запроса:', err);
    res.status(500).json({ message: "Ошибка при загрузке списка заданий." });
  }
});

router.get('/tasks-status-1', async (req, res) => {
  try {
      const pool = await connectToDatabase();
      if (!pool) {
          return res.status(500).json({ message: "Ошибка подключения к базе данных." });
      }

      const query = "SELECT Nazvanie_Zadaniya FROM Test_MP WHERE Status_Zadaniya = 1";
      const result = await pool.request().query(query);

      const tasks = result.recordset.map(row => row.Nazvanie_Zadaniya);

      res.status(200).json({ tasks });
  } catch (err) {
      console.error('Ошибка при выполнении запроса:', err);
      res.status(500).json({ message: "Ошибка при получении списка заданий." });
  }
});

router.post('/upload-data', async (req, res) => {
    try {
      const data = req.body;  // Данные, отправленные с десктопа
  
      // Подключаемся к базе данных
      const pool = await connectToDatabase();
      if (!pool) {
        return res.status(500).json({ message: "Ошибка подключения к базе данных." });
      }
  
      // Пример запроса на вставку данных в таблицу Test_MP
      const query = `
        INSERT INTO Test_MP 
          (Artikul, Artikul_Syrya, Nomenklatura, Nazvanie_Tovara, SHK, SHK_Syrya, SHK_SPO, Kol_vo_Syrya, Itog_Zakaz, SOH, 
           Tip_Postavki, Srok_Godnosti, Op_1_Bl_1_Sht, Op_2_Bl_2_Sht, Op_3_Bl_3_Sht, Op_4_Bl_4_Sht, Op_5_Bl_5_Sht, Op_6_Blis_6_10_Sht,
           Op_7_Pereschyot, Op_9_Fasovka_Sborka, Op_10_Markirovka_SHT, Op_11_Markirovka_Prom, Op_13_Markirovka_Fabr, Op_14_TU_1_Sht, 
           Op_15_TU_2_Sht, Op_16_TU_3_5, Op_17_TU_6_8, Op_468_Proverka_SHK, Op_469_Spetsifikatsiya_TM, Op_470_Dop_Upakovka, 
           Mesto, Vlozhennost, Pallet_No, Pref, Nazvanie_Zadaniya, Status, Status_Zadaniya, Scklad_Pref)
        VALUES 
          (@Artikul, @Artikul_Syrya, @Nomenklatura, @Nazvanie_Tovara, @SHK, @SHK_Syrya, @SHK_SPO, @Kol_vo_Syrya, @Itog_Zakaz, @SOH,
           @Tip_Postavki, @Srok_Godnosti, @Op_1_Bl_1_Sht, @Op_2_Bl_2_Sht, @Op_3_Bl_3_Sht, @Op_4_Bl_4_Sht, @Op_5_Bl_5_Sht, @Op_6_Blis_6_10_Sht,
           @Op_7_Pereschyot, @Op_9_Fasovka_Sborka, @Op_10_Markirovka_SHT, @Op_11_Markirovka_Prom, @Op_13_Markirovka_Fabr, @Op_14_TU_1_Sht, 
           @Op_15_TU_2_Sht, @Op_16_TU_3_5, @Op_17_TU_6_8, @Op_468_Proverka_SHK, @Op_469_Spetsifikatsiya_TM, @Op_470_Dop_Upakovka, 
           @Mesto, @Vlozhennost, @Pallet_No, @Pref, @Nazvanie_Zadaniya, @Status, @Status_Zadaniya, @Scklad_Pref)
      `;
      
      const request = pool.request();
      request.input('Artikul', mssql.Int, data.Artikul);
      request.input('Artikul_Syrya', mssql.Int, data.Artikul_Syrya);
      request.input('Nomenklatura', mssql.BigInt, data.Nomenklatura);
      request.input('Nazvanie_Tovara', mssql.NVarChar, data.Nazvanie_Tovara);
      request.input('SHK', mssql.NVarChar, data.SHK);
      request.input('SHK_Syrya', mssql.NVarChar, data.SHK_Syrya);
      request.input('SHK_SPO', mssql.NVarChar, data.SHK_SPO);
      request.input('Kol_vo_Syrya', mssql.Int, data.Kol_vo_Syrya);
      request.input('Itog_Zakaz', mssql.Int, data.Itog_Zakaz);
      request.input('SOH', mssql.NVarChar, data.SOH);
      request.input('Tip_Postavki', mssql.NVarChar, data.Tip_Postavki);
      request.input('Srok_Godnosti', mssql.NVarChar, data.Srok_Godnosti);
      request.input('Op_1_Bl_1_Sht', mssql.NVarChar, data.Op_1_Bl_1_Sht);
      request.input('Op_2_Bl_2_Sht', mssql.NVarChar, data.Op_2_Bl_2_Sht);
      request.input('Op_3_Bl_3_Sht', mssql.NVarChar, data.Op_3_Bl_3_Sht);
      request.input('Op_4_Bl_4_Sht', mssql.NVarChar, data.Op_4_Bl_4_Sht);
      request.input('Op_5_Bl_5_Sht', mssql.NVarChar, data.Op_5_Bl_5_Sht);
      request.input('Op_6_Blis_6_10_Sht', mssql.NVarChar, data.Op_6_Blis_6_10_Sht);
      request.input('Op_7_Pereschyot', mssql.NVarChar, data.Op_7_Pereschyот);
      request.input('Op_9_Fasovka_Sborka', mssql.NVarChar, data.Op_9_Fasovка_Sborka);
      request.input('Op_10_Markirovka_SHT', mssql.NVarChar, data.Op_10_Markirovka_SHT);
      request.input('Op_11_Markirovka_Prom', mssql.NVarChar, data.Op_11_Markirovka_Prom);
      request.input('Op_13_Markirovka_Fabr', mssql.NVarChar, data.Op_13_Markirovka_Fabr);
      request.input('Op_14_TU_1_Sht', mssql.NVarChar, data.Op_14_TU_1_Sht);
      request.input('Op_15_TU_2_Sht', mssql.NVarChar, data.Op_15_TU_2_Sht);
      request.input('Op_16_TU_3_5', mssql.NVarChar, data.Op_16_TU_3_5);
      request.input('Op_17_TU_6_8', mssql.NVarChar, data.Op_17_TU_6_8);
      request.input('Op_468_Proverka_SHK', mssql.NVarChar, data.Op_468_Proverka_SHK);
      request.input('Op_469_Spetsifikatsiya_TM', mssql.NVarChar, data.Op_469_Spetsifikatsiya_TM);
      request.input('Op_470_Dop_Upakovka', mssql.NVarChar, data.Op_470_Dop_Upakovka);
      request.input('Mesto', mssql.Int, data.Mesto);
      request.input('Vlozhennost', mssql.Int, data.Vlozhennost);
      request.input('Pallet_No', mssql.Int, data.Pallet_No);
      request.input('Pref', mssql.NVarChar, data.pref);  // добавляем поле 'Pref'
      request.input('Nazvanie_Zadaniya', mssql.NVarChar, data.Nazvanie_Zadaniya);
      request.input('Status', mssql.Int, data.Status);
      request.input('Status_Zadaniya', mssql.Int, data.Status_Zadaniya);
      request.input('Scklad_Pref', mssql.NVarChar, data.Scklad_Pref);
      await request.query(query);
  
      res.status(200).json({ message: "Данные успешно записаны в базу." });
    } catch (err) {
      console.error('Ошибка при записи данных в базу:', err);
      res.status(500).json({ message: "Ошибка при записи данных в базу." });
    }
});

module.exports = router;
