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
      query = `SELECT ID, ARTICLE_MEASURE_ID, IS_ACTIVE, NAME, FIRST_NAME, PIECE_GTIN, FPACK_GTIN, IS_VALID_PERIOD_WATCH, VALID_PERIOD_DAYS  FROM OPENQUERY(OW, 'SELECT ID, ARTICLE_MEASURE_ID, IS_ACTIVE, NAME, FIRST_NAME, PIECE_GTIN, FPACK_GTIN, IS_VALID_PERIOD_WATCH, VALID_PERIOD_DAYS  FROM wms.article WHERE PIECE_GTIN = ''${shk}''')`;
    } else if (articul) {
      query = `SELECT ID, ARTICLE_MEASURE_ID, IS_ACTIVE, NAME, FIRST_NAME, PIECE_GTIN, FPACK_GTIN, IS_VALID_PERIOD_WATCH, VALID_PERIOD_DAYS   FROM OPENQUERY(OW, 'SELECT ID, ARTICLE_MEASURE_ID, IS_ACTIVE, NAME, FIRST_NAME, PIECE_GTIN, FPACK_GTIN, IS_VALID_PERIOD_WATCH, VALID_PERIOD_DAYS  FROM wms.article WHERE id = ''${articul}''')`;
    } else {
      return res.status(400).json({ success: false, msg: 'Необходимо указать ШК или артикул', errorCode: 400 });
    }

    const result = await pool.request().query(query);

    if (result.recordset.length === 0) {
      res.status(200).json({ success: false, msg: 'Артикул не найден', errorCode: 200 });
    } else {
      res.status(200).json({ success: true, value: result.recordset, errorCode: 200 });
    }
  } catch (error) {
    console.error('Ошибка при поиске по ШК или артикулу:', error);
    res.status(500).json({ success: false, msg: 'Ошибка при поиске по ШК или артикулу', errorCode: 500 });
  }
};

module.exports = {
  searchBySHKOrArticul,
};
