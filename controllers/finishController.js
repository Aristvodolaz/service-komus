const mssql = require('mssql');
const { connectToDatabase } = require('../dbConfig');

// Контроллер для обновления данных в указанных колонках
const updateData = async (req, res) => {
  const { taskName, shk, srokGodnosti, mesto, vlozhennost, palletNo, timeEnd } = req.body;

  try {
    // Подключение к базе данных
    const pool = await connectToDatabase();
    if (!pool) {
      throw new Error('Ошибка подключения к базе данных');
    }

    // Формирование запроса на обновление данных
    const query = `
  UPDATE Test_MP
  SET
    Mesto = ISNULL(@Mesto, Mesto),
    Vlozhennost = ISNULL(@Vlozhennost, Vlozhennost),
    Pallet_No = ISNULL(@Pallet_No, Pallet_No),
    Status = 2,
    Status_Zadaniya = 1,
    Time_End = ISNULL(@Time_End, Time_End)
  WHERE ID = (
    SELECT TOP(1) ID
    FROM Test_MP
    WHERE
      Nazvanie_Zadaniya = @Nazvanie_Zadaniya
      AND SHK LIKE @SHK
    ORDER BY ID
  );
`;



    // Выполнение запроса с параметрами
    const result = await pool.request()
      .input('Nazvanie_Zadaniya', mssql.NVarChar(255), taskName)
      .input('SHK', mssql.NVarChar(50), shk)
      .input('Srok_Godnosti', mssql.NVarChar(50), srokGodnosti)
      .input('Mesto', mssql.NVarChar(50), mesto)
      .input('Vlozhennost', mssql.NVarChar(50), vlozhennost)
      .input('Pallet_No', mssql.NVarChar(50), palletNo)
      .input('Time_End', mssql.NVarChar(255), timeEnd)
      .query(query);

    // Проверка результатов выполнения запроса
    if (result.rowsAffected[0] > 0) {
      res.json({ success: true, message: 'Данные успешно обновлены.' });
    } else {
      res.status(404).json({ success: false, message: 'Запись не найдена.' });
    }
  } catch (error) {
    console.error('Ошибка при обновлении данных:', error);
    res.status(500).json({ success: false, message: 'Ошибка при обновлении данных', error: error.message });
  }
};

const updateDataNew = async (req, res) => {
  const { id, mesto, vlozhennost, palletNo, time } = req.query;

  try {
    // Подключение к базе данных
    const pool = await connectToDatabase();
    if (!pool) {
      throw new Error('Ошибка подключения к базе данных');
    }

    // Формирование запроса на обновление данных
    const query = `
    UPDATE Test_MP
    SET
      Mesto = @Mesto,
      Vlozhennost = @Vlozhennost,
      Pallet_No = @Pallet_No,
      Status = 2,
      Status_Zadaniya = 1,
      SHK_WPS = 0,
      Time_End = @Time_End
    WHERE
      ID = @ID
  `;
  

    // Выполнение запроса с параметрами
    const result = await pool.request()
      .input('Mesto', mssql.NVarChar(50), mesto)
      .input('Vlozhennost', mssql.NVarChar(50), vlozhennost)
      .input('Pallet_No', mssql.NVarChar(50), palletNo)
      .input('ID', mssql.BigInt, id)
      .input('Time_End', mssql.NVarChar(255), time)
      .query(query);

    // Проверка результатов выполнения запроса
    if (result.rowsAffected[0] > 0) {
      res.json({ success: true, message: 'Данные успешно обновлены.' });
    } else {
      res.status(404).json({ success: false, message: 'Запись не найдена.' });
    }
  } catch (error) {
    console.error('Ошибка при обновлении данных:', error);
    res.status(500).json({ success: false, message: 'Ошибка при обновлении данных', error: error.message });
  }
};

const setFinishStatus = async (req, res) => {
  const { id, time } = req.query;

  try {
    // Подключение к базе данных
    const pool = await connectToDatabase();
    if (!pool) {
      throw new Error('Ошибка подключения к базе данных');
    }

    // Формирование запроса на обновление данных
    const query = `
    UPDATE Test_MP
    SET
      Status = 2,
      Status_Zadaniya = 1,
      Time_End = @Time_End
    WHERE
      ID = @ID
  `;
  

    // Выполнение запроса с параметрами
    const result = await pool.request()
      .input('ID', mssql.BigInt, id)
      .input('Time_End', mssql.NVarChar(255), time)
      .query(query);

    // Проверка результатов выполнения запроса
    if (result.rowsAffected[0] > 0) {
      res.json({ success: true, message: 'Данные успешно обновлены.' });
    } else {
      res.status(404).json({ success: false, message: 'Запись не найдена.' });
    }
  } catch (error) {
    console.error('Ошибка при обновлении данных:', error);
    res.status(500).json({ success: false, message: 'Ошибка при обновлении данных', error: error.message });
  }
};

