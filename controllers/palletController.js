const mssql = require('mssql');
const { connectToDatabase } = require('../dbConfig');
const { determineTipPostavki } = require('../utils/tipPostavkiHelper');
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

      const isWBTask = taskName.includes('WB');
      const isKorobTask = determineTipPostavki(taskName) === true;
  
      if (isWBTask || isKorobTask) {
        // Запрос для таблицы Test_MP_Privyazka
        result = await pool.request()
          .input('taskName', mssql.NVarChar(255), taskName)
          .query(`
            SELECT 
              REPLACE(CAST(Pallet_No AS NVARCHAR(255)), CHAR(10), '') AS Pallet_No, 
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
              REPLACE(CAST(Pallet_No AS NVARCHAR(255)), CHAR(10), '') AS Pallet_No, 
              Sum(Mesto) AS Total_Kolvo
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
            Pallet_No: record.Pallet_No,
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

      const isWBTask = task.includes('WB');
      const isKorobTask = determineTipPostavki(task) === true;
  
      const tableName = (isWBTask || isKorobTask) ? 'Test_MP_Privyazka' : 'Test_MP';
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
      let totalPlaces;
      let totalItems;
      if (tableName === 'Test_MP_Privyazka') {
       totalPlaces = result.recordset.length; // Количество мест = количество строк
       totalItems = result.recordset.reduce(
        (sum, record) => sum + (record.Kolvo_Tovarov || 0),
        0
      );
      } else{
         totalPlaces = result.recordset.reduce(
          (sum, record) => sum + (record.Mesto || 0), // Суммируем поле Mesto
          0
        );
        totalItems = result.recordset.reduce(
          (sum, record) => sum + (record.Kolvo_Tovarov || record.Vlozhennost || 0), // Суммируем количество товаров
          0
        );
      }
     
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

      // Также очищаем приемку по заданию и артикулу
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
              Pallet_No = 0
          WHERE ID = @ID
        `);
  
      res.status(200).json({ success: true, value: 'WB reset completed', errorCode: 200 });
  
    } catch (error) {
      console.error('Ошибка при обнулении WB:', error);
      res.status(500).json({ success: false, value: error.message, errorCode: 500 });
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
  
      // Очищаем приемку из Test_MP_VP по заданию и артикулу
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

module.exports = { getPalletsByTaskName, getArticlesByPalletNumber , resetOzon, resetWB};
