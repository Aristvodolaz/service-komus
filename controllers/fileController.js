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

const getPieceGTINForArticulSyrya = async (pool, artikuls) => {
  const gtinValues = [];

  for (let articul of artikuls) {
    const query = `
      SELECT PIECE_GTIN, FPACK_GTIN 
      FROM OPENQUERY(OW, 'SELECT PIECE_GTIN, FPACK_GTIN FROM wms.article WHERE ID = ''${articul.trim()}''')
    `;

    const result = await pool.request().query(query);

    if (result.recordset.length > 0) {
      let { PIECE_GTIN, FPACK_GTIN } = result.recordset[0];

      // Проверка условий: используем PIECE_GTIN, если он не null; иначе используем FPACK_GTIN (если FPACK_GTIN тоже не null)
      if (PIECE_GTIN && PIECE_GTIN.toLowerCase() !== 'null') {
        gtinValues.push(PIECE_GTIN);
      } else if (FPACK_GTIN && FPACK_GTIN.toLowerCase() !== 'null') {
        gtinValues.push(FPACK_GTIN);
      }
    }
  }

  return gtinValues.join(','); // Объединяем все найденные значения через запятую
};



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
      console.log(`Загрузка данных для задания: ${taskName}, isWB: ${isWB}`);

      // Подключаемся к базе данных
      const pool = await connectToDatabase();
      if (!pool) {
          return res.status(500).json({ message: "Ошибка подключения к базе данных." });
      }

      // Формируем SQL-запросы в зависимости от типа файла
      let query1, query2;
      if (isWB) {
          // Первый набор данных для WB
          query1 = `
              SELECT 
    p.Nazvanie_Zadaniya,
    p.Artikul,
    m.SHK as Barcode,
    p.Kolvo_Tovarov,
    p.SHK_Coroba,
    p.Srok_Godnosti,
    p.Pallet_No,
    p.SHK_WPS
FROM Test_MP_Privyazka p
LEFT JOIN Test_MP m
    ON p.Artikul = m.Artikul AND m.Nazvanie_Zadaniya = @Nazvanie_Zadaniya
WHERE p.Nazvanie_Zadaniya = @Nazvanie_Zadaniya

`;

          // Второй набор данных для WB
          query2 = `
              SELECT Nazvanie_Zadaniya, Artikul, Artikul_Syrya, Nazvanie_Tovara, SHK, SHK_Syrya, Kol_vo_Syrya, Itog_Zakaz,
                     Itog_MP, SOH, Srok_Godnosti, Op_1_Bl_1_Sht, Op_2_Bl_2_Sht, Op_3_Bl_3_Sht, Op_4_Bl_4_Sht, Op_5_Bl_5_Sht,
                     Op_6_Blis_6_10_Sht, Op_7_Pereschyot, Op_9_Fasovka_Sborka, Op_10_Markirovka_SHT, Op_11_Markirovka_Prom,
                     Op_13_Markirovka_Fabr, Op_14_TU_1_Sht, Op_15_TU_2_Sht, Op_16_TU_3_5, Op_17_TU_6_8, Op_468_Proverka_SHK,
                     Op_469_Spetsifikatsiya_TM, Op_470_Dop_Upakovka, Mesto, Vlozhennost, Pallet_No, Ispolnitel, SHK_WPS, reason, comment
              FROM Test_MP WHERE Nazvanie_Zadaniya = @Nazvanie_Zadaniya`;
     } else {
          // Если это не WB, оставляем как есть
          query1 = `
              SELECT Nazvanie_Zadaniya, Artikul, Artikul_Syrya, Nazvanie_Tovara, SHK, SHK_Syrya, Kol_vo_Syrya, Itog_Zakaz,
                     Itog_MP, SOH, Srok_Godnosti, Op_1_Bl_1_Sht, Op_2_Bl_2_Sht, Op_3_Bl_3_Sht, Op_4_Bl_4_Sht, Op_5_Bl_5_Sht,
                     Op_6_Blis_6_10_Sht, Op_7_Pereschyot, Op_9_Fasovka_Sborka, Op_10_Markirovka_SHT, Op_11_Markirovka_Prom,
                     Op_13_Markirovka_Fabr, Op_14_TU_1_Sht, Op_15_TU_2_Sht, Op_16_TU_3_5, Op_17_TU_6_8, Op_468_Proverka_SHK,
                     Op_469_Spetsifikatsiya_TM, Op_470_Dop_Upakovka, Mesto, Vlozhennost, Pallet_No, Ispolnitel, SHK_WPS, reason, comment
              FROM Test_MP WHERE Nazvanie_Zadaniya = @Nazvanie_Zadaniya`;
      }

      // Выполняем первый запрос
      const request = pool.request();
      request.input('Nazvanie_Zadaniya', mssql.NVarChar(255), taskName);
      const result1 = await request.query(query1);

      // Проверка результата первого запроса
      console.log(`Результат первого запроса (длина): ${result1.recordset.length}`);
      if (result1.recordset.length === 0) {
          return res.status(404).json({ message: "Данные для указанного задания не найдены." });
      }

      // Выполняем второй запрос (если это WB)
      let result2 = null;
      if (isWB) {
          result2 = await request.query(query2);
          console.log(`Результат второго запроса (длина): ${result2.recordset.length}`);
      }

      // Объединяем данные из обоих наборов
      const combinedData = {
          dataSet1: result1.recordset,
          dataSet2: result2 ? result2.recordset : [] // Если это WB, добавляем второй набор данных, иначе пустой массив
      };

      // Отправляем ответ в виде JSON
      res.status(200).json(combinedData);
  } catch (err) {
      console.error('Ошибка при обработке запроса:', err);
      res.status(500).json({ message: "Ошибка при скачивании файла." });
  }
});


