const mssql = require('mssql');
const { connectToDatabase } = require('../dbConfig');

const searchBySHKOrArticul = async (req, res) => {
    const { shk, articul } = req.query;
  
    try {
      const pool = await connectToDatabase();
      if (!pool) {
        throw new Error('Ошибка подключения к базе данных');
      }
  
      let query;
      if (shk) {
        query = `SELECT ID, ARTICLE_MEASURE_ID, IS_ACTIVE, NAME, FIRST_NAME, PIECE_GTIN, FPACK_GTIN FROM OPENQUERY(OW, 'SELECT ID, ARTICLE_MEASURE_ID, IS_ACTIVE, NAME, FIRST_NAME, PIECE_GTIN, FPACK_GTIN FROM wms.article WHERE PIECE_GTIN = ''${shk}''')`;
      }
  
      if (articul) {
        query = `SELECT ID, ARTICLE_MEASURE_ID, IS_ACTIVE, NAME, FIRST_NAME, PIECE_GTIN, FPACK_GTIN FROM OPENQUERY(OW, 'SELECT ID, ARTICLE_MEASURE_ID, IS_ACTIVE, NAME, FIRST_NAME, PIECE_GTIN, FPACK_GTIN FROM wms.article WHERE id = ''${articul}''')`;
      }
  
      const result = await pool.request().query(query);
  
      res.json(result.recordset);
    } catch (error) {
      console.error('Ошибка при поиске по ШК или артикулу:', error);
      res.status(500).json({ error: 'Ошибка при поиске по ШК или артикулу' });
    }
  };
  

module.exports = {
  searchBySHKOrArticul,
};