const updateOrAddRecord = async (req, res) => {
  const { id, mesto, vlozhennost, palletNo, time } = req.query;

  try {
    // Подключение к базе данных
    const pool = await connectToDatabase();
    if (!pool) {
      throw new Error('Ошибка подключения к базе данных');
    }

    // Проверка наличия совпадений по vlozhennost и palletNo
    const checkQuery = `
      SELECT ID, Mesto
      FROM Test_MP
      WHERE Vlozhennost = @Vlozhennost AND Pallet_No = @Pallet_No
    `;
    const checkResult = await pool.request()
      .input('Vlozhennost', mssql.NVarChar(50), vlozhennost)
      .input('Pallet_No', mssql.NVarChar(50), palletNo)
      .query(checkQuery);

    if (checkResult.recordset.length > 0) {
      // Если совпадение найдено, обновляем поле Mesto
      const existingRecord = checkResult.recordset[0];
      const newMesto = parseFloat(existingRecord.Mesto) + parseFloat(mesto);

      const updateQuery = `
        UPDATE Test_MP
        SET Mesto = @Mesto, Time_End = @Time_End
        WHERE ID = @ID
      `;
      await pool.request()
        .input('Mesto', mssql.NVarChar(50), newMesto.toString())
        .input('Time_End', mssql.NVarChar(255), time)
        .input('ID', mssql.BigInt, existingRecord.ID)
        .query(updateQuery);

      res.json({ success: true, message: 'Mesto обновлено успешно.' });
    } else {
      // Если совпадений нет, создаем дубликат записи
      const originalQuery = `
        SELECT *
        FROM Test_MP
        WHERE ID = @ID
      `;
      const originalResult = await pool.request()
        .input('ID', mssql.BigInt, id)
        .query(originalQuery);

      if (originalResult.recordset.length === 0) {
        res.status(404).json({ success: false, message: 'Оригинальная запись не найдена.' });
        return;
      }

      const originalRecord = originalResult.recordset[0];

      const insertQuery = `
        INSERT INTO Test_MP (
          Pref, Nazvanie_Zadaniya, Status_Zadaniya, Status, Ispolnitel, Artikul, Artikul_Syrya,
          Nazvanie_Tovara, SHK, SHK_SPO, SHK_SPO_1, Kol_vo_Syrya, Itog_Zakaz, Sht_v_MP, Itog_MP,
          SOH, Tip_Postavki, Srok_Godnosti, Mesto, Vlozhennost, Pallet_No, Time_Start, Time_Middle,
          Time_End, Persent, SHK_WPS
        ) VALUES (
          @Pref, @Nazvanie_Zadaniya, @Status_Zadaniya, @Status, @Ispolnitel, @Artikul, @Artikul_Syrya,
          @Nazvanie_Tovara, @SHK, @SHK_SPO, @SHK_SPO_1, @Kol_vo_Syrya, @Itog_Zakaz, @Sht_v_MP, @Itog_MP,
          @SOH, @Tip_Postavki, @Srok_Godnosti, @Mesto, @Vlozhennost, @Pallet_No, @Time_Start, @Time_Middle,
          @Time_End, @Persent, @SHK_WPS
        )
      `;
      await pool.request()
        .input('Pref', mssql.NVarChar(50), originalRecord.Pref)
        .input('Nazvanie_Zadaniya', mssql.NVarChar(255), originalRecord.Nazvanie_Zadaniya)
        .input('Status_Zadaniya', mssql.Int, originalRecord.Status_Zadaniya)
        .input('Status', mssql.Int, originalRecord.Status)
        .input('Ispolnitel', mssql.NVarChar(255), originalRecord.Ispolnitel)
        .input('Artikul', mssql.Int, originalRecord.Artikul)
        .input('Artikul_Syrya', mssql.NVarChar(50), originalRecord.Artikul_Syrya)
        .input('Nazvanie_Tovara', mssql.NVarChar(255), originalRecord.Nazvanie_Tovara)
        .input('SHK', mssql.NVarChar(255), originalRecord.SHK)
        .input('SHK_SPO', mssql.NVarChar(255), originalRecord.SHK_SPO)
        .input('SHK_SPO_1', mssql.NVarChar(255), originalRecord.SHK_SPO_1)
        .input('Kol_vo_Syrya', mssql.NVarChar(255), originalRecord.Kol_vo_Syrya)
        .input('Itog_Zakaz', mssql.Int, originalRecord.Itog_Zakaz)
        .input('Sht_v_MP', mssql.Int, originalRecord.Sht_v_MP)
        .input('Itog_MP', mssql.Int, originalRecord.Itog_MP)
        .input('SOH', mssql.NVarChar(10), originalRecord.SOH)
        .input('Tip_Postavki', mssql.NVarChar(50), originalRecord.Tip_Postavki)
        .input('Srok_Godnosti', mssql.NVarChar(50), originalRecord.Srok_Godnosti)
        .input('Mesto', mssql.NVarChar(50), mesto)
        .input('Vlozhennost', mssql.NVarChar(50), vlozhennost)
        .input('Pallet_No', mssql.NVarChar(50), palletNo)
        .input('Time_Start', mssql.NVarChar(255), originalRecord.Time_Start)
        .input('Time_Middle', mssql.NVarChar(255), originalRecord.Time_Middle)
        .input('Time_End', mssql.NVarChar(255), time)
        .input('Persent', mssql.NVarChar(50), originalRecord.Persent)
        .input('SHK_WPS', mssql.Int, originalRecord.SHK_WPS)
        .query(insertQuery);

      res.json({ success: true, message: 'Дубликат записи успешно создан.' });
    }
  } catch (error) {
    console.error('Ошибка при обработке записи:', error);
    res.status(500).json({ success: false, message: 'Ошибка при обработке записи', error: error.message });
  }
};


module.exports = {
  updateData,
  updateDataNew,
  updateOrAddRecord,
  setFinishStatus
};
