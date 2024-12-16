const mssql = require('mssql');
const { connectToDatabase } = require('../dbConfig');
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
  
      let result;
  
      if (taskName.includes('WB')) {
        // Запрос для таблицы Test_MP_Privyazka
        result = await pool.request()
          .input('taskName', mssql.NVarChar(255), taskName)
          .query(`
            SELECT 
              CAST(Pallet_No AS NVARCHAR(255)) AS Pallet_No, 
              COUNT(*) AS Total_Kolvo
            FROM Test_MP_Privyazka
            WHERE Nazvanie_Zadaniya = @taskName AND Pallet_No IS NOT NULL
            GROUP BY Pallet_No
          `);
      } else {
        // Запрос для таблицы Test_MP
        result = await pool.request()
          .input('taskName', mssql.NVarChar(255), taskName)
          .query(`
            SELECT 
              CAST(Pallet_No AS NVARCHAR(255)) AS Pallet_No, 
              COUNT(*) AS Total_Kolvo
            FROM Test_MP
            WHERE Nazvanie_Zadaniya = @taskName AND Pallet_No IS NOT NULL
            GROUP BY Pallet_No
          `);
      }
  
      // Подсчёт общего количества мест по всем паллетам
      const totalPlaces = result.recordset.reduce((sum, record) => sum + (record.Total_Kolvo || 0), 0);
  
      // Успешный результат
      res.status(200).json({
        success: true,
        value: {
          pallets: result.recordset.map(record => ({
            Pallet_No: record.Pallet_No, // Уже строка благодаря CAST
            Total_Kolvo: record.Total_Kolvo || 0,
          })),
          totalPlaces,
        },
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
  
  const getArticlesByPalletNumber = async (req, res) => {
    const { palletNo, task } = req.query;
  
    if (!palletNo || !task) {
      return res.status(400).json({
        success: false,
        value: null,
        errorCode: 400,
        message: 'Номер паллета или задание не указано',
      });
    }
  
    try {
      const pool = await connectToDatabase();
      if (!pool) {
        throw new Error('Ошибка подключения к базе данных');
      }
  
      const tableName = task.includes('WB') ? 'Test_MP_Privyazka' : 'Test_MP';
      let result;
  
      // Запрос к базе данных
      if (tableName === 'Test_MP_Privyazka') {
        result = await pool.request()
          .input('palletNo', mssql.NVarChar(255), palletNo)
          .input('task', mssql.NVarChar(255), task)
          .query(`
            SELECT 
              [Artikul],
              ISNULL([Kolvo_Tovarov], 0) AS [Kolvo_Tovarov]
            FROM [SPOe_rc].[dbo].[${tableName}]
            WHERE CAST([Pallet_No] AS NVARCHAR(255)) = @palletNo AND [Nazvanie_Zadaniya] = @task
          `);
      } else {
        result = await pool.request()
          .input('palletNo', mssql.NVarChar(255), palletNo)
          .input('task', mssql.NVarChar(255), task)
          .query(`
            SELECT 
              [Artikul],
              [Mesto], [Vlozhennost], [Nazvanie_Tovara]
            FROM [SPOe_rc].[dbo].[${tableName}]
            WHERE CAST([Pallet_No] AS NVARCHAR(255)) = @palletNo AND [Nazvanie_Zadaniya] = @task
          `);
      }

      // Подсчёт мест и товаров
      const totalPlaces = result.recordset.length; // Количество мест = количество строк
      const totalItems = result.recordset.reduce(
        (sum, record) => sum + (record.Kolvo_Tovarov || 0),
        0
      );
      // Успешный ответ
      res.status(200).json({
        success: true,
        value: {
          articles: result.recordset,
          totalPlaces,
          totalItems,
        },
        errorCode: 200,
      });
    } catch (error) {
      console.error('Ошибка при получении артикулов по номеру паллета:', {
        message: error.message,
        stack: error.stack,
        query: { palletNo, task },
      });
  
      // Ошибка сервера
      res.status(500).json({
        success: false,
        value: null,
        errorCode: 500,
      });
    }
  };
  
  

module.exports = { getPalletsByTaskName, getArticlesByPalletNumber };
