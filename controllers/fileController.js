const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const { sql, connectToDatabase } = require('../dbConfig');
const path = require('path');
const xlsx = require('xlsx'); // Для работы с Excel
const mssql = require('mssql');
const { determineTipPostavki, determineMono } = require('../utils/tipPostavkiHelper');
const { applyLduExcelHeaders } = require('../utils/lduUploadMapping');

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
    const query = "SELECT DISTINCT Nazvanie_Zadaniya FROM Test_MP WHERE Status_Zadaniya = 1 and  Scklad_Pref IN ('MSC-Polaris', 'NETR') ";
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

      const query = "SELECT Nazvanie_Zadaniya FROM Test_MP WHERE Status_Zadaniya = 1 ";
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

function processData(rows) {
  // Столбцы, для которых необходимо заменить 0 или "0" на пустую строку
  const columnsToCheck = [
    'Srok_Godnosti', 'Opasnyi_Tovar', 'Zakrytaya_Zona', 
    'Krupnogabaritnyi_Tovar', 'Yuvelirnye_Izdelia', 'Fakticheskoe_Kol_vo',
    'Ubrano_iz_Zakaza', 'Pechat_Etiketki_s_SHK', 'Pechat_Etiketki_s_Opisaniem',
    'Sortiruemyi_Tovar', 'Ne_Sortiruemyi_Tovar', 'Produkty',  'Upakovka_v_Gofro', 'Upakovka_v_PE_Paket', 'PriznakSortirovki',
    'Vlozhit_v_upakovku_pechatnyi_material',
    'Izmerenie_VGH_i_peredacha_informatsii',
    'Indeks_za_srochnost_koeff_1_5',
    'Kompleksnaya_priemka_tovara',
    'Priemka_tovara_v_transportnykh_korobakh',
    'Priemka_tovara_palletnaya',
    'Prochie_raboty_vklyuchaya_ustranenie_anomalii',
    'Razbrakovka_tovara',
    'Sborka_naborov_ot_2_shtuk_raznykh_tovarov',
    'Upakovka_tovara_v_gofromeyler',
    'Primeryka_SHK', 'Proverka_Sroka_Godnosti', 'Upakovka_v_Babl_Plenku', 'Upakovka_v_Ind_Korob',
    'Markirovka_Tovara_Stiker_CHZ', 'Udalenie_Stikera_Markirovki', 'Dopolnitelnaya_Zashchita_Tovara',
    'Markirovka_Transportnogo_Koroba', 'Formirovanie_Pallet_Otgruzki', 'Upakovochnyi_Material',
    'Markirovka_Palleta_TM', 'Raskomplekt_Zakaza', 'Zamorozhennaya_Zona',
  ];

  // Проходим по каждой строке данных и проверяем соответствующие столбцы
  rows.forEach(row => {
    columnsToCheck.forEach(column => {
      if (row[column] === 0 || row[column] === "0") {
        row[column] = ''; // Заменяем на пустую строку
      }
    });
  });

  return rows;
}