// 5. Метод для удаления ранее загруженных данных по pref и названию задания
router.post('/delete-uploaded-data', async (req, res) => {
  try {
    const { pref, Nazvanie_Zadaniya } = req.body;  // Получаем pref и название задания из запроса

    if (!pref || !Nazvanie_Zadaniya) {
      return res.status(400).json({ message: "Параметры 'pref' и 'Nazvanie_Zadaniya' обязательны." });
    }

    // Подключаемся к базе данных
    const pool = await connectToDatabase();
    if (!pool) {
      return res.status(500).json({ message: "Ошибка подключения к базе данных." });
    }

    // Формируем SQL-запрос на удаление данных с учетом pref и названия задания
    const query = `
      DELETE FROM Test_MP 
      WHERE Pref = @Pref AND Nazvanie_Zadaniya = @Nazvanie_Zadaniya AND Status_Zadaniya = 0
    `;

    const request = pool.request();
    request.input('Pref', mssql.NVarChar, pref);
    request.input('Nazvanie_Zadaniya', mssql.NVarChar, Nazvanie_Zadaniya);

    // Выполняем запрос на удаление
    const result = await request.query(query);

    if (result.rowsAffected[0] > 0) {
      res.status(200).json({ message: "Данные успешно удалены." });
    } else {
      res.status(404).json({ message: "Данные для указанного pref и названия задания не найдены." });
    }

  } catch (err) {
    console.error('Ошибка при удалении данных:', err);
    res.status(500).json({ message: "Ошибка при удалении данных." });
  }
});

