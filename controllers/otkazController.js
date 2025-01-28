const mssql = require('mssql');
const { connectToDatabase, sql } = require('../dbConfig');
const { error } = require('winston');


  const setFactSize = async (req, res) => {
    const { id, count, factVp } = req.query;
  
    // Проверка на наличие необходимых параметров
    if (!id || !count) {
      return res.status(400).json({ success: false, value: 'id, count обязательны', errorCode: 400 });
    }
  
    try {
      // Подключение к базе данных
      const pool = await connectToDatabase();
      if (!pool) {
        return res.status(500).json({ success: false, value: null, errorCode: 500 });
      }
  
      // Выполнение SQL-запроса для обновления SHK_WPS по taskName и articul
      await pool.request()
        .input('ID', mssql.BigInt, id)
        .input('fact_vp', mssql.BigInt, factVp)
        .input('Fakticheskoe_Kol_vo', mssql.Int, count)
        .input("Status", mssql.Int, 3)
        .query('UPDATE Test_MP SET fact_vp = @fact_vp, Fakticheskoe_Kol_vo = @Fakticheskoe_Kol_vo, Status = @Status  WHERE ID = @ID');
  
      // Успешный ответ
      res.status(200).json({ success: true, value: 'Количество успешно добавлено', errorCode: 200 });
    } catch (error) {
      console.error('Ошибка:', error);
      res.status(500).json({ success: false, value: null, errorCode: 500 });
    }
  };

  const getQtyOrderedSum = async (req, res) => {
    const { item_num, transfer_num } = req.query;
  
    // Проверка на наличие необходимых параметров
    if (!item_num || !transfer_num) {
      return res.status(400).json({ success: false, value: 'item_num, transfer_num обязательны', errorCode: 400 });
    }
  
    try {
      // Подключение к базе данных
      const pool = await connectToDatabase();
      if (!pool) {
        return res.status(500).json({ success: false, value: null, errorCode: 500 });
      }
  
      // Выполнение SQL-запроса с использованием OPENQUERY для получения суммы по колонке qty_ordered
      const result = await pool.request()
      .input('ITEM_NUM', mssql.NVarChar, item_num)
      .input('TRANSFER_NUM', mssql.NVarChar, transfer_num)
      .query(`
        SELECT SUM(qty_ordered) AS total_qty_ordered
        FROM OPENQUERY(OW, 
          'SELECT * FROM elite.whse_t_l$ 
          WHERE transfer_num = ''${transfer_num}'' 
          AND ITEM_NUM = ''${item_num}''')
      `);
    
      // Проверка результата
      if (result.recordset.length === 0 || result.recordset[0].total_qty_ordered === null) {
        return res.status(404).json({ success: false, value: 'Нет данных для данного item_num и transfer_num', errorCode: 404 });
      }
  
      // Успешный ответ с суммой
      res.status(200).json({
        success: true,
        value: result.recordset[0].total_qty_ordered,
        errorCode: 200
      });
    } catch (error) {
      console.error('Ошибка:', error);
      res.status(500).json({ success: false, value: null, errorCode: 500 });
    }
  };
  

  const addOrUpdateTaskData = async (req, res) => {
    const { Nazvanie_Zadaniya, VP, Artikul, Plans, Fact } = req.body;
  
    // Проверка на наличие необходимых параметров
    if (!Nazvanie_Zadaniya || !VP || !Artikul || !Plans || !Fact) {
      return res.status(400).json({
        success: false,
        value: 'Nazvanie_Zadaniya, VP, Artikul, Plans, Fact обязательны',
        errorCode: 400
      });
    }
  
    try {
      // Подключение к базе данных
      const pool = await connectToDatabase();
      if (!pool) {
        return res.status(500).json({ success: false, value: null, errorCode: 500 });
      }
  
      // Проверка существования записи
      const checkQuery = `
        SELECT Fact
        FROM [SPOe_rc].[dbo].[Test_MP_VP]
        WHERE Nazvanie_Zadaniya = @Nazvanie_Zadaniya
          AND VP = @VP
          AND Artikul = @Artikul
          AND Plans = @Plans
      `;
  
      const checkResult = await pool.request()
        .input('Nazvanie_Zadaniya', mssql.NVarChar(255), Nazvanie_Zadaniya)
        .input('VP', mssql.NVarChar(255), VP)
        .input('Artikul', mssql.NVarChar(255), Artikul)
        .input('Plans', mssql.Int, Plans)
        .query(checkQuery);
  
      if (checkResult.recordset.length > 0) {
        // Если запись существует, суммируем Fact
        const currentFact = checkResult.recordset[0].Fact;
        const newFact = currentFact + Fact;
  
        const updateQuery = `
          UPDATE [SPOe_rc].[dbo].[Test_MP_VP]
          SET Fact = @Fact
          WHERE Nazvanie_Zadaniya = @Nazvanie_Zadaniya
            AND VP = @VP
            AND Artikul = @Artikul
            AND Plans = @Plans
        `;
  
        await pool.request()
          .input('Fact', mssql.Int, newFact)
          .input('Nazvanie_Zadaniya', mssql.NVarChar(255), Nazvanie_Zadaniya)
          .input('VP', mssql.NVarChar(255), VP)
          .input('Artikul', mssql.NVarChar(255), Artikul)
          .input('Plans', mssql.Int, Plans)
          .query(updateQuery);
  
        return res.status(200).json({ success: true, value: 'Fact успешно обновлён', errorCode: 200 });
      } else {
        // Если записи нет, добавляем новую
        const insertQuery = `
          INSERT INTO [SPOe_rc].[dbo].[Test_MP_VP] (Nazvanie_Zadaniya, VP, Artikul, Plans, Fact)
          VALUES (@Nazvanie_Zadaniya, @VP, @Artikul, @Plans, @Fact)
        `;
  
        await pool.request()
          .input('Nazvanie_Zadaniya', mssql.NVarChar(255), Nazvanie_Zadaniya)
          .input('VP', mssql.NVarChar(255), VP)
          .input('Artikul', mssql.NVarChar(255), Artikul)
          .input('Plans', mssql.Int, Plans)
          .input('Fact', mssql.Int, Fact)
          .query(insertQuery);
  
        return res.status(200).json({ success: true, value: 'Данные успешно добавлены', errorCode: 200 });
      }
    } catch (error) {
      console.error('Ошибка:', error);
      res.status(500).json({ success: false, value: null, errorCode: 500 });
    }
  };
  
  const getTransferNumsData = async (req, res) => {
    try {
      // Получаем значения параметров из запроса
      const transferNums = req.query.transfer_nums;
      const artikul = req.query.artikul;
  
      if (!transferNums || !artikul) {
        return res.status(400).json({ 
          success: false, 
          value: 'Parameters "transfer_nums" and "artikul" are required', 
          errorCode: 400 
        });
      }
  
      // Преобразуем строку значений в массив
      const transferNumsList = transferNums.split(',').map((num) => num.trim());
  
      // Формируем строку для SQL-запроса
      const transferNumsInClause = transferNumsList.join(',');
  
      // Подключаемся к базе данных
      const pool = await connectToDatabase();
      if (!pool) {
        return res.status(500).json({ success: false, value: null, errorCode: 500 });
      }
  
      // Выполняем первый SQL-запрос для получения QTY_SHIPPED
      const query = `
        SELECT TRANSFER_NUM, ITEM_NUM, QTY_SHIPPED
        FROM OPENQUERY(OW, '
          SELECT TRANSFER_NUM, ITEM_NUM, QTY_SHIPPED
          FROM elite.whse_t_l$ 
          WHERE TRANSFER_NUM IN (${transferNumsInClause}) AND ITEM_NUM = ''${artikul}''
        ');
      `;
      const result = await pool.request().query(query);
  
      // Проверяем, есть ли данные в первом запросе
      if (result.recordset.length === 0) {
        return res.status(404).json({ 
          success: false, 
          value: 'No data found for the given transfer numbers and artikul', 
          errorCode: 404 
        });
      }
  
      // Суммируем QTY_SHIPPED
      const qtyShipped = result.recordset.reduce((total, record) => total + record.QTY_SHIPPED, 0);
  
      // Выполняем второй запрос для получения Fact из таблицы Test_MP_VP
      const factQuery = `
        SELECT SUM(Fact) AS Fact
        FROM Test_MP_VP
        WHERE VP IN (${transferNumsInClause}) AND Artikul = '${artikul}';
      `;
      const factResult = await pool.request().query(factQuery);
  
      // Получаем суммарный Fact
      const fact = factResult.recordset[0]?.Fact || 0;
  
      // Вычисляем итоговую сумму
      const finalSum = qtyShipped - fact;
  
      // Отправляем результат клиенту
      res.status(200).json({ 
        success: true, 
        value: result.recordset, 
        sum: qtyShipped,
        factSum: finalSum, 
        errorCode: 200 
      });
    } catch (err) {
      console.error('Error executing query:', err);
      res.status(500).json({ success: false, value: null, errorCode: 500 });
    }
  };
  
  


  module.exports = {
    setFactSize,
    getQtyOrderedSum,
    addOrUpdateTaskData,
    getTransferNumsData
  };