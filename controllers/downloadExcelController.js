const express = require('express');
const router = express.Router();
const mssql = require('mssql');
const { connectToDatabase } = require('../dbConfig');

router.get('/findAllNamesWithStatusOne', async (req, res) => {
  try {
    const pool = await connectToDatabase();
    if (!pool) {
      return res.status(500).json({ success: false, value: null, errorCode: 500 });
    }

    // Запрос для нахождения всех Nazvanie_Zadaniya, у которых все записи имеют Status_Zadaniya = 1
    const result = await pool.request().query(`
      SELECT Nazvanie_Zadaniya
      FROM Test_MP
      GROUP BY Nazvanie_Zadaniya
      HAVING NOT EXISTS (
        SELECT 1
        FROM Test_MP AS sub
        WHERE sub.Nazvanie_Zadaniya = Test_MP.Nazvanie_Zadaniya
        AND sub.Status_Zadaniya <> 1
      )
    `);

    if (result.recordset.length === 0) {
      return res.status(500).json({ success: false, value: "Список выполенных заданий пуст!", errorCode00 });
    }

    res.status(200).json({ success: true, value: result.recordset.map(record => record.Nazvanie_Zadaniya), errorCode: null });
  } catch (error) {
    console.error('Ошибка при поиске записей с статусом 1:', error);
    res.status(500).json({ success: false, value: null, errorCode: 500});
  }
});

module.exports = router;