router.post('/upload-data', async (req, res) => {
    try {
      const data = req.body;

      const pool = await connectToDatabase();
      if (!pool) {
        return res.status(500).json({ message: "Ошибка подключения к базе данных." });
      }
  
      let shkSyrya = null;

      // Проверка на пустое значение Artikul_Syrya
      if (data.Artikul_Syrya && data.Artikul_Syrya.trim() !== '') {
        if (data.Artikul_Syrya.includes(',')) {
          const artikuls = data.Artikul_Syrya.split(',');
          shkSyrya = await getPieceGTINForArticulSyrya(pool, artikuls); // Получаем GTIN для каждого артикула
        } else {
          // Если только один артикул, выполняем поиск напрямую
          shkSyrya = await getPieceGTINForArticulSyrya(pool, [data.Artikul_Syrya]);
        }
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
      request.input('Artikul_Syrya', mssql.NVarChar, data.Artikul_Syrya ? data.Artikul_Syrya.toString() : null);
      request.input('Nomenklatura', mssql.BigInt, data.Nomenklatura);
      request.input('Nazvanie_Tovara', mssql.NVarChar, data.Nazvanie_Tovara);
      request.input('SHK', mssql.NVarChar, data.SHK ?  data.SHK.toString() : null);
      request.input('SHK_Syrya', mssql.NVarChar, shkSyrya ? shkSyrya : data.SHK_Syrya);
      request.input('SHK_SPO', mssql.NVarChar, data.SHK_SPO ? data.SHK_SPO.toString() : null);
      request.input('Kol_vo_Syrya', mssql.Int, data.Kol_vo_Syrya);
      request.input('Itog_Zakaz', mssql.Int, data.Itog_Zakaz);
      request.input('SOH', mssql.NVarChar, data.SOH ? data.SOH.toString() : null);
      request.input('Tip_Postavki', mssql.NVarChar, data.Tip_Postavki);
      request.input('Srok_Godnosti', mssql.NVarChar, data.Srok_Godnosti);
      request.input('Op_1_Bl_1_Sht', mssql.NVarChar, data.Op_1_Bl_1_Sht);
      request.input('Op_2_Bl_2_Sht', mssql.NVarChar, data.Op_2_Bl_2_Sht);
      request.input('Op_3_Bl_3_Sht', mssql.NVarChar, data.Op_3_Bl_3_Sht);
      request.input('Op_4_Bl_4_Sht', mssql.NVarChar, data.Op_4_Bl_4_Sht);
      request.input('Op_5_Bl_5_Sht', mssql.NVarChar, data.Op_5_Bl_5_Sht);
      request.input('Op_6_Blis_6_10_Sht', mssql.NVarChar, data.Op_6_Blis_6_10_Sht);
      request.input('Op_7_Pereschyot', mssql.NVarChar, data.Op_7_Pereschyot);
      request.input('Op_9_Fasovka_Sborka', mssql.NVarChar, data.Op_9_Fasovka_Sborka);
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


router.post('/upload-data-new', async (req, res) => {
  try {
      const data = req.body;

      const pool = await connectToDatabase();
      if (!pool) {
          return res.status(500).json({ message: "Ошибка подключения к базе данных." });
      }

      let shkSyrya = null;

      if (data.Artikul_Syrya && data.Artikul_Syrya.trim() !== '') {
          if (data.Artikul_Syrya.includes(',')) {
              const artikuls = data.Artikul_Syrya.split(',');
              shkSyrya = await getPieceGTINForArticulSyrya(pool, artikuls);
          } else {
              shkSyrya = await getPieceGTINForArticulSyrya(pool, [data.Artikul_Syrya]);
          }
      }

      const query = `
          INSERT INTO Test_MP 
          (Artikul, Artikul_Syrya, Nomenklatura, Nazvanie_Tovara, SHK, SHK_Syrya, SHK_SPO, Kol_vo_Syrya, Itog_Zakaz, SOH, 
          Tip_Postavki, Srok_Godnosti, Op_1_Bl_1_Sht, Op_2_Bl_2_Sht, Op_3_Bl_3_Sht, Op_4_Bl_4_Sht, Op_5_Bl_5_Sht, Op_6_Blis_6_10_Sht,
          Op_7_Pereschyot, Op_9_Fasovka_Sborka, Op_10_Markirovka_SHT, Op_11_Markirovka_Prom, Op_13_Markirovka_Fabr, Op_14_TU_1_Sht, 
          Op_15_TU_2_Sht, Op_16_TU_3_5, Op_17_TU_6_8, Op_468_Proverka_SHK, Op_469_Spetsifikatsiya_TM, Op_470_Dop_Upakovka, 
          Mesto, Vlozhennost, Pallet_No, Pref, Nazvanie_Zadaniya, Status, Status_Zadaniya, Scklad_Pref, 
          Sortiruemyi_Tovar, Ne_Sortiruemyi_Tovar, Produkty, Opasnyi_Tovar, Zakrytaya_Zona, Krupnogabaritnyi_Tovar, 
          Yuvelirnye_Izdelia, Pechat_Etiketki_s_SHK, Pechat_Etiketki_s_Opisaniem)
          VALUES 
          (@Artikul, @Artikul_Syrya, @Nomenklatura, @Nazvanie_Tovara, @SHK, @SHK_Syrya, @SHK_SPO, @Kol_vo_Syrya, @Itog_Zakaz, @SOH,
          @Tip_Postavki, @Srok_Godnosti, @Op_1_Bl_1_Sht, @Op_2_Bl_2_Sht, @Op_3_Bl_3_Sht, @Op_4_Bl_4_Sht, @Op_5_Bl_5_Sht, @Op_6_Blis_6_10_Sht,
          @Op_7_Pereschyot, @Op_9_Fasovka_Sborka, @Op_10_Markirovka_SHT, @Op_11_Markirovka_Prom, @Op_13_Markirovka_Fabr, @Op_14_TU_1_Sht, 
          @Op_15_TU_2_Sht, @Op_16_TU_3_5, @Op_17_TU_6_8, @Op_468_Proverka_SHK, @Op_469_Spetsifikatsiya_TM, @Op_470_Dop_Upakovka, 
          @Mesto, @Vlozhennost, @Pallet_No, @Pref, @Nazvanie_Zadaniya, @Status, @Status_Zadaniya, @Scklad_Pref,
          @Sortiruemyi_Tovar, @Ne_Sortiruemyi_Tovar, @Produkty, @Opasnyi_Tovar, @Zakrytaya_Zona, @Krupnogabaritnyi_Tovar, 
          @Yuvelirnye_Izdelia, @Pechat_Etiketki_s_SHK, @Pechat_Etiketki_s_Opisaniem)
      `;

      const request = pool.request();
      request.input('Artikul', mssql.Int, data.Artikul);
      request.input('Artikul_Syrya', mssql.NVarChar, data.Artikul_Syrya ? data.Artikul_Syrya.toString() : null);
      request.input('Nomenklatura', mssql.BigInt, data.Nomenklatura);
      request.input('Nazvanie_Tovara', mssql.NVarChar, data.Nazvanie_Tovara);
      request.input('SHK', mssql.NVarChar, data.SHK ? data.SHK.toString() : null);
      request.input('SHK_Syrya', mssql.NVarChar, shkSyrya ? shkSyrya : data.SHK_Syrya);
      request.input('SHK_SPO', mssql.NVarChar, data.SHK_SPO ? data.SHK_SPO.toString() : null);
      request.input('Kol_vo_Syrya', mssql.Int, data.Kol_vo_Syrya);
      request.input('Itog_Zakaz', mssql.Int, data.Itog_Zakaz);
      request.input('SOH', mssql.NVarChar, data.SOH ? data.SOH.toString() : null);
      request.input('Tip_Postavki', mssql.NVarChar, data.Tip_Postavki);
      request.input('Srok_Godnosti', mssql.NVarChar, data.Srok_Godnosti);
      request.input('Op_1_Bl_1_Sht', mssql.NVarChar, data.Op_1_Bl_1_Sht);
      request.input('Op_2_Bl_2_Sht', mssql.NVarChar, data.Op_2_Bl_2_Sht);
      request.input('Op_3_Bl_3_Sht', mssql.NVarChar, data.Op_3_Bl_3_Sht);
      request.input('Op_4_Bl_4_Sht', mssql.NVarChar, data.Op_4_Bl_4_Sht);
      request.input('Op_5_Bl_5_Sht', mssql.NVarChar, data.Op_5_Bl_5_Sht);
      request.input('Op_6_Blis_6_10_Sht', mssql.NVarChar, data.Op_6_Blis_6_10_Sht);
      request.input('Op_7_Pereschyot', mssql.NVarChar, data.Op_7_Pereschyot);
      request.input('Op_9_Fasovka_Sborka', mssql.NVarChar, data.Op_9_Fasovka_Sborka);
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
      request.input('Pref', mssql.NVarChar, data.pref);
      request.input('Nazvanie_Zadaniya', mssql.NVarChar, data.Nazvanie_Zadaniya);
      request.input('Status', mssql.Int, data.Status);
      request.input('Status_Zadaniya', mssql.Int, data.Status_Zadaniya);
      request.input('Scklad_Pref', mssql.NVarChar, data.Scklad_Pref);
      request.input('Sortiruemyi_Tovar', mssql.NVarChar, data.Sortiruemyi_Tovar);
      request.input('Ne_Sortiruemyi_Tovar', mssql.NVarChar, data.Ne_Sortiruemyi_Tovar);
      request.input('Produkty', mssql.NVarChar, data.Produkty);
      request.input('Opasnyi_Tovar', mssql.NVarChar, data.Opasnyi_Tovar);
      request.input('Zakrytaya_Zona', mssql.NVarChar, data.Zakrytaya_Zona);
      request.input('Krupnogabaritnyi_Tovar', mssql.NVarChar, data.Krupnogabaritnyi_Tovar);
      request.input('Yuvelirnye_Izdelia', mssql.NVarChar, data.Yuvelirnye_Izdelia);
      request.input('Pechat_Etiketki_s_SHK', mssql.NVarChar, data.Pechat_Etiketki_s_SHK);
      request.input('Pechat_Etiketki_s_Opisaniem', mssql.NVarChar, data.Pechat_Etiketki_s_Opisaniem);

      await request.query(query);

      res.status(200).json({ message: "Данные успешно записаны в базу." });
  } catch (err) {
      console.error('Ошибка при записи данных в базу:', err);
      res.status(500).json({ message: "Ошибка при записи данных в базу." });
  }
});

module.exports = router;


// 6. Новый маршрут для получения списка уникальных заданий в работе
// 6. Новый маршрут для получения уникальных заданий с прогрессом
router.get('/tasks-in-progress', async (req, res) => {
  try {
    // Подключаемся к базе данных
    const pool = await connectToDatabase();
    if (!pool) {
      return res.status(500).json({ message: "Ошибка подключения к базе данных." });
    }

    // Запрос для получения уникальных заданий с прогрессом
    const query = `
      SELECT Nazvanie_Zadaniya,
       COALESCE(MAX(Time_Start), '00:00:00') AS Time_Start,  
       COUNT(*) AS TotalTasks,
       SUM(CASE WHEN Status_Zadaniya = 1 THEN 1 ELSE 0 END) AS CompletedTasks
FROM Test_MP
WHERE Nazvanie_Zadaniya IN (
    SELECT Nazvanie_Zadaniya
    FROM Test_MP
    WHERE Status != 0 AND Status_Zadaniya = 0
    GROUP BY Nazvanie_Zadaniya
    HAVING COUNT(CASE WHEN Status_Zadaniya = 0 THEN 1 END) = COUNT(*)
)
GROUP BY Nazvanie_Zadaniya;

    `;

    const result = await pool.request().query(query);

    // Проверяем, если задания есть
    if (result.recordset.length === 0) {
      return res.status(404).json({ message: "Нет заданий в работе." });
    }

    // Группируем задания по имени и суммируем данные
    const tasksMap = new Map();

    result.recordset.forEach(row => {
      if (!tasksMap.has(row.Nazvanie_Zadaniya)) {
        tasksMap.set(row.Nazvanie_Zadaniya, {
          Nazvanie_Zadaniya: row.Nazvanie_Zadaniya,
          Time_Start: row.Time_Start,
          TotalTasks: row.TotalTasks,
          CompletedTasks: row.CompletedTasks,
        });
      } else {
        let task = tasksMap.get(row.Nazvanie_Zadaniya);
        task.TotalTasks += row.TotalTasks;
        task.CompletedTasks += row.CompletedTasks;
      }
    });

    // Вычисляем прогресс и добавляем его в каждый объект
    const tasksInProgress = Array.from(tasksMap.values()).map(task => {
      const progress = (task.CompletedTasks / task.TotalTasks) * 100;
      return {
        Nazvanie_Zadaniya: task.Nazvanie_Zadaniya,
        Time_Start: task.Time_Start,
        Progress: progress.toFixed(2),
        TotalTasks: task.TotalTasks,
        CompletedTasks: task.CompletedTasks,
      };
    });

    // Отправляем ответ с данными
    res.status(200).json({ tasksInProgress });
  } catch (err) {
    console.error('Ошибка при выполнении запроса:', err);
    res.status(500).json({ message: "Ошибка при получении списка заданий в работе." });
  }
});

module.exports = router;

// Новый маршрут для получения уникальных загруженных файлов
router.get('/uploaded-tasks', async (req, res) => {
  try {
    // Подключаемся к базе данных
    const pool = await connectToDatabase();
    if (!pool) {
      return res.status(500).json({ message: "Ошибка подключения к базе данных." });
    }

    // Запрос для получения уникальных названий файлов (без повторений)
    const query = `
      SELECT DISTINCT Nazvanie_Zadaniya
      FROM Test_MP
      WHERE Nazvanie_Zadaniya IS NOT NULL AND Nazvanie_Zadaniya != ''
    `;

    const result = await pool.request().query(query);

    // Проверяем, если задания есть
    if (result.recordset.length === 0) {
      return res.status(404).json({ message: "Нет загруженных файлов." });
    }

    // Формируем список загруженных файлов
    const uploadedFiles = result.recordset.map(row => row.Nazvanie_Zadaniya);

    // Отправляем ответ с уникальными названиями файлов
    res.status(200).json({ tasks: uploadedFiles });
  } catch (err) {
    console.error('Ошибка при выполнении запроса:', err);
    res.status(500).json({ message: "Ошибка при получении списка загруженных файлов." });
  }
});
