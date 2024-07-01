const mssql = require('mssql');
const logger = require('../utils/logger');
const {connectToDatabase, sql } = require('../dbConfig')

const getDataReason = async (req, res) => {
  try {
    let pool = await connectToDatabase();
    let result = await pool.request().query('SELECT * FROM dbo.sqlite_Reason');
    res.json(result.recordset);
  } catch (err) {
    logger.error('SQL error', { error: err });
    res.status(500).json({
      success: false,
      message:"Ошибка работы сервера",
      errorCode: 500
    });  
  }
}

module.exports = {
  getDataReason
};
