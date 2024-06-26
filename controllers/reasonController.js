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
    trustServerCertificate: true // Добавляем этот параметр
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

async function getDataReason(req, res) {
  try {
    let pool = await connectToDatabase();
    let result = await pool.request().query('SELECT * FROM dbo.sqlite_Reason');
    res.json(result.recordset);
  } catch (err) {
    logger.error('SQL error', { error: err });
    res.status(500).send('Internal Server Error');
  }
}

module.exports = {
  getDataReason
};
