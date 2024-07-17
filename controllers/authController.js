const mssql = require('mssql');
const { connectToDatabase } = require('../dbConfig');

const searchBySHKForAuth = async (req, res) => {
  const {id} = req.query;

  try {
    const pool = await connectToDatabase();
    if (!pool) {
      throw new Error('Ошибка подключения к базе данных');
    }
    let query;
    if(id){
     query = `SELECT ID, FULL_NAME FROM OPENQUERY(OW, 'SELECT ID, FULL_NAME FROM staff.employee WHERE id = ''${id}''')`;
    } else{
        return res.status(400).json({ success: false, msg: 'Необходимо указать ШК сотрудника', errorCode: 400 });
    }
    const result = await pool.request().query(query);

    if (result.recordset.length === 0) {
      res.status(200).json({ success: false, msg: 'Сотрудник не найден', errorCode: 200 });
    } else {
      res.status(200).json({ success: true, value: result.recordset, errorCode: 200 });
    }
  } catch (error) {
    console.error('Ошибка при поиске по ШК сотрудника:', error);
    res.status(500).json({ success: false, msg: 'Ошибка при поиске по ШК сотрудника', errorCode: 500 });
  }
};

module.exports = {
    searchBySHKForAuth
};
