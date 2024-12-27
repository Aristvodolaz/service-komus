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
  
  module.exports = {
    setFactSize,
    getQtyOrderedSum
  };