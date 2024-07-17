const mssql = require('mssql');
const { connectToDatabase } = require('../dbConfig');

// Контроллер для обновления данных в указанных колонках
const updateData = async (req, res) => {
  const { taskName, shk, srokGodnosti, mesto, vlozhennost, palletNo, ispolnitel } = req.body;

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
        Srok_Godnosti = ISNULL(@Srok_Godnosti, Srok_Godnosti),
        Mesto = ISNULL(@Mesto, Mesto),
        Vlozhennost = ISNULL(@Vlozhennost, Vlozhennost),
        Pallet_No = ISNULL(@Pallet_No, Pallet_No),
        Status = 2,
        Ispolnitel = ISNULL(@Ispolnitel, Ispolnitel)
      WHERE
        Nazvanie_Zadaniya = @Nazvanie_Zadaniya
        AND SHK LIKE @SHK;
    `;

    // Выполнение запроса с параметрами
    const result = await pool.request()
      .input('Nazvanie_Zadaniya', mssql.NVarChar(255), taskName)
      .input('SHK', mssql.NVarChar(50), shk)
      .input('Srok_Godnosti', mssql.NVarChar(50), srokGodnosti)
      .input('Mesto', mssql.NVarChar(50), mesto)
      .input('Vlozhennost', mssql.NVarChar(50), vlozhennost)
      .input('Pallet_No', mssql.NVarChar(50), palletNo)
      .input('Ispolnitel', mssql.NVarChar(255), ispolnitel)
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
};
