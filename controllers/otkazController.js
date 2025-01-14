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
  

const addTaskData = async (req, res) => {
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

    // Выполнение SQL-запроса для добавления данных
    await pool.request()
      .input('Nazvanie_Zadaniya', mssql.NVarChar(255), Nazvanie_Zadaniya)
      .input('VP', mssql.NVarChar(255), VP)
      .input('Artikul', mssql.NVarChar(255), Artikul)
      .input('Plans', mssql.Int, Plans)
      .input('Fact', mssql.Int, Fact)
      .query(`
        INSERT INTO [SPOe_rc].[dbo].[Test_MP_VP] (Nazvanie_Zadaniya, VP, Artikul, Plans, Fact)
        VALUES (@Nazvanie_Zadaniya, @VP, @Artikul, @Plans, @Fact)
      `);

    // Успешный ответ
    res.status(200).json({ success: true, value: 'Данные успешно добавлены', errorCode: 200 });
  } catch (error) {
    console.error('Ошибка:', error);
    res.status(500).json({ success: false, value: null, errorCode: 500 });
  }
};
const getTransferNumsData = async (req, res) => {
  try {
    // Получаем значения параметров из запроса (например: ?transfer_nums=17569142,17569143)
    const transferNums = req.query.transfer_nums;
    const artikul = req.query.artikul;


    if (!transferNums) {
      return res.status(400).json({ success: false, value: 'Parameter "transfer_nums" is required', errorCode: 400 });
    }

    // Преобразуем строку значений в массив
    const transferNumsList = transferNums.split(',').map((num) => num.trim());

    // Формируем строку для SQL-запроса (например: '17569142, 17569143')
    const transferNumsInClause = transferNumsList.join(',');  // Не ставим кавычки вокруг значений

    // Подключаемся к базе данных
    const pool = await connectToDatabase();
    if (!pool) {
      return res.status(500).json({ success: false, value: null, errorCode: 500 });
    }

    // Выполняем SQL-запрос через OPENQUERY
    const query = `
      SELECT * 
      FROM OPENQUERY(OW, '
        SELECT  TRANSFER_NUM, ITEM_NUM, QTY_SHIPPED
        FROM elite.whse_t_l$ 
        WHERE TRANSFER_NUM IN (${transferNumsInClause}) and ITEM_NUM =''${artikul}''
      ');
    `;

    // Выполняем запрос и получаем результат
    const result = await pool.request().query(query);
    const sum = result.recordset.reduce((total, record) => total + record.QTY_SHIPPED, 0);

    // Отправляем результат клиенту
    res.status(200).json({ success: true, value: result.recordset, sum: sum, errorCode: 200 });
  } catch (err) {
    console.error('Error executing query:', err);
    res.status(500).json({ success: false, value: null, errorCode: 500 });
  }
};


  module.exports = {
    setFactSize,
    getQtyOrderedSum,
    addTaskData,
    getTransferNumsData
  };