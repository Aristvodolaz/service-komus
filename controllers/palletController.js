const mssql = require('mssql');
const { connectToDatabase } = require('../dbConfig');

// Получить список паллетов по названию задания
const getPalletsByTaskName = async (req, res) => {
  const { taskName } = req.query;

  // Проверка входного параметра
  if (!taskName) {
    return res.status(400).json({
      success: false,
      value: 'taskName is required',
      errorCode: 400,
    });
  }

  try {
    const pool = await connectToDatabase();
    if (!pool) {
      throw new Error('Ошибка подключения к базе данных');
    }

    const result = await pool.request()
      .input('taskName', mssql.NVarChar(255), taskName)
      .query(`
        SELECT DISTINCT Pallet_No
        FROM Test_MP
        WHERE Nazvanie_Zadaniya = @taskName AND Pallet_No IS NOT NULL
      `);

    // Успешный результат
    res.status(200).json({
      success: true,
      value: result.recordset,
      errorCode: 200,
    });
  } catch (error) {
    console.error('Ошибка при получении списка паллетов:', error);

    // Ошибка сервера
    res.status(500).json({
      success: false,
      value: null,
      errorCode: 500,
    });
  }
};

// Получить список артикулов по номеру паллета и подсчитать количество мест
const getArticlesByPalletNumber = async (req, res) => {
  const { palletNo, task } = req.query;

  // Проверка входного параметра
  if (!palletNo || !task) {
    return res.status(400).json({
      success: false,
      value: null,
      errorCode: 400,
      message: 'Номер паллета не указан',
    });
  }

  try {
    const pool = await connectToDatabase();
    if (!pool) {
      throw new Error('Ошибка подключения к базе данных');
    }

    const result = await pool.request()
      .input('palletNo', mssql.NVarChar(255), palletNo)
      .input('task', mssql.NVarChar(255),task)
      .query(`
        SELECT 
          [Artikul],
          [Nazvanie_Tovara],
          [Mesto]
        FROM [SPOe_rc].[dbo].[Test_MP]
        WHERE [Pallet_No] = @palletNo and [Nazvanie_Zadaniya] = @task
      `);

    // Подсчет общего количества мест
    const totalPlaces = result.recordset.reduce((sum, record) => sum + (record.Mesto || 0), 0);

    // Успешный ответ
    res.status(200).json({
      success: true,
      value: {
        articles: result.recordset,
        totalPlaces,
      },
      errorCode: 200,
    });
  } catch (error) {
    console.error('Ошибка при получении артикулов по номеру паллета:', error);

    // Ошибка сервера
    res.status(500).json({
      success: false,
      value: null,
      errorCode: 500,
    });
  }
};

module.exports = { getPalletsByTaskName, getArticlesByPalletNumber };