function processData(rows) {
  // Столбцы, для которых необходимо заменить "0", null или массивы с "null" на пустую строку
  const columnsToCheck = [
    'Srok_Godnosti', 'Opasnyi_Tovar', 'Zakrytaya_Zona', 
    'Krupnogabaritnyi_Tovar', 'Yuvelirnye_Izdelia', 'Fakticheskoe_Kol_vo',
    'Ubrano_iz_Zakaza', 'Pechat_Etiketki_s_SHK', 'Pechat_Etiketki_s_Opisaniem',
    'Sortiruemyi_Tovar', 'Ne_Sortiruemyi_Tovar', 'Produkty',  'Upakovka_v_Gofro', 'Upakovka_v_PE_Paket', 'PriznakSortirovki',
    'Vlozhit_v_upakovku_pechatnyi_material',
    'Izmerenie_VGH_i_peredacha_informatsii',
    'Indeks_za_srochnost_koeff_1_5',
    'Kompleksnaya_priemka_tovara',
    'Priemka_tovara_v_transportnykh_korobakh',
    'Priemka_tovara_palletnaya',
    'Prochie_raboty_vklyuchaya_ustranenie_anomalii',
    'Razbrakovka_tovara',
    'Sborka_naborov_ot_2_shtuk_raznykh_tovarov',
    'Upakovka_tovara_v_gofromeyler',
    'Primeryka_SHK', 'Proverka_Sroka_Godnosti', 'Upakovka_v_Babl_Plenku', 'Upakovka_v_Ind_Korob',
    'Markirovka_Tovara_Stiker_CHZ', 'Udalenie_Stikera_Markirovki', 'Dopolnitelnaya_Zashchita_Tovara',
    'Markirovka_Transportnogo_Koroba', 'Formirovanie_Pallet_Otgruzki', 'Upakovochnyi_Material',
    'Markirovka_Palleta_TM', 'Raskomplekt_Zakaza', 'Zamorozhennaya_Zona',
    
  ];

  // Проходим по каждой строке данных и очищаем данные
  rows.forEach(row => {
    columnsToCheck.forEach(column => {
      if (Array.isArray(row[column])) {
        // Если значение — массив и все элементы равны `null`, заменяем на пустую строку
        const uniqueValues = [...new Set(row[column])];
        if (uniqueValues.length === 1 && uniqueValues[0] === null) {
          row[column] = ''; // Заменяем массив с null на пустую строку
        }
      } else if (row[column] === 0 || row[column] === '0' || row[column] === null) {
        row[column] = ''; // Заменяем на пустую строку
      }
    });
  });

  return rows;
}

router.get('/all-records', async (req, res) => {
  try {
    // Подключаемся к базе данных
    const pool = await connectToDatabase();
    if (!pool) {
      return res.status(500).json({ message: "Ошибка подключения к базе данных." });
    }

    // Выполняем запрос для получения всех записей
    const query = "SELECT * FROM Test_MP";
    const result = await pool.request().query(query);

    if (result.recordset.length === 0) {
      return res.status(404).json({ message: "Нет записей в таблице Test_MP." });
    }

    // Возвращаем записи
    res.status(200).json(result.recordset);
  } catch (err) {
    console.error('Ошибка при выполнении запроса:', err);
    res.status(500).json({ message: "Ошибка при получении записей из таблицы Test_MP." });
  }
});

module.exports = router;

