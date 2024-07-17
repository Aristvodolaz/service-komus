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

const getUniqueTaskNames = async (req, res) => {
  const { filter } = req.query;

  try {
    const pool = await connectToDatabase();
    if (!pool) {
      throw new Error('Ошибка подключения к базе данных');
    }

    let query = 'SELECT DISTINCT Nazvanie_Zadaniya FROM Test_MP';
    const request = pool.request();

    if (filter) {
      query += ' WHERE Nazvanie_Zadaniya LIKE @filter';
      request.input('filter', mssql.NVarChar(255), `%${filter}%`);
    }

    const result = await request.query(query);

    res.status(200).json({ success: true, value: result.recordset.map(row => row.Nazvanie_Zadaniya), errorCode: 200 });
  } catch (error) {
    console.error('Ошибка при получении уникальных названий заданий:', error);
    res.status(500).json({ success: false, value: null, errorCode: 500 });
  }
};

const getByShk = async (req, res) => {
  const { taskName, shk } = req.body; // Extract taskName and shk from req.body

  // Check if taskName or shk is missing in the request body
  if (!taskName || !shk) {
    return res.status(400).json({ success: false, value: 'taskName and shk are required', errorCode: 400 });
  }

  try {
    const pool = await connectToDatabase();
    if (!pool) {
      throw new Error('Failed to connect to the database');
    }

    const result = await pool.request()
      .input('Nazvanie_Zadaniya', mssql.NVarChar(255), taskName)
      .input('SHK', mssql.NVarChar(50), `%${shk}%`)
      .query('SELECT * FROM Test_MP WHERE SHK LIKE @SHK AND Nazvanie_Zadaniya = @Nazvanie_Zadaniya');

    res.status(200).json({ success: true, value: result.recordset, errorCode: 200 });
  } catch (error) {
    console.error('Error fetching data by SHK:', error);
    res.status(500).json({ success: false, value: null, errorCode: 500 });
  }
};


