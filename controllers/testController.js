const mssql = require('mssql');
const logger = require('../utils/logger');
const {connectToDatabase, sql } = require('../dbConfig')

const getDataTest = async(req,res)=>{
  try {
    let pool = await connectToDatabase();
    let result = await pool.request().query('SELECT * FROM dbo.Test');
    res.json(result.recordset);
  } catch (err) {
    logger.error('SQL error', { error: err });
    res.status(500).json({
      success: false,
      message:"Ошибка работы сервера",
      errorCode: 500
    });  }
}


// Маршрут для записи данных
const createDataTest= async(req, res) =>{
  const { ID, Descr} = req.body;
  try {
    let pool = await connectToDatabase();
    let result = await pool.request()
    .input('ID', mssql.Int, ID)
      .input('Descr', mssql.NVarChar(50), Descr)
      .query('INSERT INTO dbo.Test (ID, Descr) VALUES ( @ID, @Descr)');

    res.status(201).json({
      success: true, 
      message: "Данные успешно добавлены!", 
      errorCode: 201})
  } catch (err) {
    console.log("error", err)
    logger.error('SQL error', { error: err });
    res.status(500).json({
      success: false,
      message:"Ошибка работы сервера",
      errorCode: 500
    });
  }
}

module.exports = {
  getDataTest,
  createDataTest};
