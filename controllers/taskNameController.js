const { mssql, connectToDatabase } = require('../dbConfig');

// Поиск задач по названию (используя LIKE)
async function searchTasksByName(req, res) {
    try {
        const { name } = req.query;
        if (!name) {
            return res.status(400).json({ message: 'Параметр name обязателен' });
        }

        const pool = await connectToDatabase();
        const query = `
            SELECT DISTINCT Nazvanie_Zadaniya FROM Test_MP 
            WHERE Nazvanie_Zadaniya LIKE @name
        `;
        
        const result = await pool.request()
            .input('name', mssql.VarChar, `%${name}%`)
            .query(query);

        res.json(result.recordset);
    } catch (error) {
        console.error('Ошибка при поиске задач по названию:', error);
        res.status(500).json({ message: 'Внутренняя ошибка сервера' });
    }
}

// Удаление задач по названию
async function deleteTasksByName(req, res) {
    try {
        const { name } = req.body;
        if (!name) {
            return res.status(400).json({ message: 'Параметр name обязателен' });
        }

        const pool = await connectToDatabase();
        
        // Сначала получаем записи, которые будут удалены
        const selectQuery = `
            SELECT * FROM Test_MP 
            WHERE Nazvanie_Zadaniya = @name
        `;
        
        const selectResult = await pool.request()
            .input('name', mssql.VarChar, name)
            .query(selectQuery);

        if (selectResult.recordset.length === 0) {
            return res.status(404).json({ message: 'Задачи с таким названием не найдены' });
        }

        // Затем удаляем записи
        const deleteQuery = `
            DELETE FROM Test_MP 
            WHERE Nazvanie_Zadaniya = @name
        `;
        
        await pool.request()
            .input('name', mssql.VarChar, name)
            .query(deleteQuery);

        res.json({ 
            message: 'Задачи успешно удалены', 
            deletedTasks: selectResult.recordset 
        });
    } catch (error) {
        console.error('Ошибка при удалении задач по названию:', error);
        res.status(500).json({ message: 'Внутренняя ошибка сервера' });
    }
}

module.exports = {
    searchTasksByName,
    deleteTasksByName
}; 