const mssql = require('mssql');

const config = {
    user: 'sa',
    password: 'icY2eGuyfU',
    server: 'PRM-SRV-MSSQL-01.komus.net',
    port: 59587,
    database: 'SPOe_rc',
    pool:{
        max: 500,
        min: 0,
        idleTimeoutMillis: 30000
    },
    options: {
      encrypt: true,
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