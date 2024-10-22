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

router.post('/upload', upload.single('file'), async (req, res) => {
    try {
        const filePath = req.file.path;
        const fileName = req.file.filename;
        const selectedSklad = req.body.sklad;
        const pref = fileName.split(' ')[0]; // Извлекаем pref из имени файла

        // Чтение файла Excel
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        // Получаем пул подключений
        const pool = await connectToDatabase();
        if (!pool) {
            return res.status(500).json({ success: false, message: 'Ошибка подключения к базе данных.' });
        }

        const query = `
            INSERT INTO Test_MP (
                Pref, Nazvanie_Zadaniya, Status_Zadaniya, Status, Ispolnitel, Artikul, Artikul_Syrya, Nomenklatura,
                Nazvanie_Tovara, SHK, SHK_SPO, SHK_SPO_1, Kol_vo_Syrya, Itog_Zakaz, Sht_v_MP, Itog_MP, SOH,
                Tip_Postavki, Srok_Godnosti, Op_1_Bl_1_Sht, Op_2_Bl_2_Sht, Op_3_Bl_3_Sht, Op_4_Bl_4_Sht, Op_5_Bl_5_Sht,
                Op_6_Blis_6_10_Sht, Op_7_Pereschyot, Op_9_Fasovka_Sborka, Op_10_Markirovka_SHT, Op_11_Markirovka_Prom,
                Op_12_Markirovka_Prom, Op_13_Markirovka_Fabr, Op_14_TU_1_Sht, Op_15_TU_2_Sht, Op_16_TU_3_5, Op_17_TU_6_8,
                Op_468_Proverka_SHK, Op_469_Spetsifikatsiya_TM, Op_470_Dop_Upakovka, Mesto, Vlozhennost, Pallet_No,
                Time_Start, Time_Middle, Time_End, Persent, SHK_WPS, Scklad_Pref, comment, reason, SHK_Syrya
            ) 
            VALUES (@pref, @fileName, @statusZadaniya, @status, @ispolnitel, @artikul, @artikulSyrya, @nomenklatura,
                    @nazvanieTovara, @shk, @shkSpo, @shkSpo1, @kol_voSyrya, @itogZakaz, @sht_vMP, @itogMP, @soh,
                    @tipPostavki, @srokGodnosti, @op1Bl1Sht, @op2Bl2Sht, @op3Bl3Sht, @op4Bl4Sht, @op5Bl5Sht,
                    @op6Blis610Sht, @op7Pereschyot, @op9FasovkaSborka, @op10MarkirovkaSHT, @op11MarkirovkaProm,
                    @op12MarkirovkaProm, @op13MarkirovkaFabr, @op14TU1Sht, @op15TU2Sht, @op16TU35, @op17TU68,
                    @op468ProverkaSHK, @op469SpetsifikatsiyaTM, @op470DopUpakovka, @mesto, @vlozhennost, @palletNo,
                    @timeStart, @timeMiddle, @timeEnd, @persent, @shkWps, @skladPref, @comment, @reason, @shkSyrya)`;

        const transaction = new mssql.Transaction(pool);
        await transaction.begin(); // Начинаем транзакцию

        for (let row of rows) {
            const request = new sql.Request(transaction);
            request.input('pref', sql.NVarChar, pref);
            request.input('fileName', sql.NVarChar, fileName);
            request.input('statusZadaniya', sql.Int, row['Status_Zadaniya'] || 0);
            request.input('status', sql.Int, row['Status'] || 0);
            request.input('ispolnitel', sql.NVarChar, row['Ispolnitel'] || '');
            request.input('artikul', sql.Int, row['Артикул'] || null);
            request.input('artikulSyrya', sql.NVarChar, row['Артикул Сырья'] || '');
            request.input('nomenklatura', sql.BigInt, row['Номенклатура'] || null);
            request.input('nazvanieTovara', sql.NVarChar, row['Название товара'] || '');
            request.input('shk', sql.NVarChar, row['ШК'] || '');
            request.input('shkSpo', sql.NVarChar, row['ШК СПО'] || '');
            request.input('shkSpo1', sql.NVarChar, row['ШК СПО_1'] || '');
            request.input('kol_voSyrya', sql.NVarChar, row['Кол-во сырья'] || '');
            request.input('itogZakaz', sql.Int, row['Итог Заказ'] || null);
            request.input('sht_vMP', sql.Int, row['шт в мп'] || null);
            request.input('itogMP', sql.Int, row['Итог МП'] || null);
            request.input('soh', sql.NVarChar, row['СОХ'] || '');
            request.input('tipPostavki', sql.NVarChar, row['тип поставки'] || '');
            request.input('srokGodnosti', sql.NVarChar, row['Срок Годности'] || '');
            request.input('op1Bl1Sht', sql.NVarChar, row['Оп 1 бл. 1 шт'] || '');
            request.input('op2Bl2Sht', sql.NVarChar, row['Оп 2 бл.2 шт'] || '');
            request.input('op3Bl3Sht', sql.NVarChar, row['Оп 3 бл.3 шт'] || '');
            request.input('op4Bl4Sht', sql.NVarChar, row['Оп 4 бл.4 шт'] || '');
            request.input('op5Bl5Sht', sql.NVarChar, row['Оп 5 бл.5 шт'] || '');
            request.input('op6Blis610Sht', sql.NVarChar, row['Оп 6 блис.6 10шт'] || '');
            request.input('op7Pereschyot', sql.NVarChar, row['Оп 7 пересчет'] || '');
            request.input('op9FasovkaSborka', sql.NVarChar, row['Оп 9 фасовка/сборка'] || '');
            request.input('op10MarkirovkaSHT', sql.NVarChar, row['Оп 10 Маркировка ШТ'] || '');
            request.input('op11MarkirovkaProm', sql.NVarChar, row['Оп 11 маркировка пром'] || '');
            request.input('op12MarkirovkaProm', sql.NVarChar, row['Оп 12 маркировка пром'] || '');
            request.input('op13MarkirovkaFabr', sql.NVarChar, row['Оп 13 маркировка фабр'] || '');
            request.input('op14TU1Sht', sql.NVarChar, row['Оп 14 ТУ 1 шт'] || '');
            request.input('op15TU2Sht', sql.NVarChar, row['Оп 15 ТУ 2 шт'] || '');
            request.input('op16TU35', sql.NVarChar, row['Оп 16 ТУ 3 5'] || '');
            request.input('op17TU68', sql.NVarChar, row['Оп 17 ТУ 6 8'] || '');
            request.input('op468ProverkaSHK', sql.NVarChar, row['Оп 468 проверка ШК'] || '');
            request.input('op469SpetsifikatsiyaTM', sql.NVarChar, row['Оп 469 Спецификация ТМ'] || '');
            request.input('op470DopUpakovka', sql.NVarChar, row['Оп 470 доп упаковка'] || '');
            request.input('mesto', sql.Int, row['Место'] || null);
            request.input('vlozhennost', sql.Int, row['Вложенность'] || null);
            request.input('palletNo', sql.Int, row['Паллет №'] || null);
            request.input('timeStart', sql.NVarChar, row['Время начала'] || '');
            request.input('timeMiddle', sql.NVarChar, row['Время середины'] || '');
            request.input('timeEnd', sql.NVarChar, row['Время окончания'] || '');
            request.input('persent', sql.NVarChar, row['Процент выполнения'] || '');
            request.input('shkWps', sql.NVarChar, row['ШК ВПС'] || '');
            request.input('skladPref', sql.NVarChar, selectedSklad);
            request.input('comment', sql.NVarChar, row['Комментарий'] || '');
            request.input('reason', sql.NVarChar, row['Причина'] || '');
            request.input('shkSyrya', sql.NVarChar, row['ШК Сырья'] || '');

            await request.query(query);
        }

        await transaction.commit(); // Подтверждаем транзакцию

        res.status(200).json({ message: "Файл успешно загружен и данные добавлены в базу данных." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Ошибка при загрузке файла." });
    }
});

module.exports = router;
