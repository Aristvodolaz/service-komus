//получение артикулов по названию задания
const mssql = require('mssql');
const {connectToDatabase, sql } = require('../dbConfig')

const getArticulsByTaskNumber = async (req, res) => {
  const { taskNumber } = req.query;

  try {
    let pool = await connectToDatabase();
    if (!pool) {
      throw new Error('Ошибка подключения к базе данных');
    }

    const result = await pool.request()
      .input('Nazvanie_Zadaniya', mssql.NVarChar(255), taskNumber)
      .query('SELECT * FROM Test_MPP WHERE Nazvanie_Zadaniya = @Nazvanie_Zadaniya');

    res.json(result.recordset);
  } catch (error) {
    console.error('Ошибка при получении списка артикулов:', error);
    res.status(500).json({ error: 'Ошибка при получении списка артикулов' });
  }
};

const getUniqueTaskNames = async (req, res) => {
  const { filter } = req.query;

  try {
    const pool = await connectToDatabase();
    if (!pool) {
      throw new Error('Ошибка подключения к базе данных');
    }

    let query = 'SELECT DISTINCT Nazvanie_Zadaniya FROM Test_MPP';
    const request = pool.request();

    if (filter) {
      query += ' WHERE Nazvanie_Zadaniya LIKE @filter';
      request.input('filter', mssql.NVarChar(255), `%${filter}%`);
    }

    const result = await request.query(query);

    res.json(result.recordset.map(row => row.Nazvanie_Zadaniya));
  } catch (error) {
    console.error('Ошибка при получении уникальных названий заданий:', error);
    res.status(500).json({ error: 'Ошибка при получении уникальных названий заданий' });
  }
};

module.exports = {
  getArticulsByTaskNumber,
  getUniqueTaskNames
};
