const mssql = require('mssql');
const { connectToDatabase, sql } = require('../dbConfig');
const { error } = require('winston');

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
      SELECT Nazvanie_Zadaniya, Scklad_Pref 
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
      GROUP BY Nazvanie_Zadaniya, Scklad_Pref
    `;

    const result = await request.query(query);

    res.status(200).json({
      success: true,
      value: result.recordset.map(row => ({
        Nazvanie_Zadaniya: row.Nazvanie_Zadaniya,
        Scklad_Pref: row.Scklad_Pref,
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
      .input('SHK', mssql.NVarChar(50), `%${shk}%`)
      .query('UPDATE Test_MP SET SHK = @SHK WHERE Nazvanie_Zadaniya = @Nazvanie_Zadaniya AND SHK LIKE @SHK');

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
          Op_1_Bl_1_Sht,
          Op_2_Bl_2_Sht,
          Op_3_Bl_3_Sht,
          Op_4_Bl_4_Sht,
          Op_5_Bl_5_Sht,
          Op_6_Blis_6_10_Sht,
          Op_7_Pereschyot,
          Op_9_Fasovka_Sborka,
          Op_10_Markirovka_SHT,
          Op_11_Markirovka_Prom,
          Op_12_Markirovka_Prom,
          Op_13_Markirovka_Fabr,
          Op_14_TU_1_Sht,
          Op_15_TU_2_Sht,
          Op_16_TU_3_5,
          Op_17_TU_6_8,
          Op_468_Proverka_SHK,
          Op_469_Spetsifikatsiya_TM,
          Op_470_Dop_Upakovka
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
          Op_1_Bl_1_Sht,
          Op_2_Bl_2_Sht,
          Op_3_Bl_3_Sht,
          Op_4_Bl_4_Sht,
          Op_5_Bl_5_Sht,
          Op_6_Blis_6_10_Sht,
          Op_7_Pereschyot,
          Op_9_Fasovka_Sborka,
          Op_10_Markirovka_SHT,
          Op_11_Markirovka_Prom,
          Op_12_Markirovka_Prom,
          Op_13_Markirovka_Fabr,
          Op_14_TU_1_Sht,
          Op_15_TU_2_Sht,
          Op_16_TU_3_5,
          Op_17_TU_6_8,
          Op_468_Proverka_SHK,
          Op_469_Spetsifikatsiya_TM,
          Op_470_Dop_Upakovka
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

    // Создаем дубликат записи с новыми значениями для полей `mesto`, `vlozhennost` и `palletNo`
    await pool.request()
      .input('Pref', mssql.NVarChar(50), originalRecord.Pref)
      .input('Nazvanie_Zadaniya', mssql.NVarChar(255), originalRecord.Nazvanie_Zadaniya)
      .input('Status_Zadaniya', mssql.Int, 1)
      .input('Status', mssql.Int, 2)
      .input('Ispolnitel', mssql.NVarChar(255), originalRecord.Ispolnitel)
      .input('Artikul', mssql.Int, originalRecord.Artikul)
      .input('Artikul_Syrya', mssql.NVarChar(50), originalRecord.Artikul_Syrya)
      .input('Nomenklatura', mssql.Int, originalRecord.Nomenklatura)
      .input('Nazvanie_Tovara', mssql.NVarChar(255), originalRecord.Nazvanie_Tovara)
      .input('SHK', mssql.NVarChar(255), originalRecord.SHK)
      .input('SHK_SPO', mssql.NVarChar(255), originalRecord.SHK_SPO)
      .input('SHK_SPO_1', mssql.NVarChar(255), originalRecord.SHK_SPO_1)
      .input('Kol_vo_Syrya', mssql.NVarChar(255), originalRecord.Kol_vo_Syrya)
      .input('Itog_Zakaz', mssql.Int, 0)
      .input('Sht_v_MP', mssql.Int, originalRecord.Sht_v_MP)
      .input('Itog_MP', mssql.Int, originalRecord.Itog_MP)
      .input('SOH', mssql.NVarChar(10), originalRecord.SOH)
      .input('Tip_Postavki', mssql.NVarChar(50), originalRecord.Tip_Postavki)
      .input('Srok_Godnosti', mssql.NVarChar(50), originalRecord.Srok_Godnosti)
      .input('Op_1_Bl_1_Sht', mssql.NVarChar(10), originalRecord.Op_1_Bl_1_Sht)
      .input('Op_2_Bl_2_Sht', mssql.NVarChar(10), originalRecord.Op_2_Bl_2_Sht)
      .input('Op_3_Bl_3_Sht', mssql.NVarChar(10), originalRecord.Op_3_Bl_3_Sht)
      .input('Op_4_Bl_4_Sht', mssql.NVarChar(10), originalRecord.Op_4_Bl_4_Sht)
      .input('Op_5_Bl_5_Sht', mssql.NVarChar(10), originalRecord.Op_5_Bl_5_Sht)
      .input('Op_6_Blis_6_10_Sht', mssql.NVarChar(10), originalRecord.Op_6_Blis_6_10_Sht)
      .input('Op_7_Pereschyot', mssql.NVarChar(10), originalRecord.Op_7_Pereschyot)
      .input('Op_9_Fasovka_Sborka', mssql.NVarChar(10), originalRecord.Op_9_Fasovka_Sborka)
      .input('Op_10_Markirovka_SHT', mssql.NVarChar(10), originalRecord.Op_10_Markirovka_SHT)
      .input('Op_11_Markirovka_Prom', mssql.NVarChar(10), originalRecord.Op_11_Markirovka_Prom)
      .input('Op_12_Markirovka_Prom', mssql.NVarChar(10), originalRecord.Op_12_Markirovka_Prom)
      .input('Op_13_Markirovka_Fabr', mssql.NVarChar(10), originalRecord.Op_13_Markirovka_Fabr)
      .input('Op_14_TU_1_Sht', mssql.NVarChar(10), originalRecord.Op_14_TU_1_Sht)
      .input('Op_15_TU_2_Sht', mssql.NVarChar(10), originalRecord.Op_15_TU_2_Sht)
      .input('Op_16_TU_3_5', mssql.NVarChar(10), originalRecord.Op_16_TU_3_5)
      .input('Op_17_TU_6_8', mssql.NVarChar(10), originalRecord.Op_17_TU_6_8)
      .input('Op_468_Proverka_SHK', mssql.NVarChar(10), originalRecord.Op_468_Proverka_SHK)
      .input('Op_469_Spetsifikatsiya_TM', mssql.NVarChar(10), originalRecord.Op_469_Spetsifikatsiya_TM)
      .input('Op_470_Dop_Upakovka', mssql.NVarChar(10), originalRecord.Op_470_Dop_Upakovka)
      .input('Mesto', mssql.NVarChar(50), mesto)
      .input('Vlozhennost', mssql.NVarChar(50), vlozhennost)
      .input('Pallet_No', mssql.NVarChar(50), palletNo)
      .input('Time_Start', mssql.NVarChar(255), originalRecord.Time_Start)
      .input('Time_Middle', mssql.NVarChar(255), originalRecord.Time_Middle)
      .input('Time_End', mssql.NVarChar(255), originalRecord.Time_End)
      .input('Persent', mssql.NVarChar(50), originalRecord.Persent)
      .query(`
        INSERT INTO Test_MP (
          Pref, Nazvanie_Zadaniya, Status_Zadaniya, Status, Ispolnitel, Artikul, Artikul_Syrya, 
          Nomenklatura, Nazvanie_Tovara, SHK, SHK_SPO, SHK_SPO_1, Kol_vo_Syrya, Itog_Zakaz, 
          Sht_v_MP, Itog_MP, SOH, Tip_Postavki, Srok_Godnosti, Op_1_Bl_1_Sht, Op_2_Bl_2_Sht, 
          Op_3_Bl_3_Sht, Op_4_Bl_4_Sht, Op_5_Bl_5_Sht, Op_6_Blis_6_10_Sht, Op_7_Pereschyot, 
          Op_9_Fasovka_Sborka, Op_10_Markirovka_SHT, Op_11_Markirovka_Prom, Op_12_Markirovka_Prom, 
          Op_13_Markirovka_Fabr, Op_14_TU_1_Sht, Op_15_TU_2_Sht, Op_16_TU_3_5, Op_17_TU_6_8, 
          Op_468_Proverka_SHK, Op_469_Spetsifikatsiya_TM, Op_470_Dop_Upakovka, Mesto, Vlozhennost, 
          Pallet_No, Time_Start, Time_Middle, Time_End, Persent
        ) VALUES (
          @Pref, @Nazvanie_Zadaniya, @Status_Zadaniya, @Status, @Ispolnitel, @Artikul, @Artikul_Syrya, 
          @Nomenklatura, @Nazvanie_Tovara, @SHK, @SHK_SPO, @SHK_SPO_1, @Kol_vo_Syrya, @Itog_Zakaz, 
          @Sht_v_MP, @Itog_MP, @SOH, @Tip_Postavki, @Srok_Godnosti, @Op_1_Bl_1_Sht, @Op_2_Bl_2_Sht, 
          @Op_3_Bl_3_Sht, @Op_4_Bl_4_Sht, @Op_5_Bl_5_Sht, @Op_6_Blis_6_10_Sht, @Op_7_Pereschyot, 
          @Op_9_Fasovka_Sborka, @Op_10_Markirovka_SHT, @Op_11_Markirovka_Prom, @Op_12_Markirovka_Prom, 
          @Op_13_Markirovka_Fabr, @Op_14_TU_1_Sht, @Op_15_TU_2_Sht, @Op_16_TU_3_5, @Op_17_TU_6_8, 
          @Op_468_Proverka_SHK, @Op_469_Spetsifikatsiya_TM, @Op_470_Dop_Upakovka, @Mesto, @Vlozhennost, 
          @Pallet_No, @Time_Start,@Time_Middle, @Time_End, @Persent
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
    Op_1_Bl_1_Sht,
    Op_2_Bl_2_Sht,
    Op_3_Bl_3_Sht,
    Op_4_Bl_4_Sht,
    Op_5_Bl_5_Sht,
    Op_6_Blis_6_10_Sht,
    Op_7_Pereschyot,
    Op_9_Fasovka_Sborka,
    Op_10_Markirovka_SHT,
    Op_11_Markirovka_Prom,
    Op_12_Markirovka_Prom,
    Op_13_Markirovka_Fabr,
    Op_14_TU_1_Sht,
    Op_15_TU_2_Sht,
    Op_16_TU_3_5,
    Op_17_TU_6_8,
    Op_468_Proverka_SHK,
    Op_469_Spetsifikatsiya_TM,
    Op_470_Dop_Upakovka
  } = req.body;


  try {
    const pool = await connectToDatabase();
    if (!pool) {
      throw new Error('Ошибка подключения к базе данных');
    }

    await pool.request()
    .input('Nazvanie_Zadaniya', mssql.NVarChar(255), taskName)
    .input('Artikul', mssql.Int, articul)
      .input('Op_1_Bl_1_Sht', mssql.NVarChar(10), Op_1_Bl_1_Sht)
      .input('Op_2_Bl_2_Sht', mssql.NVarChar(10), Op_2_Bl_2_Sht)
      .input('Op_3_Bl_3_Sht', mssql.NVarChar(10), Op_3_Bl_3_Sht)
      .input('Op_4_Bl_4_Sht', mssql.NVarChar(10), Op_4_Bl_4_Sht)
      .input('Op_5_Bl_5_Sht', mssql.NVarChar(10), Op_5_Bl_5_Sht)
      .input('Op_6_Blis_6_10_Sht', mssql.NVarChar(10), Op_6_Blis_6_10_Sht)
      .input('Op_7_Pereschyot', mssql.NVarChar(10), Op_7_Pereschyot)
      .input('Op_9_Fasovka_Sborka', mssql.NVarChar(10), Op_9_Fasovka_Sborka)
      .input('Op_10_Markirovka_SHT', mssql.NVarChar(10), Op_10_Markirovka_SHT)
      .input('Op_11_Markirovka_Prom', mssql.NVarChar(10), Op_11_Markirovka_Prom)
      .input('Op_12_Markirovka_Prom', mssql.NVarChar(10), Op_12_Markirovka_Prom)
      .input('Op_13_Markirovka_Fabr', mssql.NVarChar(10), Op_13_Markirovka_Fabr)
      .input('Op_14_TU_1_Sht', mssql.NVarChar(10), Op_14_TU_1_Sht)
      .input('Op_15_TU_2_Sht', mssql.NVarChar(10), Op_15_TU_2_Sht)
      .input('Op_16_TU_3_5', mssql.NVarChar(10), Op_16_TU_3_5)
      .input('Op_17_TU_6_8',mssql.NVarChar(10), Op_17_TU_6_8)
      .input('Op_468_Proverka_SHK', mssql.NVarChar(10), Op_468_Proverka_SHK)
      .input('Op_469_Spetsifikatsiya_TM', mssql.NVarChar(10), Op_469_Spetsifikatsiya_TM)
      .input('Op_470_Dop_Upakovka', mssql.NVarChar(10), Op_470_Dop_Upakovka)
      .query(`
        UPDATE Test_MP
        SET 
          Op_1_Bl_1_Sht = @Op_1_Bl_1_Sht,
          Op_2_Bl_2_Sht = @Op_2_Bl_2_Sht,
          Op_3_Bl_3_Sht = @Op_3_Bl_3_Sht,
          Op_4_Bl_4_Sht = @Op_4_Bl_4_Sht,
          Op_5_Bl_5_Sht = @Op_5_Bl_5_Sht,
          Op_6_Blis_6_10_Sht = @Op_6_Blis_6_10_Sht,
          Op_7_Pereschyot = @Op_7_Pereschyot,
          Op_9_Fasovka_Sborka = @Op_9_Fasovka_Sborka,
          Op_10_Markirovka_SHT = @Op_10_Markirovka_SHT,
          Op_11_Markirovka_Prom = @Op_11_Markirovka_Prom,
          Op_12_Markirovka_Prom = @Op_12_Markirovka_Prom,
          Op_13_Markirovka_Fabr = @Op_13_Markirovka_Fabr,
          Op_14_TU_1_Sht = @Op_14_TU_1_Sht,
          Op_15_TU_2_Sht = @Op_15_TU_2_Sht,
          Op_16_TU_3_5 = @Op_16_TU_3_5,
          Op_17_TU_6_8 = @Op_17_TU_6_8,
          Op_468_Proverka_SHK = @Op_468_Proverka_SHK,
          Op_469_Spetsifikatsiya_TM = @Op_469_Spetsifikatsiya_TM,
          Op_470_Dop_Upakovka = @Op_470_Dop_Upakovka
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
  const { taskName, articul } = req.query; // Получаем параметры запроса
  const {
    Op_1_Bl_1_Sht,
    Op_2_Bl_2_Sht,
    Op_3_Bl_3_Sht,
    Op_4_Bl_4_Sht,
    Op_5_Bl_5_Sht,
    Op_6_Blis_6_10_Sht,
    Op_7_Pereschyot,
    Op_9_Fasovka_Sborka,
    Op_10_Markirovka_SHT,
    Op_11_Markirovka_Prom,
    Op_12_Markirovka_Prom,
    Op_13_Markirovka_Fabr,
    Op_14_TU_1_Sht,
    Op_15_TU_2_Sht,
    Op_16_TU_3_5,
    Op_17_TU_6_8,
    Op_468_Proverka_SHK,
    Op_469_Spetsifikatsiya_TM,
    Op_470_Dop_Upakovka
  } = req.body; // Получаем данные из тела запроса

  console.log(Op_1_Bl_1_Sht)
  try {
    const pool = await connectToDatabase();
    if (!pool) {
      throw new Error('Ошибка подключения к базе данных');
    }

    // Запрос к базе данных
    await pool.request()
      .input('Nazvanie_Zadaniya', mssql.NVarChar(255), taskName || '')
      .input('Artikul', mssql.Int, articul || 0)
      .input('Op_1_Bl_1_Sht', mssql.NVarChar(10), Op_1_Bl_1_Sht ?? '0')
      .input('Op_2_Bl_2_Sht', mssql.NVarChar(10), Op_2_Bl_2_Sht ?? '0')
      .input('Op_3_Bl_3_Sht', mssql.NVarChar(10), Op_3_Bl_3_Sht ?? '0')
      .input('Op_4_Bl_4_Sht', mssql.NVarChar(10), Op_4_Bl_4_Sht ?? '0')
      .input('Op_5_Bl_5_Sht', mssql.NVarChar(10), Op_5_Bl_5_Sht ?? '0')
      .input('Op_6_Blis_6_10_Sht', mssql.NVarChar(10), Op_6_Blis_6_10_Sht ?? '0')
      .input('Op_7_Pereschyot', mssql.NVarChar(10), Op_7_Pereschyot ?? '0')
      .input('Op_9_Fasovka_Sborka', mssql.NVarChar(10), Op_9_Fasovka_Sborka ?? '0')
      .input('Op_10_Markirovka_SHT', mssql.NVarChar(10), Op_10_Markirovka_SHT ?? '0')
      .input('Op_11_Markirovka_Prom', mssql.NVarChar(10), Op_11_Markirovka_Prom ?? '0')
      .input('Op_12_Markirovka_Prom', mssql.NVarChar(10), Op_12_Markirovka_Prom ?? '0')
      .input('Op_13_Markirovka_Fabr', mssql.NVarChar(10), Op_13_Markirovka_Fabr ?? '0')
      .input('Op_14_TU_1_Sht', mssql.NVarChar(10), Op_14_TU_1_Sht ?? '0')
      .input('Op_15_TU_2_Sht', mssql.NVarChar(10), Op_15_TU_2_Sht ?? '0')
      .input('Op_16_TU_3_5', mssql.NVarChar(10), Op_16_TU_3_5 ?? '0')
      .input('Op_17_TU_6_8', mssql.NVarChar(10), Op_17_TU_6_8 ?? '0')
      .input('Op_468_Proverka_SHK', mssql.NVarChar(10), Op_468_Proverka_SHK ?? '0')
      .input('Op_469_Spetsifikatsiya_TM', mssql.NVarChar(10), Op_469_Spetsifikatsiya_TM ?? '0')
      .input('Op_470_Dop_Upakovka', mssql.NVarChar(10), Op_470_Dop_Upakovka ?? '0')
      .query(`
        UPDATE Test_MP
        SET 
          Op_1_Bl_1_Sht = @Op_1_Bl_1_Sht,
          Op_2_Bl_2_Sht = @Op_2_Bl_2_Sht,
          Op_3_Bl_3_Sht = @Op_3_Bl_3_Sht,
          Op_4_Bl_4_Sht = @Op_4_Bl_4_Sht,
          Op_5_Bl_5_Sht = @Op_5_Bl_5_Sht,
          Op_6_Blis_6_10_Sht = @Op_6_Blis_6_10_Sht,
          Op_7_Pereschyot = @Op_7_Pereschyot,
          Op_9_Fasovka_Sborka = @Op_9_Fasovka_Sborka,
          Op_10_Markirovka_SHT = @Op_10_Markirovka_SHT,
          Op_11_Markirovka_Prom = @Op_11_Markirovka_Prom,
          Op_12_Markirovka_Prom = @Op_12_Markirovka_Prom,
          Op_13_Markirovka_Fabr = @Op_13_Markirovka_Fabr,
          Op_14_TU_1_Sht = @Op_14_TU_1_Sht,
          Op_15_TU_2_Sht = @Op_15_TU_2_Sht,
          Op_16_TU_3_5 = @Op_16_TU_3_5,
          Op_17_TU_6_8 = @Op_17_TU_6_8,
          Op_468_Proverka_SHK = @Op_468_Proverka_SHK,
          Op_469_Spetsifikatsiya_TM = @Op_469_Spetsifikatsiya_TM,
          Op_470_Dop_Upakovka = @Op_470_Dop_Upakovka
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
        WHERE Artikul = @Articul AND NazvanieZadaniya = @TaskName
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
