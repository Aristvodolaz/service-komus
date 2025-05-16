const { connectToDatabase } = require('../dbConfig');
const mssql = require('mssql');

// … ваши остальные функции …

/**
 * GET /records-by-task?nazvanie_zadaniya=...
 * Вернёт все записи из Test_MP с нужными полями по названию задания.
 */
async function getTaskRecords(req, res) {
  try {
    const { nazvanie_zadaniya } = req.query;
    if (!nazvanie_zadaniya) {
      return res
        .status(400)
        .json({ success: false, message: 'nazvanie_zadaniya обязателен' });
    }

    const pool = await connectToDatabase();
    const query = `
      SELECT
        Nazvanie_Zadaniya   AS NazvanieZadaniya,
        Artikul,
        SHK,
        Status,
        Status_Zadaniya,
        Ispolnitel,
        Time_Start,
        Time_End,
        vp                   AS VP
      FROM [SPOe_rc].[dbo].[Test_MP]
      WHERE Nazvanie_Zadaniya = @nazvanie_zadaniya
    `;

    const result = await pool
      .request()
      .input('nazvanie_zadaniya', mssql.NVarChar(255), nazvanie_zadaniya)
      .query(query);

    return res
      .status(200)
      .json({ success: true, data: result.recordset });
  } catch (err) {
    console.error('Ошибка в getTaskRecords:', err);
    return res
      .status(500)
      .json({ success: false, message: err.message });
  }
}

module.exports = {
  // … ваши остальные экспорты …
  getTaskRecords,
};
