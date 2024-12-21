const mssql = require('mssql');
const { connectToDatabase, sql } = require('../dbConfig');
const { error } = require('winston');


  const setFactSize = async (req, res) => {
    const { id, count } = req.query;
  
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
        .input('Fakticheskoe_Kol_vo', mssql.Int, count)
        .query('UPDATE Test_MP SET Fakticheskoe_Kol_vo = @Fakticheskoe_Kol_vo WHERE ID = @ID');
  
      // Успешный ответ
      res.status(200).json({ success: true, value: 'Количество успешно добавлено', errorCode: 200 });
    } catch (error) {
      console.error('Ошибка:', error);
      res.status(500).json({ success: false, value: null, errorCode: 500 });
    }
  };

  module.exports = {
    setFactSize
  }