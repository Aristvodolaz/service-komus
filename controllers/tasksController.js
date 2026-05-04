const mssql = require('mssql');
const { connectToDatabase, sql } = require('../dbConfig');
const { error } = require('winston');
const { determineTipPostavki, determineMono } = require('../utils/tipPostavkiHelper');

const getArticulsByTaskNumber = async (req, res) => {
  const { taskNumber } = req.query;

  if (!taskNumber) {
    return res.status(400).json({ success: false, value: 'taskNumber is required', errorCode: 400 });
  }

  try {
    const pool = await connectToDatabase();
    if (!pool) {
      throw new Error('Ошибка подключения к базе данных');
    }

    const result = await pool.request()
      .input('Nazvanie_Zadaniya', mssql.NVarChar(255), taskNumber)
      .query('SELECT * FROM Test_MP WHERE Nazvanie_Zadaniya = @Nazvanie_Zadaniya');

    res.status(200).json({ success: true, value: result.recordset, errorCode: 200 });
  } catch (error) {
    console.error('Ошибка при получении списка артикулов:', error);
    res.status(500).json({ success: false, value: null, errorCode: 500 });
  }
};

const getTaskByStatus = async (req, res) => {
  const { taskNumber, status } = req.query;

  // Проверка наличия параметров taskNumber и status
  if (!taskNumber || status === undefined) {
    return res.status(400).json({
      success: false,
      value: 'taskNumber and status are required',
      errorCode: 400
    });
  }

  try {
    const pool = await connectToDatabase();
    if (!pool) {
      throw new Error('Ошибка подключения к базе данных');
    }

    // Если статус равен 0, выбираем записи, где Status 0 или 1
    let query;
    if (status == 0) {
      query = 'SELECT * FROM Test_MP WHERE Nazvanie_Zadaniya = @Nazvanie_Zadaniya and Status IN (0, 1)';
    } else if(status ==3){
      query = 'SELECT * FROM Test_MP WHERE Nazvanie_Zadaniya = @Nazvanie_Zadaniya and Status IN (3, 4)';
    }else if(status == 2){
      query = 'SELECT * FROM Test_MP WHERE Nazvanie_Zadaniya = @Nazvanie_Zadaniya and Status IN (2, 3, 4)';
    }else {
      query = 'SELECT * FROM Test_MP WHERE Nazvanie_Zadaniya = @Nazvanie_Zadaniya and Status = @Status';
    }

    // Выполняем запрос к базе данных
    const result = await pool.request()
      .input('Nazvanie_Zadaniya', mssql.NVarChar(255), taskNumber)
      .input('Status', mssql.Int, status)
      .query(query);

    // Возвращаем успешный результат
    res.status(200).json({
      success: true,
      value: result.recordset,
      errorCode: 200
    });
  } catch (error) {
    // Обработка ошибок
    console.error('Ошибка при получении списка задач:', error);
    res.status(500).json({
      success: false,
      value: null,
      errorCode: 500
    });
  }
};

const getUniqueTaskNames = async (req, res) => {
  const { filter, sk } = req.query;

  try {
    const pool = await connectToDatabase();
    if (!pool) {
      throw new Error('Ошибка подключения к базе данных');
    }

    let query = `
      SELECT Nazvanie_Zadaniya, Scklad_Pref, tipPostavki, Mono
      FROM Test_MP 
      WHERE Status_Zadaniya = 0
    `;
    const request = pool.request();

    // Добавляем фильтр по названию задания, если он есть
    if (filter && filter.trim() !== '') {
      query += ' AND Nazvanie_Zadaniya LIKE @filter';
      request.input('filter', mssql.NVarChar(255), `%${filter}%`);
    }

    // Добавляем фильтр по складу, если он есть
    if (sk && sk.trim() !== '') {
      query += ' AND Scklad_Pref = @sk';
      request.input('sk', mssql.NVarChar(255), sk);
    }

    // Группируем результат по полям
    query += `
      GROUP BY Nazvanie_Zadaniya, Scklad_Pref, tipPostavki, Mono
    `;

    const result = await request.query(query);

    res.status(200).json({
      success: true,
      value: result.recordset.map(row => ({
        Nazvanie_Zadaniya: row.Nazvanie_Zadaniya,
        Scklad_Pref: row.Scklad_Pref,
        tipPostavki: row.tipPostavki !== null 
          ? row.tipPostavki 
          : determineTipPostavki(row.Nazvanie_Zadaniya), // Calculate from name if not set in DB
        mono: row.Mono !== null 
          ? row.Mono 
          : determineMono(row.Nazvanie_Zadaniya), // Calculate from name if not set in DB
      })),
      errorCode: 200,
    });
  } catch (error) {
    console.error('Ошибка при получении уникальных названий заданий:', error);
    res.status(500).json({ success: false, value: null, errorCode: 500 });
  }
};




const getByShk = async (req, res) => {
  const { taskName, shk } = req.query;

  if (!taskName || !shk) {
    return res.status(400).json({ success: false, value: 'taskName and shk are required', errorCode: 400 });
  }

  try {
    const pool = await connectToDatabase();
    if (!pool) {
      return res.status(500).json({ success: false, value: null, errorCode: 500 });
    }

    // Получение записи
    const selectResult = await pool.request()
      .input('Nazvanie_Zadaniya', mssql.NVarChar(255), taskName)
      .input('SHK', mssql.NVarChar(50), `%${shk}%`)
      .query('SELECT * FROM Test_MP WHERE Nazvanie_Zadaniya = @Nazvanie_Zadaniya AND SHK LIKE @SHK');

    if (selectResult.recordset.length === 0) {
      return res.status(200).json({ success: false, value: null, errorCode: 200 });
    }

    // Обновление найденных записей
    await pool.request()
    .input('Nazvanie_Zadaniya', mssql.NVarChar(255), taskName)
    .input('Old_SHK', mssql.NVarChar(50), `%${shk}%`)
    .input('New_SHK', mssql.NVarChar(50), shk)
    .query('UPDATE Test_MP SET SHK = @New_SHK WHERE Nazvanie_Zadaniya = @Nazvanie_Zadaniya AND SHK LIKE @Old_SHK');

    res.status(200).json({
      success: true,
      value: selectResult.recordset,
      errorCode: 200,
    });
  } catch (error) {
    console.error('Ошибка при обработке запроса:', error);
    res.status(500).json({ success: false, value: null, errorCode: 500 });
  }
};


const updateStatus = async (req, res) => {
  const { taskName, articul, status, startTime, ispolnitel } = req.body;

  if (!taskName || !articul || status === undefined|| !startTime || !ispolnitel) {
    return res.status(400).json({ success: false, value: 'Недостаточно данных для запроса', errorCode: 400 });
  }

  try {
    const pool = await connectToDatabase();
    if (!pool) {
      throw new Error('Ошибка подключения к базе данных');
    }

    await pool.request()
      .input('Nazvanie_Zadaniya', mssql.NVarChar(255), taskName)
      .input('Artikul', mssql.NVarChar(50), articul)
      .input('Status', mssql.Int, status)
      .input('Time_Start', mssql.NVarChar(255), startTime)
      .input('Ispolnitel', mssql.NVarChar(255), ispolnitel)
      .query('UPDATE Test_MP SET Status = @Status, Time_Start = @Time_Start , Ispolnitel = @Ispolnitel WHERE Nazvanie_Zadaniya = @Nazvanie_Zadaniya AND Artikul = @Artikul');

    res.status(200).json({ success: true, value: 'Статус успешно обновлен', errorCode: 200 });
  } catch (error) {
    console.error('Ошибка при обновлении статуса:', error);
    res.status(500).json({ success: false, value: null, errorCode: 500 });
  }
};

