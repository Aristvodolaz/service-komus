const mssql = require('mssql');
const { connectToDatabase } = require('../dbConfig');

// Общая функция для выполнения запросов к базе данных
const executeQuery = async (pool, query, params) => {
  try {
    const request = pool.request();
    params.forEach(param => request.input(param.name, param.type, param.value));
    const result = await request.query(query);
    return result.recordset;
  } catch (error) {
    console.error('Ошибка выполнения запроса:', error);
    throw new Error('Ошибка выполнения запроса');
  }
};

// Функция поиска по ШК (штрих-коду)
const searchBySHK = async (pool, shk) => {
  const query = `
    SELECT 
      ID, ARTICLE_MEASURE_ID, IS_ACTIVE, NAME, FIRST_NAME, 
      PIECE_GTIN, FPACK_GTIN, IS_VALID_PERIOD_WATCH, VALID_PERIOD_DAYS
    FROM OPENQUERY(OW, 'SELECT 
      ID, ARTICLE_MEASURE_ID, IS_ACTIVE, NAME, FIRST_NAME, 
      PIECE_GTIN, FPACK_GTIN, IS_VALID_PERIOD_WATCH, VALID_PERIOD_DAYS  
    FROM wms.article 
    WHERE PIECE_GTIN = @shk')
  `;
  const params = [{ name: 'shk', type: mssql.NVarChar, value: shk }];
  return await executeQuery(pool, query, params);
};

// Функция поиска по артикулу
const searchByArticul = async (pool, articul) => {
  const query = `
    SELECT 
      ID, ARTICLE_MEASURE_ID, IS_ACTIVE, NAME, FIRST_NAME, 
      PIECE_GTIN, FPACK_GTIN, IS_VALID_PERIOD_WATCH, VALID_PERIOD_DAYS
    FROM OPENQUERY(OW, 'SELECT 
      ID, ARTICLE_MEASURE_ID, IS_ACTIVE, NAME, FIRST_NAME, 
      PIECE_GTIN, FPACK_GTIN, IS_VALID_PERIOD_WATCH, VALID_PERIOD_DAYS  
    FROM wms.article 
    WHERE id = @articul')
  `;
  const params = [{ name: 'articul', type: mssql.NVarChar, value: articul }];
  return await executeQuery(pool, query, params);
};

// Основная функция контроллера
const searchBySHKOrArticul = async (req, res) => {
  const { shk, articul } = req.query;

  if (!shk && !articul) {
    return res.status(400).json({ success: false, msg: 'Необходимо указать ШК или артикул', errorCode: 400 });
  }

  try {
    const pool = await connectToDatabase();
    if (!pool) {
      throw new Error('Ошибка подключения к базе данных');
    }

    let result;
    if (shk) {
      result = await searchBySHK(pool, shk);
    } else if (articul) {
      result = await searchByArticul(pool, articul);
    }

    if (result.length === 0) {
      return res.status(404).json({ success: false, msg: 'Артикул не найден', errorCode: 404 });
    } else {
      return res.status(200).json({ success: true, value: result, errorCode: 200 });
    }
  } catch (error) {
    console.error('Ошибка при поиске по ШК или артикулу:', error);
    res.status(500).json({ success: false, msg: 'Ошибка при поиске по ШК или артикулу', errorCode: 500 });
  }
};

module.exports = {
  searchBySHKOrArticul,
};