const updateStatus = async (req, res) => {
  const { taskName, articul, status } = req.body;

  if (!taskName || !articul || status === undefined) {
    return res.status(400).json({ success: false, value: 'taskName, shk, and status are required', errorCode: 400 });
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
      .query('UPDATE Test_MP SET Status = @Status WHERE Nazvanie_Zadaniya = @Nazvanie_Zadaniya AND Artikul = @Artikul');

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

const updateValues = async (req, res) => {
  const { Nazvanie_Zadaniya, SHK, columnsToUpdate } = req.body;

  if (!Nazvanie_Zadaniya || !SHK || !Array.isArray(columnsToUpdate) || columnsToUpdate.length === 0) {
    return res.status(400).json({ success: false, value: 'Nazvanie_Zadaniya, SHK, and columnsToUpdate are required', errorCode: 400 });
  }

  try {
    const pool = await connectToDatabase();

    const setClause = columnsToUpdate.map(column => `[${column}] = 'V'`).join(', ');

    const query = `
      UPDATE Test_MP
      SET
        ${setClause}
     WHERE Nazvanie_Zadaniya = @Nazvanie_Zadaniya AND SHK LIKE @SHK
    `;

    const result = await pool.request()
      .input('Nazvanie_Zadaniya', mssql.NVarChar(255), Nazvanie_Zadaniya)
      .input('SHK', mssql.NVarChar(255), SHK)
      .query(query);

    if (result.rowsAffected[0] > 0) {
      res.status(200).json({ success: true, value: `Значения успешно обновлены для документа ${Nazvanie_Zadaniya} с номером ШК ${SHK}`, errorCode: 200 });
    } else {
      res.status(404).json({ success: false, value: `Запись не найдена для документа ${Nazvanie_Zadaniya} с номером ШК ${SHK}`, errorCode: 404 });
    }
  } catch (error) {
    console.error('Ошибка при обновлении значений в базе данных:', error);
    res.status(500).json({ success: false, value: null, errorCode: 500 });
  }
};

const duplicateRecord = async (req, res) => {
  const { taskName, shk, srokGodnosti, ispolnitel, mesto, vlozhennost, palletNo } = req.body;

  try {
    const pool = await connectToDatabase();
    if (!pool) {
      throw new Error('Ошибка подключения к базе данных');
    }

    // Находим запись по номеру задания и ШК
    const result = await pool.request()
      .input('Nazvanie_Zadaniya', mssql.NVarChar(255), taskName)
      .input('SHK', mssql.NVarChar(255), shk)
      .query('SELECT * FROM Test_MP WHERE Nazvanie_Zadaniya = @Nazvanie_Zadaniya AND SHK = @SHK');

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Запись не найдена' });
    }

    // Получаем оригинальную запись
    const originalRecord = result.recordset[0];

    // Создаем дубликат записи с новыми значениями для полей `mesto`, `vlozhennost` и `palletNo`
    await pool.request()
      .input('Pref', mssql.NVarChar(50), originalRecord.Pref)
      .input('Nazvanie_Zadaniya', mssql.NVarChar(255), originalRecord.Nazvanie_Zadaniya)
      .input('Status_Zadaniya', mssql.Int, 0)
      .input('Status', mssql.Int, 0)
      .input('Ispolnitel', mssql.NVarChar(255), ispolnitel)
      .input('Artikul', mssql.Int, originalRecord.Artikul)
      .input('Artikul_Syrya', mssql.NVarChar(50), originalRecord.Artikul_Syrya)
      .input('Nomenklatura', mssql.Int, originalRecord.Nomenklatura)
      .input('Nazvanie_Tovara', mssql.NVarChar(255), originalRecord.Nazvanie_Tovara)
      .input('SHK', mssql.NVarChar(255), originalRecord.SHK)
      .input('SHK_SPO', mssql.NVarChar(255), originalRecord.SHK_SPO)
      .input('SHK_SPO_1', mssql.NVarChar(255), originalRecord.SHK_SPO_1)
      .input('Kol_vo_Syrya', mssql.Int, originalRecord.Kol_vo_Syrya)
      .input('Itog_Zakaz', mssql.Int, originalRecord.Itog_Zakaz)
      .input('Sht_v_MP', mssql.Int, originalRecord.Sht_v_MP)
      .input('Itog_MP', mssql.Int, originalRecord.Itog_MP)
      .input('SOH', mssql.NVarChar(10), originalRecord.SOH)
      .input('Tip_Postavki', mssql.NVarChar(50), originalRecord.Tip_Postavki)
      .input('Srok_Godnosti', mssql.NVarChar(50), srokGodnosti)
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
      .query(`
        INSERT INTO Test_MP (
          Pref, Nazvanie_Zadaniya, Status_Zadaniya, Status, Ispolnitel, Artikul, Artikul_Syrya, 
          Nomenklatura, Nazvanie_Tovara, SHK, SHK_SPO, SHK_SPO_1, Kol_vo_Syrya, Itog_Zakaz, 
          Sht_v_MP, Itog_MP, SOH, Tip_Postavki, Srok_Godnosti, Op_1_Bl_1_Sht, Op_2_Bl_2_Sht, 
          Op_3_Bl_3_Sht, Op_4_Bl_4_Sht, Op_5_Bl_5_Sht, Op_6_Blis_6_10_Sht, Op_7_Pereschyot, 
          Op_9_Fasovka_Sborka, Op_10_Markirovka_SHT, Op_11_Markirovka_Prom, Op_12_Markirovka_Pром, 
          Op_13_Markirovka_Fabr, Op_14_TU_1_Sht, Op_15_TU_2_Sht, Op_16_TU_3_5, Op_17_TU_6_8, 
          Op_468_Proverka_SHK, Op_469_Spetsifikatsiya_TM, Op_470_Dop_Upakovka, Mesto, Vlozhennost, 
          Pallet_No, Time_Start, Time_End
        ) VALUES (
          @Pref, @Nazvanie_Zadaniya, @Status_Zadaniya, @Status, @Ispolnitel, @Artikul, @Artikul_Syrya, 
          @Nomenklatura, @Nazvanie_Tovara, @SHK, @SHK_SPO, @SHK_SPO_1, @Kol_vo_Syrya, @Itog_Zakaz, 
          @Sht_v_MP, @Itog_MP, @SOH, @Tip_Postavki, @Srok_Godnosti, @Op_1_Bl_1_Sht, @Op_2_Bl_2_Sht, 
          @Op_3_Bl_3_Sht, @Op_4_Bl_4_Sht, @Op_5_Bl_5_Sht, @Op_6_Blis_6_10_Sht, @Op_7_Pereschyot, 
          @Op_9_Fasovka_Sborka, @Op_10_Markirovka_SHT, @Op_11_Markirovka_Prom, @Op_12_Markirovka_Pром, 
          @Op_13_Markirovka_Fabr, @Op_14_TU_1_Sht, @Op_15_TU_2_Sht, @Op_16_TU_3_5, @Op_17_TU_6_8, 
          @Op_468_Proverka_SHK, @Op_469_Spetsifikatsiya_TM, @Op_470_Dop_Upakovka, @Mesto, @Vlozhennost, 
          @Pallet_No, @Time_Start, @Time_End
        )
      `);

    res.json({ message: 'Запись успешно продублирована' });
  } catch (error) {
    console.error('Ошибка при дублировании записи:', error);
    res.status(500).json({ error: 'Ошибка при дублировании записи' });
  }
};


const updateSHKByTaskAndArticul = async (req, res) => {
  const { taskName, articul, newSHK } = req.body;

  try {
    const pool = await connectToDatabase();
    if (!pool) {
      throw new Error('Ошибка подключения к базе данных');
    }

    // Обновление записи по названию задания и артиклу
    await pool.request()
      .input('Nazvanie_Zadaniya', mssql.NVarChar(255), taskName)
      .input('Artikul', mssql.Int, articul)
      .input('NewSHK', mssql.NVarChar(255), newSHK)
      .query('UPDATE Test_MP SET SHK = @NewSHK WHERE Nazvanie_Zadaniya = @Nazvanie_Zadaniya AND Artikul = @Artikul');

    res.json({ message: 'ШК успешно обновлен' });
  } catch (error) {
    console.error('Ошибка при обновлении ШК:', error);
    res.status(500).json({ error: 'Ошибка при обновлении ШК' });
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
  duplicateRecord
};