const endStatus = async (req, res) => {
  const { taskName, articul, status, endTime, ispolnitel, statusZadaniya } = req.body;

  if (!taskName || !articul || status === undefined|| !endTime || !ispolnitel) {
    return res.status(400).json({ success: false, value: 'Недостаточно данных для запроса', errorCode: 400 });
  }

  try {
    const pool = await connectToDatabase();
    if (!pool) {
      throw new Error('Ошибка подключения к базе данных');
    }

    await pool.request()
      .input('Nazvanie_Zadaniya', mssql.NVarChar(255), taskName)
      .input('Artikul', mssql.NVarChar(50), articul)
      .input('Status', mssql.Int, 2)
      .input('Status_Zadaniya', mssql.Int, 1)
      .input('Time_End', mssql.NVarChar(255), endTime)
      .input('Ispolnitel', mssql.NVarChar(255), ispolnitel)
      .query('UPDATE Test_MP SET Status = @Status, Time_End = @Time_End,Status_Zadaniya = @Status_Zadaniya , Ispolnitel = @Ispolnitel WHERE Nazvanie_Zadaniya = @Nazvanie_Zadaniya AND Artikul = @Artikul');

    res.status(200).json({ success: true, value: 'Статус успешно обновлен', errorCode: 200 });
  } catch (error) {
    console.error('Ошибка при обновлении статуса:', error);
    res.status(500).json({ success: false, value: null, errorCode: 500 });
  }
};

const getRecordsByArticul = async (req, res) => {
  const { taskName, articul } = req.query;

  if (!taskName || !articul) {
    return res.status(400).json({ success: false, value: 'taskName and articul are required', errorCode: 400 });
  }

  try {
    const pool = await connectToDatabase();
    if (!pool) {
      throw new Error('Ошибка подключения к базе данных');
    }

    const result = await pool.request()
      .input('Nazvanie_Zadaniya', mssql.NVarChar(255), taskName)
      .input('Artikul', mssql.Int, articul)
      .query('SELECT * FROM Test_MP WHERE Artikul = @Artikul AND Nazvanie_Zadaniya = @Nazvanie_Zadaniya');

    res.status(200).json({ success: true, value: result.recordset, errorCode: 200 });
  } catch (error) {
    console.error('Ошибка при получении записей по артикулу:', error);
    res.status(500).json({ success: false, value: null, errorCode: 500 });
  }
};

const deleteRecordsByWB = async (req, res) => {
  const { id } = req.query;

  if (!id || isNaN(id)) {
    return res.status(400).json({ success: false, value: 'Valid id is required', errorCode: 400 });
  }

  try {
    const pool = await connectToDatabase();
    if (!pool) {
      throw new Error('Ошибка подключения к базе данных');
    }

    const result = await pool.request()
      .input('ID', mssql.BigInt, BigInt(id))
      .query(`DELETE FROM Test_MP_Privyazka WHERE ID = @ID`);

    if (result.rowsAffected[0] > 0) {
      res.status(200).json({ success: true, value: null, errorCode: 200 });
    } else {
      res.status(404).json({ success: false, value: 'Record not found', errorCode: 404 });
    }
  } catch (error) {
    console.error('Ошибка при удалении записи:', error, 'ID:', id);
    res.status(500).json({ success: false, value: error.message, errorCode: 500 });
  }
};


const deleteRecordByOzon = async (req, res) => {
  const { id, taskName } = req.query;

  if (!id || !taskName) {
    return res.status(400).json({ success: false, value: 'id and taskName are required', errorCode: 400 });
  }

  try {
    const pool = await connectToDatabase();
    if (!pool) {
      throw new Error('Ошибка подключения к базе данных');
    }

    // Запрос для обновления записи
    const result = await pool.request()
      .input('ID', mssql.BigInt, BigInt(id))
      .input('TaskName', mssql.NVarChar, taskName)
      .query(`
        UPDATE Test_MP
        SET Status = 0,
            Status_Zadaniya = 0,
            Mesto = 0,
            Vlozhennost = 0,
            Pallet = 0
        WHERE ID = @ID AND Nazvanie_Zadaniya = @TaskName
      `);

    if (result.rowsAffected[0] > 0) {
      res.status(200).json({ success: true, value: 'Record updated successfully', errorCode: 200 });
    } else {
      res.status(404).json({ success: false, value: 'Record not found', errorCode: 404 });
    }
  } catch (error) {
    console.error('Ошибка при обновлении записи:', error);
    res.status(500).json({ success: false, value: error.message, errorCode: 500 });
  }
};

const getRecordsByWPS = async (req, res) => {
  const { shk } = req.query;

  if (!shk) {
    return res.status(400).json({ success: false, value: 'shk are required', errorCode: 400 });
  }

  try {
    const pool = await connectToDatabase();
    if (!pool) {
      throw new Error('Ошибка подключения к базе данных');
    }

    const result = await pool.request()
      .input('SHK_WPS', mssql.NVarChar(255), shk)
      .query('SELECT * FROM Test_MP WHERE SHK_WPS = @SHK_WPS');

    res.status(200).json({ success: true, value: result.recordset, errorCode: 200 });
  } catch (error) {
    console.error('Ошибка при получении записей по артикулу:', error);
    res.status(500).json({ success: false, value: null, errorCode: 500 });
  }
};


const getLDUBySHK = async (req, res) => {
  const { name, artikul } = req.query;

  if (!name, !artikul) {
    return res.status(400).json({ success: false, value: 'Поле пусто!', errorCode: 400 });
  }

  try {
    const pool = await connectToDatabase();
    if (!pool) {
      throw new Error('Ошибка подключения к базе данных');
    }

    const result = await pool.request()
      .input('Nazvanie_Zadaniya', mssql.NVarChar(255), name)
      .input('Artikul', mssql.Int, artikul)

      .query(`
        SELECT 
          Sortiruemyi_Tovar,
          Ne_Sortiruemyi_Tovar,
          Produkty,
          Opasnyi_Tovar,
          Zakrytaya_Zona,
          Krupnogabaritnyi_Tovar,
          Yuvelirnye_Izdelia,
          Pechat_Etiketki_s_SHK,
          Pechat_Etiketki_s_Opisaniem,
          PriznakSortirovki,
          CAST(Upakovka_v_Gofro as NVARCHAR(255)) as Upakovka_v_Gofro,
          Upakovka_v_PE_Paket,
          Vlozhit_v_upakovku_pechatnyi_material,
          Izmerenie_VGH_i_peredacha_informatsii,
          Indeks_za_srochnost_koeff_1_5,
          Kompleksnaya_priemka_tovara,
          Priemka_tovara_v_transportnykh_korobakh,
          Priemka_tovara_palletnaya,
          Prochie_raboty_vklyuchaya_ustranenie_anomalii,
          Razbrakovka_tovara,
          Sborka_naborov_ot_2_shtuk_raznykh_tovarov,
          Upakovka_tovara_v_gofromeyler,
          Khranenie_tovara,
          Primeryka_SHK,
          Proverka_Sroka_Godnosti,
          Upakovka_v_Babl_Plenku,
          Upakovka_v_Ind_Korob,
          Markirovka_Tovara_Stiker_CHZ,
          Udalenie_Stikera_Markirovki,
          Dopolnitelnaya_Zashchita_Tovara,
          Markirovka_Transportnogo_Koroba,
          Formirovanie_Pallet_Otgruzki,
          Upakovochnyi_Material,
          Markirovka_Palleta_TM,
          Raskomplekt_Zakaza,
          Tip_Operatsii_LDU,
          Zamorozhennaya_Zona
        FROM Test_MP
        WHERE Artikul = @Artikul and Nazvanie_Zadaniya = @Nazvanie_Zadaniya 
      `);

    res.status(200).json({ success: true, value: result.recordset, errorCode: 200 });
  } catch (error) {
    console.error('Ошибка при получении записей по SHK:', error);
    res.status(500).json({ success: false, value: null, errorCode: 500 });
  }
};

