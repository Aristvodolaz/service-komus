const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const { sql, connectToDatabase } = require('../dbConfig');
const path = require('path');
const xlsx = require('xlsx'); // Для работы с Excel
const mssql = require('mssql');

const router = express.Router();

// Настройка хранения файлов
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
});

const upload = multer({ storage });


// Подключение к базе данных
connectToDatabase();

// 1. Метод для загрузки файла
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
      const filePath = req.file.path;
      const fileName = req.file.filename;
      const selectedSklad = req.body.sklad;

      const pref = fileName.split(' ')[0];

      // Получаем пул подключений
      const pool = await connectToDatabase();
      if (!pool) {
          return res.status(500).json({ success: false, message: 'Ошибка подключения к базе данных.' });
      }

      // Формируем запрос
      const query = `
          INSERT INTO Test_MP (
              Pref, Nazvanie_Zadaniya, Status_Zadaniya, Status, Ispolnitel, Artikul, Artikul_Syrya, Nomenklatura,
              Nazvanie_Tovara, SHK, SHK_Syrya, SHK_SPO, SHK_SPO_1, Kol_vo_Syrya, Itog_Zakaz, Sht_v_MP, Itog_MP, SOH,
              Tip_Postavki, Srok_Godnosti, Op_1_Bl_1_Sht, Op_2_Bl_2_Sht, Op_3_Bl_3_Sht, Op_4_Bl_4_Sht, Op_5_Bl_5_Sht,
              Op_6_Blis_6_10_Sht, Op_7_Pereschyot, Op_9_Fasovka_Sborka, Op_10_Markirovka_SHT, Op_11_Markirovka_Prom,
              Op_12_Markirovka_Prom, Op_13_Markirovka_Fabr, Op_14_TU_1_Sht, Op_15_TU_2_Sht, Op_16_TU_3_5, Op_17_TU_6_8,
              Op_468_Proverka_SHK, Op_469_Spetsifikatsiya_TM, Op_470_Dop_Upakovka, Mesto, Vlozhennost, Pallet_No,
              Time_Start, Time_End, Persent, SHK_WPS, Scklad_Pref
          )
          VALUES (@pref, @fileName, @statusZadaniya, @status, @ispolnitel, @artikul, @artikulSyrya, @nomenklatura,
                  @nazvanieTovara, @shk, @shkSyrya, @shkSpo, @shkSpo1, @kol_voSyrya, @itogZakaz, @sht_vMP, @itogMP,
                  @soh, @tipPostavki, @srokGodnosti, @op1Bl1Sht, @op2Bl2Sht, @op3Bl3Sht, @op4Bl4Sht, @op5Bl5Sht,
                  @op6Blis610Sht, @op7Pereschyot, @op9FasovkaSborka, @op10MarkirovkaSHT, @op11MarkirovkaProm,
                  @op12MarkirovkaProm, @op13MarkirovkaFabr, @op14TU1Sht, @op15TU2Sht, @op16TU35, @op17TU68,
                  @op468ProverkaSHK, @op469SpetsifikatsiyaTM, @op470DopUpakovka, @mesto, @vlozhennost, @palletNo,
                  @timeStart, @timeEnd, @persent, @shkWps, @skladPref)`;

      const request = pool.request();
      request.input('pref', sql.NVarChar, pref);
      request.input('fileName', sql.NVarChar, fileName);
      request.input('skladPref', sql.NVarChar, selectedSklad);

      await request.query(query);
      res.status(200).json({ message: "Файл успешно загружен и данные добавлены в базу данных." });
  } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Ошибка при загрузке файла." });
  }
});

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
      const sklads = result.recordset.map(row => `${row.Pref} - ${row.City}`);
      
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

router.post('/upload-row', async (req, res) => {
    try {
        const { sklad, ...rowData } = req.body;

        const pool = await connectToDatabase();
        if (!pool) {
            return res.status(500).json({ success: false, message: 'Ошибка подключения к базе данных.' });
        }

        const query = `
          INSERT INTO Test_MP (
              Pref, Nazvanie_Zadaniya, Status_Zadaniya, Status, Ispolnitel, Artikul, Artikul_Syrya, Nomenklatura,
              Nazvanie_Tovara, SHK, SHK_Syrya, SHK_SPO, SHK_SPO_1, Kol_vo_Syrya, Itog_Zakaz, Sht_v_MP, Itog_MP, SOH,
              Tip_Postavki, Srok_Godnosti, Op_1_Bl_1_Sht, Op_2_Bl_2_Sht, Op_3_Bl_3_Sht, Op_4_Bl_4_Sht, Op_5_Bl_5_Sht,
              Op_6_Blis_6_10_Sht, Op_7_Pereschyot, Op_9_FasovkaSborka, Op_10_Markirovka_SHT, Op_11_Markirovka_Prom,
              Op_12_Markirovka_Prom, Op_13_Markirovka_Fabr, Op_14_TU_1_Sht, Op_15_TU_2_Sht, Op_16_TU_3_5, Op_17_TU_6_8,
              Op_468_Proverka_SHK, Op_469_Spetsifikatsiya_TM, Op_470_Dop_Upakovka, Mesto, Vlozhennost, Pallet_No,
              Time_Start, Time_End, Persent, SHK_WPS, Scklad_Pref
          )
          VALUES (@Pref, @Nazvanie_Zadaniya, @Status_Zadaniya, @Status, @Ispolnitel, @Artikul, @Artikul_Syrya, @Nomenklatura,
                  @Nazvanie_Tovara, @SHK, @SHK_Syrya, @SHK_SPO, @SHK_SPO_1, @Kol_vo_Syrya, @Itog_Zakaz, @Sht_v_MP, @Itog_MP, @SOH,
                  @Tip_Postavki, @Srok_Godnosti, @Op_1_Bl_1_Sht, @Op_2_Bl_2_Sht, @Op_3_Bl_3_Sht, @Op_4_Bl_4_Sht, @Op_5_Bl_5_Sht,
                  @Op_6_Blis_6_10_Sht, @Op_7_Pereschyot, @Op_9_FasovkaSborka, @Op_10_Markirovka_SHT, @Op_11_Markirovka_Prom,
                  @Op_12_Markirovka_Prom, @Op_13_Markirovka_Fabr, @Op_14_TU_1_Sht, @Op_15_TU_2_Sht, @Op_16_TU_3_5, @Op_17_TU_6_8,
                  @Op_468_Proverka_SHK, @Op_469_Spetsifikatsiya_TM, @Op_470_Dop_Upakovka, @Mesto, @Vlozhennost, @Pallet_No,
                  @Time_Start, @Time_End, @Persent, @SHK_WPS, @Scklad_Pref)`;

        const request = pool.request();

        // Заполнение значений для каждого столбца, с обработкой null или пустых данных
        for (let key in rowData) {
            const value = rowData[key];
            if (value === null || value === undefined || value === '') {
                request.input(key, sql.NVarChar, null); // Обработка null-значений
            } else {
                request.input(key, sql.NVarChar, value);
            }
        }
        request.input('Scklad_Pref', sql.NVarChar, sklad);

        await request.query(query);
        res.status(200).json({ message: 'Строка загружена успешно' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Ошибка при загрузке строки.' });
    }
});


module.exports = router;