router.get('/download', async (req, res) => {
  try {
    const taskName = req.query.task;

    if (!taskName) {
      return res.status(400).json({ message: "Параметр 'task' обязателен." });
    }

    const isWB = taskName.includes('WB');
    const isKorob = determineTipPostavki(taskName) === true; // OZON коробочная поставка
    console.log(`Загрузка данных для задания: ${taskName}, isWB: ${isWB}, isKorob: ${isKorob}`);

    const pool = await connectToDatabase();
    if (!pool) {
      return res.status(500).json({ message: "Ошибка подключения к базе данных." });
    }

    let query1, query2;
    // WB: всегда по логике Привязка + полный отчёт из Test_MP (без изменений)
    if (isWB || isKorob) {
      query1 = `
        SELECT 
          p.Nazvanie_Zadaniya,
          p.Artikul,
          m.SHK as Barcode,
          p.Kolvo_Tovarov,
          p.SHK_Coroba,
          p.Srok_Godnosti,
          REPLACE(CAST(p.Pallet_No AS NVARCHAR(255)), CHAR(10), '') as Pallet_No,
          REPLACE(CAST(p.SHK_WPS AS NVARCHAR(255)), CHAR(10), '') as SHK_WPS
        FROM Test_MP_Privyazka p
        LEFT JOIN Test_MP m
          ON p.Artikul = m.Artikul AND m.Nazvanie_Zadaniya = @Nazvanie_Zadaniya
        WHERE p.Nazvanie_Zadaniya = @Nazvanie_Zadaniya
      `;

      query2 = `
        SELECT vp, Nazvanie_Zadaniya, Artikul, Artikul_Syrya, Nomenklatura, Nazvanie_Tovara, SHK, SHK_Syrya, Kol_vo_Syrya, Itog_Zakaz,
               Itog_MP, SOH, Srok_Godnosti, Sortiruemyi_Tovar, Ne_Sortiruemyi_Tovar, Produkty,
               Opasnyi_Tovar, Zakrytaya_Zona, Krupnogabaritnyi_Tovar, Yuvelirnye_Izdelia, Pechat_Etiketki_s_SHK, Pechat_Etiketki_s_Opisaniem,
               Upakovka_v_Gofro, Upakovka_v_PE_Paket, PriznakSortirovki,
               Vlozhit_v_upakovku_pechatnyi_material, Izmerenie_VGH_i_peredacha_informatsii, Indeks_za_srochnost_koeff_1_5, Kompleksnaya_priemka_tovara, Priemka_tovara_v_transportnykh_korobakh, Priemka_tovara_palletnaya, Prochie_raboty_vklyuchaya_ustranenie_anomalii, Razbrakovka_tovara, Sborka_naborov_ot_2_shtuk_raznykh_tovarov, Upakovka_tovara_v_gofromeyler,
               Primeryka_SHK, Proverka_Sroka_Godnosti, Upakovka_v_Babl_Plenku, Upakovka_v_Ind_Korob, Markirovka_Tovara_Stiker_CHZ, Udalenie_Stikera_Markirovki, Dopolnitelnaya_Zashchita_Tovara, Markirovka_Transportnogo_Koroba, Formirovanie_Pallet_Otgruzki, Upakovochnyi_Material, Markirovka_Palleta_TM, Raskomplekt_Zakaza, Tip_Operatsii_LDU, Zamorozhennaya_Zona, Khranenie_tovara,
               Mesto, Vlozhennost, Pallet_No, Ispolnitel, SHK_WPS, reason, comment,
               Fakticheskoe_Kol_vo, Ubrano_iz_Zakaza, Time_Start, Time_End
        FROM Test_MP WHERE Nazvanie_Zadaniya = @Nazvanie_Zadaniya
      `;
    } else {
      // OZON паллетная: только Test_MP
      query1 = `
        SELECT vp, Nazvanie_Zadaniya, Artikul, Artikul_Syrya, Nomenklatura, Nazvanie_Tovara, SHK, SHK_Syrya, Kol_vo_Syrya, Itog_Zakaz,
               Itog_MP, SOH, Srok_Godnosti, Opasnyi_Tovar, Zakrytaya_Zona, Krupnogabaritnyi_Tovar, Yuvelirnye_Izdelia,
               Fakticheskoe_Kol_vo, Ubrano_iz_Zakaza, Pechat_Etiketki_s_SHK, Pechat_Etiketki_s_Opisaniem,
               Sortiruemyi_Tovar, Ne_Sortiruemyi_Tovar, Produkty,
               Upakovka_v_Gofro, Upakovka_v_PE_Paket, PriznakSortirovki,
               Vlozhit_v_upakovku_pechatnyi_material, Izmerenie_VGH_i_peredacha_informatsii, Indeks_za_srochnost_koeff_1_5, Kompleksnaya_priemka_tovara, Priemka_tovara_v_transportnykh_korobakh, Priemka_tovara_palletnaya, Prochie_raboty_vklyuchaya_ustranenie_anomalii, Razbrakovka_tovara, Sborka_naborov_ot_2_shtuk_raznykh_tovarov, Upakovka_tovara_v_gofromeyler,
               Primeryka_SHK, Proverka_Sroka_Godnosti, Upakovka_v_Babl_Plenku, Upakovka_v_Ind_Korob, Markirovka_Tovara_Stiker_CHZ, Udalenie_Stikera_Markirovki, Dopolnitelnaya_Zashchita_Tovara, Markirovka_Transportnogo_Koroba, Formirovanie_Pallet_Otgruzki, Upakovochnyi_Material, Markirovka_Palleta_TM, Raskomplekt_Zakaza, Tip_Operatsii_LDU, Zamorozhennaya_Zona, Khranenie_tovara,
               Mesto, Vlozhennost, Pallet_No, Ispolnitel, SHK_WPS, reason, comment,
               Time_Start, Time_End
        FROM Test_MP WHERE Nazvanie_Zadaniya = @Nazvanie_Zadaniya
      `;
    }

    const request = pool.request();
    request.input('Nazvanie_Zadaniya', mssql.NVarChar(255), taskName);
    const result1 = await request.query(query1);

    if (result1.recordset.length === 0) {
      return res.status(404).json({ message: "Данные для указанного задания не найдены." });
    }

    let result2 = null;
    // dataSet2 (общий отчёт со всеми полями): только для WB и OZON короб
    if (query2) {
      result2 = await request.query(query2);
    }

    const processedData1 = processData(result1.recordset);
    const processedData2 = result2 ? processData(result2.recordset) : [];

    const combinedData = {
      dataSet1: processedData1,
      dataSet2: processedData2
    };

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
      const data = applyLduExcelHeaders(req.body);

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
      const tipPostavki = determineTipPostavki(data.Nazvanie_Zadaniya);
      const mono = determineMono(data.Nazvanie_Zadaniya);
      // Пример запроса на вставку данных в таблицу Test_MP
      const query = `
        INSERT INTO Test_MP 
          (Artikul, Artikul_Syrya, Nomenklatura, Nazvanie_Tovara, SHK, SHK_Syrya, SHK_SPO, Kol_vo_Syrya, Itog_Zakaz, SOH, 
           Tip_Postavki, Srok_Godnosti, 
           Mesto, Vlozhennost, Pallet_No, Pref, Nazvanie_Zadaniya, Status, Status_Zadaniya, Scklad_Pref, 
           Sortiruemyi_Tovar, Ne_Sortiruemyi_Tovar, Produkty, Opasnyi_Tovar, Zakrytaya_Zona, Krupnogabaritnyi_Tovar, 
           Yuvelirnye_Izdelia, Pechat_Etiketki_s_SHK, Pechat_Etiketki_s_Opisaniem, vp, Plan_Otkaz, Upakovka_v_Gofro, Upakovka_v_PE_Paket, PriznakSortirovki
         , 
  Vlozhit_v_upakovku_pechatnyi_material, Izmerenie_VGH_i_peredacha_informatsii, Indeks_za_srochnost_koeff_1_5, Kompleksnaya_priemka_tovara, Priemka_tovara_v_transportnykh_korobakh, Priemka_tovara_palletnaya, Prochie_raboty_vklyuchaya_ustranenie_anomalii, Razbrakovka_tovara, Sborka_naborov_ot_2_shtuk_raznykh_tovarov, Upakovka_tovara_v_gofromeyler, Khranenie_tovara,
          Primeryka_SHK, Proverka_Sroka_Godnosti, Upakovka_v_Babl_Plenku, Upakovka_v_Ind_Korob, Markirovka_Tovara_Stiker_CHZ, Udalenie_Stikera_Markirovki, Dopolnitelnaya_Zashchita_Tovara, Markirovka_Transportnogo_Koroba, Formirovanie_Pallet_Otgruzki, Upakovochnyi_Material, Markirovka_Palleta_TM, Raskomplekt_Zakaza, Tip_Operatsii_LDU, Zamorozhennaya_Zona, tipPostavki, Mono

)
        VALUES 
          (@Artikul, @Artikul_Syrya, @Nomenklatura, @Nazvanie_Tovara, @SHK, @SHK_Syrya, @SHK_SPO, @Kol_vo_Syrya, @Itog_Zakaz, @SOH,
           @Tip_Postavki, @Srok_Godnosti, 
           @Mesto, @Vlozhennost, @Pallet_No, @Pref, @Nazvanie_Zadaniya, @Status, @Status_Zadaniya, @Scklad_Pref,
           @Sortiruemyi_Tovar, @Ne_Sortiruemyi_Tovar, @Produkty, @Opasnyi_Tovar, @Zakrytaya_Zona, @Krupnogabaritnyi_Tovar, 
           @Yuvelirnye_Izdelia, @Pechat_Etiketki_s_SHK, @Pechat_Etiketki_s_Opisaniem, @vp, @Plan_Otkaz, @Upakovka_v_Gofro, @Upakovka_v_PE_Paket, @PriznakSortirovki
            , @Vlozhit_v_upakovku_pechatnyi_material, @Izmerenie_VGH_i_peredacha_informatsii, @Indeks_za_srochnost_koeff_1_5, @Kompleksnaya_priemka_tovara, @Priemka_tovara_v_transportnykh_korobakh, @Priemka_tovara_palletnaya, @Prochie_raboty_vklyuchaya_ustranenie_anomalii, @Razbrakovka_tovara, @Sborka_naborov_ot_2_shtuk_raznykh_tovarov, @Upakovka_tovara_v_gofromeyler, @Khranenie_tovara,
            @Primeryka_SHK, @Proverka_Sroka_Godnosti, @Upakovka_v_Babl_Plenku, @Upakovka_v_Ind_Korob, @Markirovka_Tovara_Stiker_CHZ, @Udalenie_Stikera_Markirovki, @Dopolnitelnaya_Zashchita_Tovara, @Markirovka_Transportnogo_Koroba, @Formirovanie_Pallet_Otgruzki, @Upakovochnyi_Material, @Markirovka_Palleta_TM, @Raskomplekt_Zakaza, @Tip_Operatsii_LDU, @Zamorozhennaya_Zona, @tipPostavki, @Mono

            )
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
      request.input('tipPostavki', mssql.Bit, tipPostavki);
      request.input('Srok_Godnosti', mssql.NVarChar, data.Srok_Godnosti);
      request.input('Upakovka_v_Gofro', mssql.NVarChar, data.Upakovka_v_Gofro);
      request.input('Upakovka_v_PE_Paket', mssql.NVarChar, data.Upakovka_v_PE_Paket);
      request.input('PriznakSortirovki', mssql.NVarChar, data.PriznakSortirovki);
      request.input('Sortiruemyi_Tovar', mssql.NVarChar, data.Sortiruemyi_Tovar);
      request.input('Ne_Sortiruemyi_Tovar', mssql.NVarChar, data.Ne_Sortiruemyi_Tovar);
      request.input('Produkty', mssql.NVarChar, data.Produkty);
      request.input('Opasnyi_Tovar', mssql.NVarChar, data.Opasnyi_Tovar);
      request.input('Zakrytaya_Zona', mssql.NVarChar, data.Zakrytaya_Zona);
      request.input('Krupnogabaritnyi_Tovar', mssql.NVarChar, data.Krupnogabaritnyi_Tovar);
      request.input('Yuvelirnye_Izdelia', mssql.NVarChar, data.Yuvelirnye_Izdelia);
      request.input('Pechat_Etiketki_s_SHK', mssql.NVarChar, data.Pechat_Etiketki_s_SHK);
      request.input('Pechat_Etiketki_s_Opisaniem', mssql.NVarChar(10), data.Pechat_Etiketki_s_Opisaniem ?? '0');
      request.input('vp', mssql.NVarChar(10), data.vp ?? '0');
      request.input('Plan_Otkaz', mssql.NVarChar(10), data.Plan_Otkaz ?? '0');
      request.input('Mesto', mssql.Int, data.Mesto);
      request.input('Vlozhennost', mssql.Int, data.Vlozhennost);
      request.input('Pallet_No', mssql.Int, data.Pallet_No);
      request.input('Pref', mssql.NVarChar, data.pref);
      request.input('Nazvanie_Zadaniya', mssql.NVarChar, data.Nazvanie_Zadaniya);
      request.input('Status', mssql.Int, data.Status);
      request.input('Status_Zadaniya', mssql.Int, data.Status_Zadaniya);
      request.input('Scklad_Pref', mssql.NVarChar, data.Scklad_Pref);
      
      // Добавляем недостающие параметры
      request.input('Vlozhit_v_upakovku_pechatnyi_material', mssql.NVarChar, data.Vlozhit_v_upakovku_pechatnyi_material);
      request.input('Izmerenie_VGH_i_peredacha_informatsii', mssql.NVarChar, data.Izmerenie_VGH_i_peredacha_informatsii);
      request.input('Indeks_za_srochnost_koeff_1_5', mssql.NVarChar, data.Indeks_za_srochnost_koeff_1_5);
      request.input('Kompleksnaya_priemka_tovara', mssql.NVarChar, data.Kompleksnaya_priemka_tovara);
      request.input('Priemka_tovara_v_transportnykh_korobakh', mssql.NVarChar, data.Priemka_tovara_v_transportnykh_korobakh);
      request.input('Priemka_tovara_palletnaya', mssql.NVarChar, data.Priemka_tovara_palletnaya);
      request.input('Prochie_raboty_vklyuchaya_ustranenie_anomalii', mssql.NVarChar, data.Prochie_raboty_vklyuchaya_ustranenie_anomalii);
      request.input('Razbrakovka_tovara', mssql.NVarChar, data.Razbrakovka_tovara);
      request.input('Sborka_naborov_ot_2_shtuk_raznykh_tovarov', mssql.NVarChar, data.Sborka_naborov_ot_2_shtuk_raznykh_tovarov);
      request.input('Upakovka_tovara_v_gofromeyler', mssql.NVarChar, data.Upakovka_tovara_v_gofromeyler);
      request.input('Khranenie_tovara', mssql.NVarChar, data.Khranenie_tovara ?? null);
      request.input('Mono', mssql.Bit, mono);
      request.input('Primeryka_SHK', mssql.NVarChar, data.Primeryka_SHK ?? null);
      request.input('Proverka_Sroka_Godnosti', mssql.NVarChar, data.Proverka_Sroka_Godnosti ?? null);
      request.input('Upakovka_v_Babl_Plenku', mssql.NVarChar, data.Upakovka_v_Babl_Plenku ?? null);
      request.input('Upakovka_v_Ind_Korob', mssql.NVarChar, data.Upakovka_v_Ind_Korob ?? null);
      request.input('Markirovka_Tovara_Stiker_CHZ', mssql.NVarChar, data.Markirovka_Tovara_Stiker_CHZ ?? null);
      request.input('Udalenie_Stikera_Markirovki', mssql.NVarChar, data.Udalenie_Stikera_Markirovki ?? null);
      request.input('Dopolnitelnaya_Zashchita_Tovara', mssql.NVarChar, data.Dopolnitelnaya_Zashchita_Tovara ?? null);
      request.input('Markirovka_Transportnogo_Koroba', mssql.NVarChar, data.Markirovka_Transportnogo_Koroba ?? null);
      request.input('Formirovanie_Pallet_Otgruzki', mssql.NVarChar, data.Formirovanie_Pallet_Otgruzki ?? null);
      request.input('Upakovochnyi_Material', mssql.NVarChar, data.Upakovochnyi_Material ?? null);
      request.input('Markirovka_Palleta_TM', mssql.NVarChar, data.Markirovka_Palleta_TM ?? null);
      request.input('Raskomplekt_Zakaza', mssql.NVarChar, data.Raskomplekt_Zakaza ?? null);
      request.input('Tip_Operatsii_LDU', mssql.NVarChar, data.Tip_Operatsii_LDU ?? null);
      request.input('Zamorozhennaya_Zona', mssql.NVarChar, data.Zamorozhennaya_Zona ?? null);

      await request.query(query);
  
      res.status(200).json({ message: "Данные успешно записаны в базу." });
    } catch (err) {
      console.error('Ошибка при записи данных в базу:', err);
      res.status(500).json({ message: "Ошибка при записи данных в базу." });
    }
});

router.post('/upload-data-new', async (req, res) => {
  try {
      const data = applyLduExcelHeaders(req.body);

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

      // Determine tipPostavki from filename (Nazvanie_Zadaniya)
      // Logic: if filename contains "короб" or "коробочн" → true (box delivery)
      //        if filename contains "паллет" → false (pallet delivery)
      const tipPostavki = determineTipPostavki(data.Nazvanie_Zadaniya);
      
      // Determine Mono flag from filename (Nazvanie_Zadaniya)
      // Logic: if filename contains "МОНО" → true (only one article per pallet)
      const mono = determineMono(data.Nazvanie_Zadaniya);

      const query = `
          INSERT INTO Test_MP 
          (Artikul, Artikul_Syrya, Nomenklatura, Nazvanie_Tovara, SHK, SHK_Syrya, SHK_SPO, Kol_vo_Syrya, Itog_Zakaz, SOH, 
          Tip_Postavki, Srok_Godnosti, 
          Mesto, Vlozhennost, Pallet_No, Pref, Nazvanie_Zadaniya, Status, Status_Zadaniya, Scklad_Pref, 
          Sortiruemyi_Tovar, Ne_Sortiruemyi_Tovar, Produkty, Opasnyi_Tovar, Zakrytaya_Zona, Krupnogabaritnyi_Tovar, 
          Yuvelirnye_Izdelia, Pechat_Etiketki_s_SHK, Pechat_Etiketki_s_Opisaniem, vp, Plan_Otkaz, Upakovka_v_Gofro, Upakovka_v_PE_Paket, PriznakSortirovki, 
  Vlozhit_v_upakovku_pechatnyi_material, Izmerenie_VGH_i_peredacha_informatsii, Indeks_za_srochnost_koeff_1_5, Kompleksnaya_priemka_tovara, Priemka_tovara_v_transportnykh_korobakh, Priemka_tovara_palletnaya, Prochie_raboty_vklyuchaya_ustranenie_anomalii, Razbrakovka_tovara, Sborka_naborov_ot_2_shtuk_raznykh_tovarov, Upakovka_tovara_v_gofromeyler, Khranenie_tovara,
          Primeryka_SHK, Proverka_Sroka_Godnosti, Upakovka_v_Babl_Plenku, Upakovka_v_Ind_Korob, Markirovka_Tovara_Stiker_CHZ, Udalenie_Stikera_Markirovki, Dopolnitelnaya_Zashchita_Tovara, Markirovka_Transportnogo_Koroba, Formirovanie_Pallet_Otgruzki, Upakovochnyi_Material, Markirovka_Palleta_TM, Raskomplekt_Zakaza, Tip_Operatsii_LDU, Zamorozhennaya_Zona, tipPostavki, Mono
)
          VALUES 
          (@Artikul, @Artikul_Syrya, @Nomenklatura, @Nazvanie_Tovara, @SHK, @SHK_Syrya, @SHK_SPO, @Kol_vo_Syrya, @Itog_Zakaz, @SOH,
          @Tip_Postavki, @Srok_Godnosti, 
          @Mesto, @Vlozhennost, @Pallet_No, @Pref, @Nazvanie_Zadaniya, @Status, @Status_Zadaniya, @Scklad_Pref,
          @Sortiruemyi_Tovar, @Ne_Sortiruemyi_Tovar, @Produkty, @Opasnyi_Tovar, @Zakrytaya_Zona, @Krupnogabaritnyi_Tovar, 
          @Yuvelirnye_Izdelia, @Pechat_Etiketki_s_SHK, @Pechat_Etiketki_s_Opisaniem, @vp, @Plan_Otkaz, @Upakovka_v_Gofro, @Upakovka_v_PE_Paket, @PriznakSortirovki
                      , @Vlozhit_v_upakovku_pechatnyi_material, @Izmerenie_VGH_i_peredacha_informatsii, @Indeks_za_srochnost_koeff_1_5, @Kompleksnaya_priemka_tovara, @Priemka_tovara_v_transportnykh_korobakh, @Priemka_tovara_palletnaya, @Prochie_raboty_vklyuchaya_ustranenie_anomalii, @Razbrakovka_tovara, @Sborka_naborov_ot_2_shtuk_raznykh_tovarov, @Upakovka_tovara_v_gofromeyler, @Khranenie_tovara,
          @Primeryka_SHK, @Proverka_Sroka_Godnosti, @Upakovka_v_Babl_Plenku, @Upakovka_v_Ind_Korob, @Markirovka_Tovara_Stiker_CHZ, @Udalenie_Stikera_Markirovki, @Dopolnitelnaya_Zashchita_Tovara, @Markirovka_Transportnogo_Koroba, @Formirovanie_Pallet_Otgruzki, @Upakovochnyi_Material, @Markirovka_Palleta_TM, @Raskomplekt_Zakaza, @Tip_Operatsii_LDU, @Zamorozhennaya_Zona, @tipPostavki, @Mono
)
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
      request.input('tipPostavki', mssql.Bit, tipPostavki); // Add new tipPostavki field
      request.input('Srok_Godnosti', mssql.NVarChar, data.Srok_Godnosti);
      request.input('PriznakSortirovki', mssql.NVarChar, data.PriznakSortirovki);
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
      request.input('Pechat_Etiketki_s_Opisaniem', mssql.NVarChar(10), data.Pechat_Etiketki_s_Opisaniem ?? '0');
      request.input('vp', mssql.NVarChar(10), data.vp ?? '0');
      request.input('Plan_Otkaz', mssql.NVarChar(10), data.Plan_Otkaz ?? '0');
      request.input('Upakovka_v_Gofro', mssql.NVarChar(255), data.Upakovka_v_Gofro ?? '0');
      request.input('Upakovka_v_PE_Paket', mssql.NVarChar(10), data.Upakovka_v_PE_Paket ?? '0');
      
      // Добавляем недостающие параметры
      request.input('Vlozhit_v_upakovku_pechatnyi_material', mssql.NVarChar, data.Vlozhit_v_upakovku_pechatnyi_material);
      request.input('Izmerenie_VGH_i_peredacha_informatsii', mssql.NVarChar, data.Izmerenie_VGH_i_peredacha_informatsii);
      request.input('Indeks_za_srochnost_koeff_1_5', mssql.NVarChar, data.Indeks_za_srochnost_koeff_1_5);
      request.input('Kompleksnaya_priemka_tovara', mssql.NVarChar, data.Kompleksnaya_priemka_tovara);
      request.input('Priemka_tovara_v_transportnykh_korobakh', mssql.NVarChar, data.Priemka_tovara_v_transportnykh_korobakh);
      request.input('Priemka_tovara_palletnaya', mssql.NVarChar, data.Priemka_tovara_palletnaya);
      request.input('Prochie_raboty_vklyuchaya_ustranenie_anomalii', mssql.NVarChar, data.Prochie_raboty_vklyuchaya_ustranenie_anomalii);
      request.input('Razbrakovka_tovara', mssql.NVarChar, data.Razbrakovka_tovara);
      request.input('Sborka_naborov_ot_2_shtuk_raznykh_tovarov', mssql.NVarChar, data.Sborka_naborov_ot_2_shtuk_raznykh_tovarov);
      request.input('Upakovka_tovara_v_gofromeyler', mssql.NVarChar, data.Upakovka_tovara_v_gofromeyler);
      request.input('Khranenie_tovara', mssql.NVarChar, data.Khranenie_tovara ?? null);
      request.input('Mono', mssql.Bit, mono); // Add Mono field
      request.input('Primeryka_SHK', mssql.NVarChar, data.Primeryka_SHK ?? null);
      request.input('Proverka_Sroka_Godnosti', mssql.NVarChar, data.Proverka_Sroka_Godnosti ?? null);
      request.input('Upakovka_v_Babl_Plenku', mssql.NVarChar, data.Upakovka_v_Babl_Plenku ?? null);
      request.input('Upakovka_v_Ind_Korob', mssql.NVarChar, data.Upakovka_v_Ind_Korob ?? null);
      request.input('Markirovka_Tovara_Stiker_CHZ', mssql.NVarChar, data.Markirovka_Tovara_Stiker_CHZ ?? null);
      request.input('Udalenie_Stikera_Markirovki', mssql.NVarChar, data.Udalenie_Stikera_Markirovki ?? null);
      request.input('Dopolnitelnaya_Zashchita_Tovara', mssql.NVarChar, data.Dopolnitelnaya_Zashchita_Tovara ?? null);
      request.input('Markirovka_Transportnogo_Koroba', mssql.NVarChar, data.Markirovka_Transportnogo_Koroba ?? null);
      request.input('Formirovanie_Pallet_Otgruzki', mssql.NVarChar, data.Formirovanie_Pallet_Otgruzki ?? null);
      request.input('Upakovochnyi_Material', mssql.NVarChar, data.Upakovochnyi_Material ?? null);
      request.input('Markirovka_Palleta_TM', mssql.NVarChar, data.Markirovka_Palleta_TM ?? null);
      request.input('Raskomplekt_Zakaza', mssql.NVarChar, data.Raskomplekt_Zakaza ?? null);
      request.input('Tip_Operatsii_LDU', mssql.NVarChar, data.Tip_Operatsii_LDU ?? null);
      request.input('Zamorozhennaya_Zona', mssql.NVarChar, data.Zamorozhennaya_Zona ?? null);
      
      await request.query(query);

      res.status(200).json({ message: "Данные успешно записаны в базу." });
  } catch (err) {
      console.error('Ошибка при записи данных в базу:', err);
      res.status(500).json({ message: "Ошибка при записи данных в базу." });
  }
});

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
    WHERE Status != 0 AND Status_Zadaniya = 0 and Scklad_Pref = 'MSC-Polaris'
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
