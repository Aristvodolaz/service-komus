//получение артикулов по названию задания
const mssql = require('mssql');
const {connectToDatabase, sql } = require('../dbConfig');
const { error } = require('winston');

const getArticulsByTaskNumber = async (req, res) => {
  const { taskNumber } = req.query;

  try {
    const pool = await connectToDatabase();
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

const getByShk = async (req, res) => {
  const { taskName, shk } = req.query;

  try {
    const pool = await connectToDatabase();
    if (!pool) {
      throw new Error('Ошибка подключения к базе данных');
    }

    const result = await pool.request()
      .input('Nazvanie_Zadaniya', mssql.NVarChar(255), taskName)
      .input('SHK', mssql.NVarChar(50), `%${shk}%`)
      .query('SELECT * FROM Test_MPP WHERE SHK LIKE @SHK AND Nazvanie_Zadaniya = @Nazvanie_Zadaniya ');

    res.json(result.recordset);
  } catch (error) {
    console.error('Ошибка при получении данных по SHK:', error);
    res.status(500).json({ error: 'Ошибка при получении данных по SHK' });
  }
};

const updateStatus = async (req, res) => {
  const { taskName, shk, status } = req.body;

  try {
    const pool = await connectToDatabase();
    if (!pool) {
      throw new Error('Ошибка подключения к базе данных');
    }

    await pool.request()
      .input('Nazvanie_Zadaniya', mssql.NVarChar(255), taskName)
      .input('SHK', mssql.NVarChar(50), `%${shk}%`)
      .input('Status', mssql.Int, status)
      .query('UPDATE Test_MPP SET Status = @Status WHERE Nazvanie_Zadaniya = @Nazvanie_Zadaniya AND SHK LIKE @SHK');

    res.json({ message: 'Статус успешно обновлен' });
  } catch (error) {
    console.error('Ошибка при обновлении статуса:', error);
    res.status(500).json({ error: 'Ошибка при обновлении статуса' });
  }
};

const getRecordsByArticul = async (req, res) => {
  const { taskName, articul } = req.query;

  try {
    const pool = await connectToDatabase();
    if (!pool) {
      throw new Error('Ошибка подключения к базе данных');
    }

    const result = await pool.request()
      .input('Nazvanie_Zadaniya', mssql.NVarChar(255), taskName)
      .input('Artikul', mssql.Int, articul)
      .query('SELECT * FROM Test_MPP WHERE Artikul = @Artikul AND Nazvanie_Zadaniya = @Nazvanie_Zadaniya');

    res.json(result.recordset);
  } catch (error) {
    console.error('Ошибка при получении записей по артикулу:', error);
    res.status(500).json({ error: 'Ошибка при получении записей по артикулу' });
  }
};

module.exports = {
  getArticulsByTaskNumber,
  getUniqueTaskNames,
  getByShk,
  updateStatus,
  getRecordsByArticul
};
