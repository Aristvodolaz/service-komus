const { connectToDatabase, sql } = require('../dbConfig');

async function addItem(req, res) {
    try {
        const { nazvanie_zdaniya, artikul, shk, mesto, vlozhennost, pallet, size_vps } = req.body;

        if (!nazvanie_zdaniya || !artikul || !shk || !mesto || !vlozhennost || !pallet) {
            return res.status(400).json({ message: 'Все обязательные поля должны быть заполнены' });
        }

        const pool = await connectToDatabase();

        // Проверяем, есть ли уже запись с такими параметрами
        const checkQuery = `
            SELECT id, mesto FROM [SPOe_rc].[dbo].[x_Packer_Netr]
            WHERE nazvanie_zdaniya = @nazvanie_zdaniya
              AND artikul = @artikul
              AND shk = @shk
              AND vlozhennost = @vlozhennost
              AND pallet = @pallet
        `;

        const checkResult = await pool.request()
            .input('nazvanie_zdaniya', sql.NVarChar, nazvanie_zdaniya)
            .input('artikul', sql.NVarChar, artikul)
            .input('shk', sql.NVarChar, shk)
            .input('vlozhennost', sql.NVarChar, vlozhennost)
            .input('pallet', sql.NVarChar, pallet)
            .query(checkQuery);

        if (checkResult.recordset.length > 0) {
            // Запись найдена, обновляем поле mesto
            const existingId = checkResult.recordset[0].id;
            const newMesto = parseInt(checkResult.recordset[0].mesto) + parseInt(mesto);

            const updateQuery = `
                UPDATE [SPOe_rc].[dbo].[x_Packer_Netr]
                SET mesto = @newMesto
                WHERE id = @existingId
            `;

            await pool.request()
                .input('newMesto', sql.NVarChar, newMesto)
                .input('existingId', sql.Int, existingId)
                .query(updateQuery);

            return res.status(200).json({ message: 'Обновлено место для существующей записи' });
        } else {
            // Записи нет, создаем новую
            const insertQuery = `
                INSERT INTO [SPOe_rc].[dbo].[x_Packer_Netr]
                (nazvanie_zdaniya, artikul, shk, mesto, vlozhennost, pallet, size_vps)
                VALUES (@nazvanie_zdaniya, @artikul, @shk, @mesto, @vlozhennost, @pallet, @size_vps)
            `;

            await pool.request()
                .input('nazvanie_zdaniya', sql.NVarChar, nazvanie_zdaniya)
                .input('artikul', sql.NVarChar, artikul)
                .input('shk', sql.NVarChar, shk)
                .input('mesto', sql.NVarChar, mesto)
                .input('vlozhennost', sql.NVarChar, vlozhennost)
                .input('pallet', sql.NVarChar, pallet)
                .input('size_vps', sql.NVarChar, size_vps)
                .query(insertQuery);

            return res.status(200).json({ message: 'Добавлена новая запись' });
        }

    } catch (err) {
        console.error('Ошибка при добавлении записи:', err);
        res.status(500).json({ message: 'Внутренняя ошибка сервера' });
    }
}

module.exports = { addItem };