const getRecordsBySHKWPS = async (req, res) => {
  const { SHK } = req.query;

  if (!SHK) {
    return res.status(400).json({ success: false, value: 'SHK_WPS is required', errorCode: 400 });
  }

  try {
    const pool = await connectToDatabase();
    if (!pool) {
      throw new Error('Ошибка подключения к базе данных');
    }

    const result = await pool.request()
      .input('SHK', mssql.NVarChar(255), SHK)
      .query(`
        SELECT 
          Sortiruemyi_Tovar,
          Ne_Sortiruemyi_Tovar,
          Produkty,
          Opasnyi_Tovar,
          Zakrytaya_Zona,
          Krupnogabaritnyi_Tovar,
          Yuvelirnye_Izdelia,
          Pechat_Etiketki_s_SHK,
          Pechat_Etiketki_s_Opisaniem,
          PriznakSortirovki,
          CAST(Upakovka_v_Gofro as NVARCHAR(255)) as Upakovka_v_Gofro,
          Upakovka_v_PE_Paket,
          Vlozhit_v_upakovku_pechatnyi_material,
          Izmerenie_VGH_i_peredacha_informatsii,
          Indeks_za_srochnost_koeff_1_5,
          Kompleksnaya_priemka_tovara,
          Priemka_tovara_v_transportnykh_korobakh,
          Priemka_tovara_palletnaya,
          Prochie_raboty_vklyuchaya_ustranenie_anomalii,
          Razbrakovka_tovara,
          Sborka_naborov_ot_2_shtuk_raznykh_tovarov,
          Upakovka_tovara_v_gofromeyler,
          Khranenie_tovara,
          Primeryka_SHK,
          Proverka_Sroka_Godnosti,
          Upakovka_v_Babl_Plenku,
          Upakovka_v_Ind_Korob,
          Markirovka_Tovara_Stiker_CHZ,
          Udalenie_Stikera_Markirovki,
          Dopolnitelnaya_Zashchita_Tovara,
          Markirovka_Transportnogo_Koroba,
          Formirovanie_Pallet_Otgruzki,
          Upakovochnyi_Material,
          Markirovka_Palleta_TM,
          Raskomplekt_Zakaza,
          Tip_Operatsii_LDU,
          Zamorozhennaya_Zona
        FROM Test_MP
        WHERE SHK = @SHK
      `);

    res.status(200).json({ success: true, value: result.recordset, errorCode: 200 });
  } catch (error) {
    console.error('Ошибка при получении записей по SHK:', error);
    res.status(500).json({ success: false, value: null, errorCode: 500 });
  }
};

const updatePalletInfoBySHKWPS = async (req, res) => {
  const { SHK_WPS, location, nesting, palletNumber } = req.body;

  // Проверка на наличие необходимых параметров
  if (!SHK_WPS || !location || !nesting || !palletNumber) {
    return res.status(400).json({ success: false, value: 'SHK_WPS, location, nesting и palletNumber обязательны', errorCode: 400 });
  }

  try {
    // Подключение к базе данных
    const pool = await connectToDatabase();
    if (!pool) {
      return res.status(500).json({ success: false, value: null, errorCode: 500 });
    }

    // Выполнение SQL-запроса для обновления данных о месте, вложенности и номере палета по SHK_WPS
    await pool.request()
      .input('SHK_WPS', mssql.NVarChar(255), SHK_WPS)
      .input('Mesto', mssql.NVarChar(50), location)
      .input('Vlozhennost', mssql.NVarChar(50), nesting)
      .input('Pallet_No', mssql.NVarChar(50), palletNumber)
      .query(`
        UPDATE Test_MP
        SET 
          Mesto = @Mesto,
          Vlozhennost = @Vlozhennost,
          Pallet_No = @Pallet_No
        WHERE SHK_WPS = @SHK_WPS
      `);

    // Успешный ответ
    res.status(200).json({ success: true, value: 'Информация о палете успешно обновлена', errorCode: 200 });
  } catch (error) {
    console.error('Ошибка при обновлении информации о палете:', error);
    res.status(500).json({ success: false, value: null, errorCode: 500 });
  }
};


const updateValues = async (req, res) => {
  const { Nazvanie_Zadaniya, artikul, columnsToUpdate } = req.body;

  if (!Nazvanie_Zadaniya || !artikul || !Array.isArray(columnsToUpdate) || columnsToUpdate.length === 0) {
    return res.status(400).json({ success: false, value: 'Nazvanie_Zadaniya, artikul, and columnsToUpdate are required', errorCode: 400 });
  }

  try {
    const pool = await connectToDatabase();

    const setClause = columnsToUpdate.map(column => `[${column}] = 'V'`).join(', ');

    const query = `
      UPDATE Test_MP
      SET
        ${setClause}
     WHERE Nazvanie_Zadaniya = @Nazvanie_Zadaniya AND Artikul = @Artikul
    `;

    const result = await pool.request()
      .input('Nazvanie_Zadaniya', mssql.NVarChar(255), Nazvanie_Zadaniya)
      .input('Artikul', mssql.Int, artikul)
      .query(query);

    if (result.rowsAffected[0] > 0) {
      res.status(200).json({ success: true, value: `Значения успешно обновлены для документа ${Nazvanie_Zadaniya} с артикулом ${artikul}`, errorCode: 200 });
    } else {
      res.status(404).json({ success: false, value: `Запись не найдена для документа ${Nazvanie_Zadaniya} с артикулом ${artikul}`, errorCode: 404 });
    }
  } catch (error) {
    console.error('Ошибка при обновлении значений в базе данных:', error);
    res.status(500).json({ success: false, value: null, errorCode: 500 });
  }
};

