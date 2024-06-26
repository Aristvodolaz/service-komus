const mssql = require('mssql');
const logger = require('../utils/logger');

const config = {
  user: '',
  password: '',
  server: 'PRM-SRV-MSSQL-01.komus.net',
  port: 59587,
  database: '',
  options: {
    encrypt: true,
    enableArithAbort: true,
    trustServerCertificate: true 
  }
};

async function connectToDatabase() {
  try {
    let pool = await mssql.connect(config);
    console.log('Connected to SQL Server');
    return pool;
  } catch (err) {
    logger.error('Error connecting to SQL Server:', { error: err });
    throw err; // Пробрасываем ошибку выше для обработки
  }
}

// Маршрут для получения данных
async function getDataTest(req, res) {
  try {
    let pool = await connectToDatabase();
    let result = await pool.request().query('SELECT * FROM dbo.Test');
    res.json(result.recordset);
  } catch (err) {
    logger.error('SQL error', { error: err });
    res.status(500).send('Internal Server Error');
  }
}


// Маршрут для записи данных
async function createData(req, res) {
  const { name, value } = req.body;
  try {
    let pool = await connectToDatabase();
    let result = await pool.request()
      .input('name', mssql.NVarChar, name)
      .input('value', mssql.NVarChar, value)
      .query('INSERT INTO your_table (name, value) VALUES (@name, @value)');

    res.status(201).send('Data inserted successfully');
  } catch (err) {
    logger.error('SQL error', { error: err });
    res.status(500).send('Internal Server Error');
  }
}

module.exports = {
  getDataTest,
  createData};
