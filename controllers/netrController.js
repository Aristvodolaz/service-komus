const { connectToDatabase, sql } = require('../dbConfig');
const mssql = require('mssql');

async function addItem(req, res) {
    try {
        const { nazvanie_zdaniya, artikul, shk, mesto, vlozhennost, pallet, size_vps, vp } = req.body;

        if (!nazvanie_zdaniya || !artikul || !shk || !mesto || !vlozhennost || !pallet || !vp) {
            return res.status(404).json({ success: false, value: 'Нет данных ', errorCode: 404 });
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
            .input('nazvanie_zdaniya', mssql.NVarChar(255), nazvanie_zdaniya)
            .input('artikul', mssql.NVarChar, artikul)
            .input('shk', mssql.NVarChar, shk)
            .input('vlozhennost', mssql.NVarChar, vlozhennost)
            .input('pallet', mssql.NVarChar, pallet)
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
                .input('newMesto', mssql.NVarChar, newMesto.toString())
                .input('existingId', mssql.Int, existingId)
                .query(updateQuery);

                res.status(200).json({ success: true, value: 'Ууспешно', errorCode: 200 });
        } else {
            // Записи нет, создаем новую
            const insertQuery = `
                INSERT INTO [SPOe_rc].[dbo].[x_Packer_Netr]
                (nazvanie_zdaniya, artikul, shk, mesto, vlozhennost, pallet, size_vps, vp)
                VALUES (@nazvanie_zdaniya, @artikul, @shk, @mesto, @vlozhennost, @pallet, @size_vps, @vp)
            `;

            await pool.request()
                .input('nazvanie_zdaniya', mssql.NVarChar, nazvanie_zdaniya)
                .input('artikul', mssql.NVarChar, artikul)
                .input('shk', mssql.NVarChar, shk)
                .input('mesto', mssql.NVarChar, mesto.toString())
                .input('vlozhennost', mssql.NVarChar, vlozhennost)
                .input('pallet', mssql.NVarChar, pallet)
                .input('size_vps', mssql.NVarChar, size_vps)
                .input('vp', mssql.NVarChar, vp)
                .query(insertQuery);

                res.status(200).json({ success: true, value: 'Ууспешно добавлено', errorCode: 200 });
        }

    } catch (err) {
        console.error('Ошибка при добавлении записи:', err);
        res.status(500).json({ success: false, value: err, errorCode: 500 });
    }
}


async function getAcceptedQuantity(req, res) {
    try {
        const { nazvanie_zdaniya, artikul } = req.query;

        if (!nazvanie_zdaniya || !artikul) {
            return res.status(400).json({ message: 'nazvanie_zdaniya и artikul обязательны' });
        }

        const pool = await connectToDatabase();

        const query = `
            SELECT SUM(CAST(mesto AS INT) * CAST(vlozhennost AS INT)) AS totalAccepted
            FROM [SPOe_rc].[dbo].[x_Packer_Netr]
            WHERE nazvanie_zdaniya = @nazvanie_zdaniya
              AND artikul = @artikul
        `;

        const result = await pool.request()
            .input('nazvanie_zdaniya', mssql.NVarChar(255), nazvanie_zdaniya)
            .input('artikul', mssql.NVarChar(50), artikul)
            .query(query);

        const totalAccepted = result.recordset[0].totalAccepted || 0;

        res.status(200).json({ success: true, value: totalAccepted.toString(), errorCode: 200 });

    } catch (err) {
        console.error('Ошибка при получении принятого количества:', err);
        res.status(500).json({ success: false, value: err, errorCode: 500 });
    }
}

module.exports = { addItem,
    getAcceptedQuantity
 };