const duplicateRecord = async (req, res) => {
  const { taskName, articul, mesto, vlozhennost, palletNo } = req.body;

  try {
    const pool = await connectToDatabase();
    if (!pool) {
      return res.status(500).json({ success: false, value: null, errorCode: 500 });
    }

    // Находим запись по номеру задания и ШК
    const result = await pool.request()
      .input('Nazvanie_Zadaniya', mssql.NVarChar(255), taskName)
      .input('Artikul', mssql.Int, articul)
      .query('SELECT * FROM Test_MP WHERE Nazvanie_Zadaniya = @Nazvanie_Zadaniya AND Artikul = @Artikul');

    if (result.recordset.length === 0) {
      console.log("Не найдено")

      return res.status(404).json({ success: false, value: null, errorCode: 404 });
    }

    // Получаем оригинальную запись
    const originalRecord = result.recordset[0];

    // Дубликат с новыми mesto/vlozhennost/palletNo; флаги ЛДУ и прочие поля копируем с оригинала
    const o = originalRecord;
    await pool.request()
      .input('Pref', mssql.NVarChar(50), o.Pref)
      .input('Nazvanie_Zadaniya', mssql.NVarChar(255), o.Nazvanie_Zadaniya)
      .input('Status_Zadaniya', mssql.Int, 1)
      .input('Status', mssql.Int, 2)
      .input('Ispolnitel', mssql.NVarChar(255), o.Ispolnitel)
      .input('Artikul', mssql.Int, o.Artikul)
      .input('Artikul_Syrya', mssql.NVarChar(50), o.Artikul_Syrya)
      .input('Nomenklatura', mssql.BigInt, o.Nomenklatura)
      .input('Nazvanie_Tovara', mssql.NVarChar(255), o.Nazvanie_Tovara)
      .input('SHK', mssql.NVarChar(255), o.SHK)
      .input('SHK_Syrya', mssql.NVarChar(255), o.SHK_Syrya)
      .input('SHK_SPO', mssql.NVarChar(255), o.SHK_SPO)
      .input('SHK_SPO_1', mssql.NVarChar(255), o.SHK_SPO_1)
      .input('Kol_vo_Syrya', mssql.NVarChar(255), o.Kol_vo_Syrya)
      .input('Itog_Zakaz', mssql.Int, 0)
      .input('Sht_v_MP', mssql.Int, o.Sht_v_MP)
      .input('Itog_MP', mssql.Int, o.Itog_MP)
      .input('SOH', mssql.NVarChar(10), o.SOH)
      .input('Tip_Postavki', mssql.NVarChar(50), o.Tip_Postavki)
      .input('Srok_Godnosti', mssql.NVarChar(50), o.Srok_Godnosti)
      .input('Scklad_Pref', mssql.NVarChar(255), o.Scklad_Pref)
      .input('Sortiruemyi_Tovar', mssql.NVarChar(50), o.Sortiruemyi_Tovar)
      .input('Ne_Sortiruemyi_Tovar', mssql.NVarChar(50), o.Ne_Sortiruemyi_Tovar)
      .input('Produkty', mssql.NVarChar(50), o.Produkty)
      .input('Opasnyi_Tovar', mssql.NVarChar(50), o.Opasnyi_Tovar)
      .input('Zakrytaya_Zona', mssql.NVarChar(50), o.Zakrytaya_Zona)
      .input('Krupnogabaritnyi_Tovar', mssql.NVarChar(50), o.Krupnogabaritnyi_Tovar)
      .input('Yuvelirnye_Izdelia', mssql.NVarChar(50), o.Yuvelirnye_Izdelia)
      .input('Pechat_Etiketki_s_SHK', mssql.NVarChar(50), o.Pechat_Etiketki_s_SHK)
      .input('Pechat_Etiketki_s_Opisaniem', mssql.NVarChar(50), o.Pechat_Etiketki_s_Opisaniem)
      .input('vp', mssql.NVarChar(50), o.vp)
      .input('Plan_Otkaz', mssql.NVarChar(50), o.Plan_Otkaz)
      .input('Upakovka_v_Gofro', mssql.NVarChar(255), o.Upakovka_v_Gofro)
      .input('Upakovka_v_PE_Paket', mssql.NVarChar(50), o.Upakovka_v_PE_Paket)
      .input('PriznakSortirovki', mssql.NVarChar(50), o.PriznakSortirovki)
      .input('Vlozhit_v_upakovku_pechatnyi_material', mssql.NVarChar(50), o.Vlozhit_v_upakovku_pechatnyi_material)
      .input('Izmerenie_VGH_i_peredacha_informatsii', mssql.NVarChar(50), o.Izmerenie_VGH_i_peredacha_informatsii)
      .input('Indeks_za_srochnost_koeff_1_5', mssql.NVarChar(50), o.Indeks_za_srochnost_koeff_1_5)
      .input('Kompleksnaya_priemka_tovara', mssql.NVarChar(50), o.Kompleksnaya_priemka_tovara)
      .input('Priemka_tovara_v_transportnykh_korobakh', mssql.NVarChar(50), o.Priemka_tovara_v_transportnykh_korobakh)
      .input('Priemka_tovara_palletnaya', mssql.NVarChar(50), o.Priemka_tovara_palletnaya)
      .input('Prochie_raboty_vklyuchaya_ustranenie_anomalii', mssql.NVarChar(50), o.Prochie_raboty_vklyuchaya_ustranenie_anomalii)
      .input('Razbrakovka_tovara', mssql.NVarChar(50), o.Razbrakovka_tovara)
      .input('Sborka_naborov_ot_2_shtuk_raznykh_tovarov', mssql.NVarChar(50), o.Sborka_naborov_ot_2_shtuk_raznykh_tovarov)
      .input('Upakovka_tovara_v_gofromeyler', mssql.NVarChar(50), o.Upakovka_tovara_v_gofromeyler)
      .input('Primeryka_SHK', mssql.NVarChar(50), o.Primeryka_SHK)
      .input('Proverka_Sroka_Godnosti', mssql.NVarChar(50), o.Proverka_Sroka_Godnosti)
      .input('Upakovka_v_Babl_Plenku', mssql.NVarChar(50), o.Upakovka_v_Babl_Plenku)
      .input('Upakovka_v_Ind_Korob', mssql.NVarChar(50), o.Upakovka_v_Ind_Korob)
      .input('Markirovka_Tovara_Stiker_CHZ', mssql.NVarChar(50), o.Markirovka_Tovara_Stiker_CHZ)
      .input('Udalenie_Stikera_Markirovki', mssql.NVarChar(50), o.Udalenie_Stikera_Markirovki)
      .input('Dopolnitelnaya_Zashchita_Tovara', mssql.NVarChar(50), o.Dopolnitelnaya_Zashchita_Tovara)
      .input('Markirovka_Transportnogo_Koroba', mssql.NVarChar(50), o.Markirovka_Transportnogo_Koroba)
      .input('Formirovanie_Pallet_Otgruzki', mssql.NVarChar(50), o.Formirovanie_Pallet_Otgruzki)
      .input('Upakovochnyi_Material', mssql.NVarChar(50), o.Upakovochnyi_Material)
      .input('Markirovka_Palleta_TM', mssql.NVarChar(50), o.Markirovka_Palleta_TM)
      .input('Raskomplekt_Zakaza', mssql.NVarChar(50), o.Raskomplekt_Zakaza)
      .input('Tip_Operatsii_LDU', mssql.NVarChar(255), o.Tip_Operatsii_LDU)
      .input('Zamorozhennaya_Zona', mssql.NVarChar(50), o.Zamorozhennaya_Zona)
      .input('Khranenie_tovara', mssql.NVarChar(50), o.Khranenie_tovara)
      .input('tipPostavki', mssql.Bit, o.tipPostavki)
      .input('Mono', mssql.Bit, o.Mono)
      .input('Mesto', mssql.NVarChar(50), mesto)
      .input('Vlozhennost', mssql.NVarChar(50), vlozhennost)
      .input('Pallet_No', mssql.NVarChar(50), palletNo)
      .input('Time_Start', mssql.NVarChar(255), o.Time_Start)
      .input('Time_Middle', mssql.NVarChar(255), o.Time_Middle)
      .input('Time_End', mssql.NVarChar(255), o.Time_End)
      .input('Persent', mssql.NVarChar(50), o.Persent)
      .query(`
        INSERT INTO Test_MP (
          Pref, Nazvanie_Zadaniya, Status_Zadaniya, Status, Ispolnitel, Artikul, Artikul_Syrya,
          Nomenklatura, Nazvanie_Tovara, SHK, SHK_Syrya, SHK_SPO, SHK_SPO_1, Kol_vo_Syrya, Itog_Zakaz,
          Sht_v_MP, Itog_MP, SOH, Tip_Postavki, Srok_Godnosti, Scklad_Pref,
          Sortiruemyi_Tovar, Ne_Sortiruemyi_Tovar, Produkty, Opasnyi_Tovar, Zakrytaya_Zona, Krupnogabaritnyi_Tovar,
          Yuvelirnye_Izdelia, Pechat_Etiketki_s_SHK, Pechat_Etiketki_s_Opisaniem, vp, Plan_Otkaz,
          Upakovka_v_Gofro, Upakovka_v_PE_Paket, PriznakSortirovki,
          Vlozhit_v_upakovku_pechatnyi_material, Izmerenie_VGH_i_peredacha_informatsii, Indeks_za_srochnost_koeff_1_5,
          Kompleksnaya_priemka_tovara, Priemka_tovara_v_transportnykh_korobakh, Priemka_tovara_palletnaya,
          Prochie_raboty_vklyuchaya_ustranenie_anomalii, Razbrakovka_tovara, Sborka_naborov_ot_2_shtuk_raznykh_tovarov, Upakovka_tovara_v_gofromeyler,
          Primeryka_SHK, Proverka_Sroka_Godnosti, Upakovka_v_Babl_Plenku, Upakovka_v_Ind_Korob,
          Markirovka_Tovara_Stiker_CHZ, Udalenie_Stikera_Markirovki, Dopolnitelnaya_Zashchita_Tovara, Markirovka_Transportnogo_Koroba,
          Formirovanie_Pallet_Otgruzki, Upakovochnyi_Material, Markirovka_Palleta_TM, Raskomplekt_Zakaza, Tip_Operatsii_LDU, Zamorozhennaya_Zona,
          Khranenie_tovara, tipPostavki, Mono,
          Mesto, Vlozhennost, Pallet_No, Time_Start, Time_Middle, Time_End, Persent
        ) VALUES (
          @Pref, @Nazvanie_Zadaniya, @Status_Zadaniya, @Status, @Ispolnitel, @Artikul, @Artikul_Syrya,
          @Nomenklatura, @Nazvanie_Tovara, @SHK, @SHK_Syrya, @SHK_SPO, @SHK_SPO_1, @Kol_vo_Syrya, @Itog_Zakaz,
          @Sht_v_MP, @Itog_MP, @SOH, @Tip_Postavki, @Srok_Godnosti, @Scklad_Pref,
          @Sortiruemyi_Tovar, @Ne_Sortiruemyi_Tovar, @Produkty, @Opasnyi_Tovar, @Zakrytaya_Zona, @Krupnogabaritnyi_Tovar,
          @Yuvelirnye_Izdelia, @Pechat_Etiketki_s_SHK, @Pechat_Etiketki_s_Opisaniem, @vp, @Plan_Otkaz,
          @Upakovka_v_Gofro, @Upakovka_v_PE_Paket, @PriznakSortirovki,
          @Vlozhit_v_upakovku_pechatnyi_material, @Izmerenie_VGH_i_peredacha_informatsii, @Indeks_za_srochnost_koeff_1_5,
          @Kompleksnaya_priemka_tovara, @Priemka_tovara_v_transportnykh_korobakh, @Priemka_tovara_palletnaya,
          @Prochie_raboty_vklyuchaya_ustranenie_anomalii, @Razbrakovka_tovara, @Sborka_naborov_ot_2_shtuk_raznykh_tovarov, @Upakovka_tovara_v_gofromeyler,
          @Primeryka_SHK, @Proverka_Sroka_Godnosti, @Upakovka_v_Babl_Plenku, @Upakovka_v_Ind_Korob,
          @Markirovka_Tovara_Stiker_CHZ, @Udalenie_Stikera_Markirovki, @Dopolnitelnaya_Zashchita_Tovara, @Markirovka_Transportnogo_Koroba,
          @Formirovanie_Pallet_Otgruzki, @Upakovochnyi_Material, @Markirovka_Palleta_TM, @Raskomplekt_Zakaza, @Tip_Operatsii_LDU, @Zamorozhennaya_Zona,
          @Khranenie_tovara, @tipPostavki, @Mono,
          @Mesto, @Vlozhennost, @Pallet_No, @Time_Start, @Time_Middle, @Time_End, @Persent
        )
      `);

    res.json({ success: true, value: 'Запись успешно продублирована', errorCode: 200 });
  } catch (error) {
    console.error('Ошибка при дублировании записи:', error);
    res.status(500).json({ success: false, value: null, errorCode: 500 });
  }
};
const updateSHKWPS= async (req, res) => {
  const { taskName, articul, newSHK } = req.body;

  // Проверка на наличие необходимых параметров
  if (!taskName || !articul || !newSHK) {
    return res.status(400).json({ success: false, value: 'taskName, articul и newSHK обязательны', errorCode: 400 });
  }

  try {
    // Подключение к базе данных
    const pool = await connectToDatabase();
    if (!pool) {
      return res.status(500).json({ success: false, value: null, errorCode: 500 });
    }

    // Выполнение SQL-запроса для обновления SHK_WPS по taskName и articul
    await pool.request()
      .input('Nazvanie_Zadaniya', mssql.NVarChar(255), taskName)
      .input('Artikul', mssql.Int, articul)
      .input('NewSHK', mssql.NVarChar(255), newSHK)
      .query('UPDATE Test_MP SET SHK_WPS = @NewSHK WHERE Nazvanie_Zadaniya = @Nazvanie_Zadaniya AND Artikul = @Artikul');

    // Успешный ответ
    res.status(200).json({ success: true, value: 'ШК_WPS успешно обновлен', errorCode: 200 });
  } catch (error) {
    console.error('Ошибка при обновлении ШК_WPS:', error);
    res.status(500).json({ success: false, value: null, errorCode: 500 });
  }
};


