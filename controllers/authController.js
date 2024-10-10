const mssql = require('mssql');
const { connectToDatabase } = require('../dbConfig');

// Функция для выполнения SQL-запроса с обработкой ошибок
const executeQuery = async (pool, query) => {  
  try {
    return await pool.request().query(query);
  } catch (error) {
    console.error('Ошибка выполнения запроса:', error);
    throw new Error('Ошибка выполнения запроса');
  }
};

// Функция поиска сотрудника по ID
const searchEmployeeById = async (pool, id) => {
  const query = `
    SELECT ID, FULL_NAME 
    FROM OPENQUERY(OW, 'SELECT ID, FULL_NAME FROM staff.employee WHERE id = ''${id}''')
  `;
  const result = await executeQuery(pool, query);
  return result.recordset;
};

// Основная функция контроллера
const searchBySHKForAuth = async (req, res) => {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ success: false, msg: 'Необходимо указать ID сотрудника', errorCode: 400 });
  }

  let pool;
  try {
    pool = await connectToDatabase();
    if (!pool) {
      throw new Error('Ошибка подключения к базе данных');
    }

    // Асинхронный вызов поиска сотрудника по ID
    const result = await searchEmployeeById(pool, id);

    // Немедленный возврат ответа в случае, если сотрудник не найден
    if (result.length === 0) {
      return res.status(404).json({ success: false, msg: 'Сотрудник не найден', errorCode: 404 });
    }

    // Быстрый возврат результата
    res.status(200).json({ success: true, value: result, errorCode: 200 });
  } catch (error) {
    console.error('Ошибка при поиске по ID сотрудника:', error);
    res.status(500).json({ success: false, msg: 'Ошибка при поиске по ID сотрудника', errorCode: 500 });
  } finally {
    // Корректное освобождение ресурсов пула
    if (pool) {
      pool.close();
    }
  }
};

module.exports = {
  searchBySHKForAuth,
};
