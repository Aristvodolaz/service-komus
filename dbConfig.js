const mssql = require('mssql');

const config = {
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || 'icY2eGuyfU',
    server: process.env.DB_SERVER || 'PRM-SRV-MSSQL-01.komus.net',
    port: parseInt(process.env.DB_PORT) || 59587,
    database: process.env.DB_NAME || 'SPOe_rc',
    pool:{
        max: 500,
        min: 0,
        idleTimeoutMillis: 30000
    },
    options: {
      encrypt: process.env.DB_ENCRYPT === 'true',
      enableArithAbort: true,
      trustServerCertificate: true 
    }
  };

  let pool;

  async function connectToDatabase(){
    try{
        if(!pool){
            pool = await new mssql.ConnectionPool(config).connect();
            console.log('Соединение прервано');
        }
        return pool;
    }catch(err){
        console.error("Connection failed", err);
        throw err;
    }
  }

  module.exports = {
    mssql, connectToDatabase
  }