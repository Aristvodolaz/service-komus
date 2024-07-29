const mssql = require('mssql');
const { connectToDatabase, sql } = require('../dbConfig');
const { error } = require('winston');

const updateSrokGodnosti = async (req, res) => {
    const { srokGodnosti, persent, articul, taskName } = req.body;
  
    try {
      const pool = await connectToDatabase();
      if (!pool) {
        return res.status(500).json({ success: false, value: null, errorCode: 500 });
      }
  
      // Обновление записи по названию задания и артиклу
      await pool.request()
        .input('Nazvanie_Zadaniya', mssql.NVarChar(255), taskName)
        .input('Artikul', mssql.Int, articul)
        .input('Srok_Godnosti', mssql.NVarChar(50), srokGodnosti)
        .input('Persent', mssql.NVarChar(50), persent)
        .query('UPDATE Test_MP SET Srok_Godnosti = @Srok_Godnosti, Persent = @Persent WHERE Nazvanie_Zadaniya = @Nazvanie_Zadaniya AND Artikul = @Artikul');
  
      res.json({ success: true, value: 'ШК успешно обновлен', errorCode: 200 });
    } catch (error) {
      console.error('Ошибка при обновлении ШК:', error);
      res.status(500).json({ success: false, value: null, errorCode: 500 });
    }
  };

  module.exports = {
    updateSrokGodnosti};