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
      UPDATE TOP (1) Test_MP
      SET
        Mesto = ISNULL(@Mesto, Mesto),
        Vlozhennost = ISNULL(@Vlozhennost, Vlozhennost),
        Pallet_No = ISNULL(@Pallet_No, Pallet_No),
        Status = 2,
        Status_Zadaniya = 1,
        SHK_WPS = 0,
        Time_End = ISNULL(@Time_End, Time_End)
      WHERE
        Nazvanie_Zadaniya = @Nazvanie_Zadaniya
        AND SHK LIKE @SHK 
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

module.exports = {
  updateData,
  updateDataNew
};
