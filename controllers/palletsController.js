const mssql = require('mssql');
const logger = require('../utils/logger');
const {connectToDatabase, sql } = require('../dbConfig')

// Маршрут для получения данных
const getPallets = async(req, res)=> {
  try {
    let pool = await connectToDatabase();
    let result = await pool.request().query('SELECT * FROM dbo.MP_Pallets');
    res.json(result.recordset);
  } catch (err) {
    logger.error('SQL error', { error: err });
    res.status(500).send('Internal Server Error');
  }
}

module.exports = {
  getPallets};