const updateSHKByTaskAndArticul = async (req, res) => {
  const { taskName, articul, newSHK } = req.body;

  try {
    const pool = await connectToDatabase();
    if (!pool) {
      return res.status(500).json({ success: false, value: null, errorCode:500 });
    }

    // Обновление записи по названию задания и артиклу
    await pool.request()
      .input('Nazvanie_Zadaniya', mssql.NVarChar(255), taskName)
      .input('Artikul', mssql.Int, articul)
      .input('NewSHK', mssql.NVarChar(255), newSHK)
      .query('UPDATE Test_MP SET SHK = @NewSHK WHERE Nazvanie_Zadaniya = @Nazvanie_Zadaniya AND Artikul = @Artikul');

    res.json({ success: true, value: 'ШК успешно обновлен', errorCode: 200 });
  } catch (error) {
    console.error('Ошибка при обновлении ШК:', error);
    res.status(500).json({ success: false, value: null, errorCode: 500 });
  }
};
const addTaskStatus = async (req, res) => {
  const { taskName, articul, comment, reason } = req.query;

  try {
    const pool = await connectToDatabase();
    if (!pool) {
      return res.status(500).json({ success: false, value: null, errorCode: 500 });
    }

    // Обновление существующей записи с установленными значениями
    const result = await pool.request()
      .input('Nazvanie_Zadaniya', mssql.NVarChar(255), taskName)
      .input('Artikul', mssql.Int, articul)
      .input('Status_Zadaniya', mssql.Int, 0) // Установка Status_Zadaniya в 1
      .input('Status', mssql.Int, 1) // Установка Status в 2
      .input('comment', mssql.NVarChar(mssql.MAX), comment) // Установка комментария
      .input('reason', mssql.NVarChar(mssql.MAX), reason) // Установка причины
      .query(`
        UPDATE Test_MP 
        SET 
          Status_Zadaniya = @Status_Zadaniya,
          Status = @Status,
          comment = @comment,
          reason = @reason
        WHERE 
          Nazvanie_Zadaniya = @Nazvanie_Zadaniya AND 
          Artikul = @Artikul
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ success: false, value: 'Запись не найдена', errorCode: 404 });
    }

    res.json({ success: true, value: 'Запись успешно обновлена', errorCode: 200 });
  } catch (error) {
    console.error('Ошибка при обновлении записи:', error);
    res.status(500).json({ success: false, value: null, errorCode: 500 });
  }
};



const updateStatusTaskAndArticul = async (req, res) => {
  const { taskName, articul, status } = req.body;

  try {
    const pool = await connectToDatabase();
    if (!pool) {
      return res.status(500).json({ success: false, value: null, errorCode:500 });
    }

    // Обновление записи по названию задания и артиклу
    await pool.request()
      .input('Nazvanie_Zadaniya', mssql.NVarChar(255), taskName)
      .input('Artikul', mssql.Int, articul)
      .input('Status', mssql.Int, status)
      .query('UPDATE Test_MP SET Status = @Status WHERE Nazvanie_Zadaniya = @Nazvanie_Zadaniya AND Artikul = @Artikul');

    res.json({ success: true, value: 'Статус успешно обновлен', errorCode: 200 });
  } catch (error) {
    console.error('Ошибка при обновлении статуса:', error);
    res.status(500).json({ success: false, value: null, errorCode: 500 });
  }
};

const updateRecordsBySHKWPS = async (req, res) => {
  const { taskName, articul } = req.query;
  const {
    Sortiruemyi_Tovar,
    Ne_Sortiruemyi_Tovar,
    Produkty,
    Opasnyi_Tovar,
    Zakrytaya_Zona,
    Krupnogabaritnyi_Tovar,
    Yuvelirnye_Izdelia,
    Pechat_Etiketki_s_SHK,
    Pechat_Etiketki_s_Opisaniem,
    PriznakSortirovki,
    Upakovka_v_Gofro,
    Upakovka_v_PE_Paket,
    Vlozhit_v_upakovku_pechatnyi_material,
    Izmerenie_VGH_i_peredacha_informatsii,
    Indeks_za_srochnost_koeff_1_5,
    Kompleksnaya_priemka_tovara,
    Priemka_tovara_v_transportnykh_korobakh,
    Priemka_tovara_palletnaya,
    Prochie_raboty_vklyuchaya_ustranenie_anomalii,
    Razbrakovka_tovara,
    Sborka_naborov_ot_2_shtuk_raznykh_tovarov,
    Upakovka_tovara_v_gofromeyler,
    Khranenie_tovara,
    Primeryka_SHK,
    Proverka_Sroka_Godnosti,
    Upakovka_v_Babl_Plenku,
    Upakovka_v_Ind_Korob,
    Markirovka_Tovara_Stiker_CHZ,
    Udalenie_Stikera_Markirovki,
    Dopolnitelnaya_Zashchita_Tovara,
    Markirovka_Transportnogo_Koroba,
    Formirovanie_Pallet_Otgruzki,
    Upakovochnyi_Material,
    Markirovka_Palleta_TM,
    Raskomplekt_Zakaza,
    Tip_Operatsii_LDU,
    Zamorozhennaya_Zona,
  } = req.body;

  try {
    const pool = await connectToDatabase();
    if (!pool) {
      throw new Error('Ошибка подключения к базе данных');
    }

    await pool.request()
      .input('Nazvanie_Zadaniya', mssql.NVarChar(255), taskName)
      .input('Artikul', mssql.Int, articul)
      .input('Sortiruemyi_Tovar', mssql.NVarChar(10), Sortiruemyi_Tovar ?? '0')
      .input('Ne_Sortiruemyi_Tovar', mssql.NVarChar(10), Ne_Sortiruemyi_Tovar ?? '0')
      .input('Produkty', mssql.NVarChar(10), Produkty ?? '0')
      .input('Opasnyi_Tovar', mssql.NVarChar(10), Opasnyi_Tovar ?? '0')
      .input('Zakrytaya_Zona', mssql.NVarChar(10), Zakrytaya_Zona ?? '0')
      .input('Krupnogabaritnyi_Tovar', mssql.NVarChar(10), Krupnogabaritnyi_Tovar ?? '0')
      .input('Yuvelirnye_Izdelia', mssql.NVarChar(10), Yuvelirnye_Izdelia ?? '0')
      .input('Pechat_Etiketki_s_SHK', mssql.NVarChar(10), Pechat_Etiketki_s_SHK ?? '0')
      .input('Pechat_Etiketki_s_Opisaniem', mssql.NVarChar(10), Pechat_Etiketki_s_Opisaniem ?? '0')
      .input('PriznakSortirovki', mssql.NVarChar(10), PriznakSortirovki ?? '0')
      .input('Upakovka_v_Gofro', mssql.NVarChar(255), Upakovka_v_Gofro ?? '0')
      .input('Upakovka_v_PE_Paket', mssql.NVarChar(10), Upakovka_v_PE_Paket ?? '0')
      .input('Vlozhit_v_upakovku_pechatnyi_material', mssql.NVarChar(10), Vlozhit_v_upakovku_pechatnyi_material ?? '0')
      .input('Izmerenie_VGH_i_peredacha_informatsii', mssql.NVarChar(10), Izmerenie_VGH_i_peredacha_informatsii ?? '0')
      .input('Indeks_za_srochnost_koeff_1_5', mssql.NVarChar(10), Indeks_za_srochnost_koeff_1_5 ?? '0')
      .input('Kompleksnaya_priemka_tovara', mssql.NVarChar(10), Kompleksnaya_priemka_tovara ?? '0')
      .input('Priemka_tovara_v_transportnykh_korobakh', mssql.NVarChar(10), Priemka_tovara_v_transportnykh_korobakh ?? '0')
      .input('Priemka_tovara_palletnaya', mssql.NVarChar(10), Priemka_tovara_palletnaya ?? '0')
      .input('Prochie_raboty_vklyuchaya_ustranenie_anomalii', mssql.NVarChar(10), Prochie_raboty_vklyuchaya_ustranenie_anomalii ?? '0')
      .input('Razbrakovka_tovara', mssql.NVarChar(10), Razbrakovka_tovara ?? '0')
      .input('Sborka_naborov_ot_2_shtuk_raznykh_tovarov', mssql.NVarChar(10), Sborka_naborov_ot_2_shtuk_raznykh_tovarov ?? '0')
      .input('Upakovka_tovara_v_gofromeyler', mssql.NVarChar(10), Upakovka_tovara_v_gofromeyler ?? '0')
      .input('Khranenie_tovara', mssql.NVarChar(10), Khranenie_tovara ?? '0')
      .input('Primeryka_SHK', mssql.NVarChar(10), Primeryka_SHK ?? '0')
      .input('Proverka_Sroka_Godnosti', mssql.NVarChar(10), Proverka_Sroka_Godnosti ?? '0')
      .input('Upakovka_v_Babl_Plenku', mssql.NVarChar(10), Upakovka_v_Babl_Plenku ?? '0')
      .input('Upakovka_v_Ind_Korob', mssql.NVarChar(10), Upakovka_v_Ind_Korob ?? '0')
      .input('Markirovka_Tovara_Stiker_CHZ', mssql.NVarChar(10), Markirovka_Tovara_Stiker_CHZ ?? '0')
      .input('Udalenie_Stikera_Markirovki', mssql.NVarChar(10), Udalenie_Stikera_Markirovki ?? '0')
      .input('Dopolnitelnaya_Zashchita_Tovara', mssql.NVarChar(10), Dopolnitelnaya_Zashchita_Tovara ?? '0')
      .input('Markirovka_Transportnogo_Koroba', mssql.NVarChar(10), Markirovka_Transportnogo_Koroba ?? '0')
      .input('Formirovanie_Pallet_Otgruzki', mssql.NVarChar(10), Formirovanie_Pallet_Otgruzki ?? '0')
      .input('Upakovochnyi_Material', mssql.NVarChar(10), Upakovochnyi_Material ?? '0')
      .input('Markirovka_Palleta_TM', mssql.NVarChar(10), Markirovka_Palleta_TM ?? '0')
      .input('Raskomplekt_Zakaza', mssql.NVarChar(10), Raskomplekt_Zakaza ?? '0')
      .input('Tip_Operatsii_LDU', mssql.NVarChar(255), Tip_Operatsii_LDU ?? '')
      .input('Zamorozhennaya_Zona', mssql.NVarChar(10), Zamorozhennaya_Zona ?? '0')
      .query(`
        UPDATE Test_MP
        SET 
          Sortiruemyi_Tovar = @Sortiruemyi_Tovar,
          Ne_Sortiruemyi_Tovar = @Ne_Sortiruemyi_Tovar,
          Produkty = @Produkty,
          Opasnyi_Tovar = @Opasnyi_Tovar,
          Zakrytaya_Zona = @Zakrytaya_Zona,
          Krupnogabaritnyi_Tovar = @Krupnogabaritnyi_Tovar,
          Yuvelirnye_Izdelia = @Yuvelirnye_Izdelia,
          Pechat_Etiketki_s_SHK = @Pechat_Etiketki_s_SHK,
          Pechat_Etiketki_s_Opisaniem = @Pechat_Etiketki_s_Opisaniem,
          PriznakSortirovki = @PriznakSortirovki,
          Upakovka_v_Gofro = @Upakovka_v_Gofro,
          Upakovka_v_PE_Paket = @Upakovka_v_PE_Paket,
          Vlozhit_v_upakovku_pechatnyi_material = @Vlozhit_v_upakovku_pechatnyi_material,
          Izmerenie_VGH_i_peredacha_informatsii = @Izmerenie_VGH_i_peredacha_informatsii,
          Indeks_za_srochnost_koeff_1_5 = @Indeks_za_srochnost_koeff_1_5,
          Kompleksnaya_priemka_tovara = @Kompleksnaya_priemka_tovara,
          Priemka_tovara_v_transportnykh_korobakh = @Priemka_tovara_v_transportnykh_korobakh,
          Priemka_tovara_palletnaya = @Priemka_tovara_palletnaya,
          Prochie_raboty_vklyuchaya_ustranenie_anomalii = @Prochie_raboty_vklyuchaya_ustranenie_anomalii,
          Razbrakovka_tovara = @Razbrakovka_tovara,
          Sborka_naborov_ot_2_shtuk_raznykh_tovarov = @Sborka_naborov_ot_2_shtuk_raznykh_tovarov,
          Upakovka_tovara_v_gofromeyler = @Upakovka_tovara_v_gofromeyler,
          Khranenie_tovara = @Khranenie_tovara,
          Primeryka_SHK = @Primeryka_SHK,
          Proverka_Sroka_Godnosti = @Proverka_Sroka_Godnosti,
          Upakovka_v_Babl_Plenku = @Upakovka_v_Babl_Plenku,
          Upakovka_v_Ind_Korob = @Upakovka_v_Ind_Korob,
          Markirovka_Tovara_Stiker_CHZ = @Markirovka_Tovara_Stiker_CHZ,
          Udalenie_Stikera_Markirovki = @Udalenie_Stikera_Markirovki,
          Dopolnitelnaya_Zashchita_Tovara = @Dopolnitelnaya_Zashchita_Tovara,
          Markirovka_Transportnogo_Koroba = @Markirovka_Transportnogo_Koroba,
          Formirovanie_Pallet_Otgruzki = @Formirovanie_Pallet_Otgruzki,
          Upakovochnyi_Material = @Upakovochnyi_Material,
          Markirovka_Palleta_TM = @Markirovka_Palleta_TM,
          Raskomplekt_Zakaza = @Raskomplekt_Zakaza,
          Tip_Operatsii_LDU = @Tip_Operatsii_LDU,
          Zamorozhennaya_Zona = @Zamorozhennaya_Zona
        WHERE Nazvanie_Zadaniya = @Nazvanie_Zadaniya AND Artikul = @Artikul
      `);

    res.status(200).json({ success: true, value: 'Record updated successfully', errorCode: 200 });
  } catch (error) {
    console.error('Ошибка при обновлении записей по SHK_WPS:', error);
    res.status(500).json({ success: false, value: null, errorCode: 500 });
  }
};

const setStatusNew = async(req, res) =>{
  const { id, status} = req.query;
  try {
    const pool = await connectToDatabase();
    if (!pool) {
      throw new Error('Ошибка подключения к базе данных');
    }

    await pool.request()
      .input('Status', mssql.Int, status)
      .input('ID', mssql.BigInt, id)
      .query('UPDATE Test_MP SET Status = @Status WHERE ID = @ID');

    res.status(200).json({ success: true, value: 'Статус успешно обновлен', errorCode: 200 });
  } catch (error) {
    console.error('Ошибка при обновлении статуса:', error);
    res.status(500).json({ success: false, value: null, errorCode: 500 });
  }
};

const updateRecordsBySHKWPSNEW = async (req, res) => {
  const { taskName, articul } = req.query;
  const {
    Sortiruemyi_Tovar,
    Ne_Sortiruemyi_Tovar,
    Produkty,
    Opasnyi_Tovar,
    Zakrytaya_Zona,
    Krupnogabaritnyi_Tovar,
    Yuvelirnye_Izdelia,
    Pechat_Etiketki_s_SHK,
    Pechat_Etiketki_s_Opisaniem,
    PriznakSortirovki,
    Upakovka_v_Gofro,
    Upakovka_v_PE_Paket,
    Vlozhit_v_upakovku_pechatnyi_material,
    Izmerenie_VGH_i_peredacha_informatsii,
    Indeks_za_srochnost_koeff_1_5,
    Kompleksnaya_priemka_tovara,
    Priemka_tovara_v_transportnykh_korobakh,
    Priemka_tovara_palletnaya,
    Prochie_raboty_vklyuchaya_ustranenie_anomalii,
    Razbrakovka_tovara,
    Sborka_naborov_ot_2_shtuk_raznykh_tovarov,
    Upakovka_tovara_v_gofromeyler,
    Khranenie_tovara,
    Primeryka_SHK,
    Proverka_Sroka_Godnosti,
    Upakovka_v_Babl_Plenku,
    Upakovka_v_Ind_Korob,
    Markirovka_Tovara_Stiker_CHZ,
    Udalenie_Stikera_Markirovki,
    Dopolnitelnaya_Zashchita_Tovara,
    Markirovka_Transportnogo_Koroba,
    Formirovanie_Pallet_Otgruzki,
    Upakovochnyi_Material,
    Markirovka_Palleta_TM,
    Raskomplekt_Zakaza,
    Tip_Operatsii_LDU,
    Zamorozhennaya_Zona,
  } = req.body;

  try {
    const pool = await connectToDatabase();
    if (!pool) {
      throw new Error('Ошибка подключения к базе данных');
    }

    await pool.request()
      .input('Nazvanie_Zadaniya', mssql.NVarChar(255), taskName || '')
      .input('Artikul', mssql.Int, articul || 0)
      .input('Sortiruemyi_Tovar', mssql.NVarChar(10), Sortiruemyi_Tovar ?? '0')
      .input('Ne_Sortiruemyi_Tovar', mssql.NVarChar(10), Ne_Sortiruemyi_Tovar ?? '0')
      .input('Produkty', mssql.NVarChar(10), Produkty ?? '0')
      .input('Opasnyi_Tovar', mssql.NVarChar(10), Opasnyi_Tovar ?? '0')
      .input('Zakrytaya_Zona', mssql.NVarChar(10), Zakrytaya_Zona ?? '0')
      .input('Krupnogabaritnyi_Tovar', mssql.NVarChar(10), Krupnogabaritnyi_Tovar ?? '0')
      .input('Yuvelirnye_Izdelia', mssql.NVarChar(10), Yuvelirnye_Izdelia ?? '0')
      .input('Pechat_Etiketki_s_SHK', mssql.NVarChar(10), Pechat_Etiketki_s_SHK ?? '0')
      .input('Pechat_Etiketki_s_Opisaniem', mssql.NVarChar(10), Pechat_Etiketki_s_Opisaniem ?? '0')
      .input('PriznakSortirovki', mssql.NVarChar(10), PriznakSortirovki ?? '0')
      .input('Upakovka_v_Gofro', mssql.NVarChar(255), Upakovka_v_Gofro ?? '0')
      .input('Upakovka_v_PE_Paket', mssql.NVarChar(10), Upakovka_v_PE_Paket ?? '0')
      .input('Vlozhit_v_upakovku_pechatnyi_material', mssql.NVarChar(10), Vlozhit_v_upakovku_pechatnyi_material ?? '0')
      .input('Izmerenie_VGH_i_peredacha_informatsii', mssql.NVarChar(10), Izmerenie_VGH_i_peredacha_informatsii ?? '0')
      .input('Indeks_za_srochnost_koeff_1_5', mssql.NVarChar(10), Indeks_za_srochnost_koeff_1_5 ?? '0')
      .input('Kompleksnaya_priemka_tovara', mssql.NVarChar(10), Kompleksnaya_priemka_tovara ?? '0')
      .input('Priemka_tovara_v_transportnykh_korobakh', mssql.NVarChar(10), Priemka_tovara_v_transportnykh_korobakh ?? '0')
      .input('Priemka_tovara_palletnaya', mssql.NVarChar(10), Priemka_tovara_palletnaya ?? '0')
      .input('Prochie_raboty_vklyuchaya_ustranenie_anomalii', mssql.NVarChar(10), Prochie_raboty_vklyuchaya_ustranenie_anomalii ?? '0')
      .input('Razbrakovka_tovara', mssql.NVarChar(10), Razbrakovka_tovara ?? '0')
      .input('Sborka_naborov_ot_2_shtuk_raznykh_tovarov', mssql.NVarChar(10), Sborka_naborov_ot_2_shtuk_raznykh_tovarov ?? '0')
      .input('Upakovka_tovara_v_gofromeyler', mssql.NVarChar(10), Upakovka_tovara_v_gofromeyler ?? '0')
      .input('Khranenie_tovara', mssql.NVarChar(10), Khranenie_tovara ?? '0')
      .input('Primeryka_SHK', mssql.NVarChar(10), Primeryka_SHK ?? '0')
      .input('Proverka_Sroka_Godnosti', mssql.NVarChar(10), Proverka_Sroka_Godnosti ?? '0')
      .input('Upakovka_v_Babl_Plenku', mssql.NVarChar(10), Upakovka_v_Babl_Plenku ?? '0')
      .input('Upakovka_v_Ind_Korob', mssql.NVarChar(10), Upakovka_v_Ind_Korob ?? '0')
      .input('Markirovka_Tovara_Stiker_CHZ', mssql.NVarChar(10), Markirovka_Tovara_Stiker_CHZ ?? '0')
      .input('Udalenie_Stikera_Markirovki', mssql.NVarChar(10), Udalenie_Stikera_Markirovki ?? '0')
      .input('Dopolnitelnaya_Zashchita_Tovara', mssql.NVarChar(10), Dopolnitelnaya_Zashchita_Tovara ?? '0')
      .input('Markirovka_Transportnogo_Koroba', mssql.NVarChar(10), Markirovka_Transportnogo_Koroba ?? '0')
      .input('Formirovanie_Pallet_Otgruzki', mssql.NVarChar(10), Formirovanie_Pallet_Otgruzki ?? '0')
      .input('Upakovochnyi_Material', mssql.NVarChar(10), Upakovochnyi_Material ?? '0')
      .input('Markirovka_Palleta_TM', mssql.NVarChar(10), Markirovka_Palleta_TM ?? '0')
      .input('Raskomplekt_Zakaza', mssql.NVarChar(10), Raskomplekt_Zakaza ?? '0')
      .input('Tip_Operatsii_LDU', mssql.NVarChar(255), Tip_Operatsii_LDU ?? '')
      .input('Zamorozhennaya_Zona', mssql.NVarChar(10), Zamorozhennaya_Zona ?? '0')
      .query(`
        UPDATE Test_MP
        SET 
          Sortiruemyi_Tovar = @Sortiruemyi_Tovar,
          Ne_Sortiruemyi_Tovar = @Ne_Sortiruemyi_Tovar,
          Produkty = @Produkty,
          Opasnyi_Tovar = @Opasnyi_Tovar,
          Zakrytaya_Zona = @Zakrytaya_Zona,
          Krupnogabaritnyi_Tovar = @Krupnogabaritnyi_Tovar,
          Yuvelirnye_Izdelia = @Yuvelirnye_Izdelia,
          Pechat_Etiketki_s_SHK = @Pechat_Etiketki_s_SHK,
          Pechat_Etiketki_s_Opisaniem = @Pechat_Etiketki_s_Opisaniem,
          PriznakSortirovki = @PriznakSortirovki,
          Upakovka_v_Gofro = @Upakovka_v_Gofro,
          Upakovka_v_PE_Paket = @Upakovka_v_PE_Paket,
          Vlozhit_v_upakovku_pechatnyi_material = @Vlozhit_v_upakovku_pechatnyi_material,
          Izmerenie_VGH_i_peredacha_informatsii = @Izmerenie_VGH_i_peredacha_informatsii,
          Indeks_za_srochnost_koeff_1_5 = @Indeks_za_srochnost_koeff_1_5,
          Kompleksnaya_priemka_tovara = @Kompleksnaya_priemka_tovara,
          Priemka_tovara_v_transportnykh_korobakh = @Priemka_tovara_v_transportnykh_korobakh,
          Priemka_tovara_palletnaya = @Priemka_tovara_palletnaya,
          Prochie_raboty_vklyuchaya_ustranenie_anomalii = @Prochie_raboty_vklyuchaya_ustranenie_anomalii,
          Razbrakovka_tovara = @Razbrakovka_tovara,
          Sborka_naborov_ot_2_shtuk_raznykh_tovarov = @Sborka_naborov_ot_2_shtuk_raznykh_tovarov,
          Upakovka_tovara_v_gofromeyler = @Upakovka_tovara_v_gofromeyler,
          Khranenie_tovara = @Khranenie_tovara,
          Primeryka_SHK = @Primeryka_SHK,
          Proverka_Sroka_Godnosti = @Proverka_Sroka_Godnosti,
          Upakovka_v_Babl_Plenku = @Upakovka_v_Babl_Plenku,
          Upakovka_v_Ind_Korob = @Upakovka_v_Ind_Korob,
          Markirovka_Tovara_Stiker_CHZ = @Markirovka_Tovara_Stiker_CHZ,
          Udalenie_Stikera_Markirovki = @Udalenie_Stikera_Markirovki,
          Dopolnitelnaya_Zashchita_Tovara = @Dopolnitelnaya_Zashchita_Tovara,
          Markirovka_Transportnogo_Koroba = @Markirovka_Transportnogo_Koroba,
          Formirovanie_Pallet_Otgruzki = @Formirovanie_Pallet_Otgruzki,
          Upakovochnyi_Material = @Upakovochnyi_Material,
          Markirovka_Palleta_TM = @Markirovka_Palleta_TM,
          Raskomplekt_Zakaza = @Raskomplekt_Zakaza,
          Tip_Operatsii_LDU = @Tip_Operatsii_LDU,
          Zamorozhennaya_Zona = @Zamorozhennaya_Zona
        WHERE Nazvanie_Zadaniya = @Nazvanie_Zadaniya AND Artikul = @Artikul
      `);

    res.status(200).json({ success: true, value: 'Данные успешно обновлены', errorCode: 200 });
  } catch (error) {
    console.error('Ошибка при обновлении записей:', error);
    res.status(500).json({ success: false, value: null, errorCode: 500 });
  }
};
const resetOzon = async (req, res) => {
  const { taskName, articul } = req.query;

  if (!taskName || !articul) {
    return res.status(400).json({ success: false, value: 'taskName and articul are required', errorCode: 400 });
  }

  try {
    const pool = await connectToDatabase();
    if (!pool) {
      throw new Error('Ошибка подключения к базе данных');
    }

    // Удаляем приемку для OZON по заданию и артикулу
    await pool.request()
      .input('TaskName', mssql.NVarChar, taskName)
      .input('Articul', mssql.NVarChar, articul)
      .query(`
        DELETE FROM [SPOe_rc].[dbo].[Test_MP_VP]
        WHERE Nazvanie_Zadaniya = @TaskName AND Artikul = @Articul
      `);

    // Получаем записи по `taskName` и `articul`, сортируем по `ID`
    const result = await pool.request()
      .input('TaskName', mssql.NVarChar, taskName)
      .input('Articul', mssql.NVarChar, articul)
      .query(`
        SELECT * FROM Test_MP
        WHERE Nazvanie_Zadaniya = @TaskName AND Artikul = @Articul
        ORDER BY ID ASC
      `);

    const records = result.recordset;

    if (records.length === 0) {
      return res.status(404).json({ success: false, value: 'No records found', errorCode: 404 });
    }

    const earliestRecord = records[0]; // Самая ранняя запись по ID
    const earliestId = earliestRecord.ID;

    // Удаляем все записи, кроме самой ранней
    await pool.request()
      .input('TaskName', mssql.NVarChar, taskName)
      .input('Articul', mssql.NVarChar, articul)
      .input('ID', mssql.BigInt, earliestId)
      .query(`
        DELETE FROM Test_MP
        WHERE Nazvanie_Zadaniya = @TaskName AND Artikul = @Articul AND ID <> @ID
      `);

    // Обнуляем поля в самой ранней записи
    await pool.request()
      .input('ID', mssql.BigInt, earliestId)
      .query(`
        UPDATE Test_MP
        SET Status = 0,
            Status_Zadaniya = 0,
            Mesto = 0,
            Vlozhennost = 0,
            Pallet_No = 0
        WHERE ID = @ID
      `);

    res.status(200).json({ success: true, value: 'Ozon reset completed', errorCode: 200 });

  } catch (error) {
    console.error('Ошибка при обнулении Ozon:', error);
    res.status(500).json({ success: false, value: error.message, errorCode: 500 });
  }
};

const resetWB = async (req, res) => {
  const { articul, taskName, id } = req.query;

  if (!articul || !taskName || !id) {
    return res.status(400).json({ success: false, value: 'articul, taskName, and id are required', errorCode: 400 });
  }

  try {
    const pool = await connectToDatabase();
    if (!pool) {
      throw new Error('Ошибка подключения к базе данных');
    }

    // Удаляем записи из `Test_MP_Privyazka` по `articul` и `taskName`
    await pool.request()
      .input('Articul', mssql.NVarChar, articul)
      .input('TaskName', mssql.NVarChar, taskName)
      .query(`
        DELETE FROM Test_MP_Privyazka
        WHERE Artikul = @Articul AND Nazvanie_Zadaniya = @TaskName
      `);

    // Удаляем приемку (Fact) по текущему заданию и артикулу
    await pool.request()
      .input('TaskName', mssql.NVarChar, taskName)
      .input('Articul', mssql.NVarChar, articul)
      .query(`
        DELETE FROM [SPOe_rc].[dbo].[Test_MP_VP]
        WHERE Nazvanie_Zadaniya = @TaskName AND Artikul = @Articul
      `);

    // Обнуляем запись в `Test_MP` по `ID`
    await pool.request()
      .input('ID', mssql.BigInt, BigInt(id))
      .query(`
        UPDATE Test_MP
        SET Status = 0,
            Status_Zadaniya = 0,
            Mesto = 0,
            Vlozhennost = 0,
            Pallet = 0
        WHERE ID = @ID
      `);

    res.status(200).json({ success: true, value: 'WB reset completed', errorCode: 200 });

  } catch (error) {
    console.error('Ошибка при обнулении WB:', error);
    res.status(500).json({ success: false, value: error.message, errorCode: 500 });
  }
};

module.exports = {
  getArticulsByTaskNumber,
  getUniqueTaskNames,
  getByShk,
  updateStatus,
  getRecordsByArticul,
  updateValues,
  updateSHKByTaskAndArticul,
  duplicateRecord,
  endStatus,
  updateStatusTaskAndArticul,
  getRecordsBySHKWPS,
  updateRecordsBySHKWPS,
  updateSHKWPS,
  updatePalletInfoBySHKWPS,
  getRecordsByWPS,
  getLDUBySHK,
  getTaskByStatus,
  addTaskStatus,
  updateRecordsBySHKWPSNEW,
  deleteRecordsByWB,
  setStatusNew,
  deleteRecordByOzon,
  resetOzon,
  resetWB
};
