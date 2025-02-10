const { connectToDatabase, sql } = require('../dbConfig');
const mssql = require('mssql');

async function addItem(req, res) {
    try {
        const { nazvanie_zdaniya, artikul, shk, mesto, vlozhennost, pallet, size_vps, vp, itog_zakaza } = req.body;

        if (!nazvanie_zdaniya || !artikul || !shk || !mesto || !vlozhennost || !pallet || !vp || !itog_zakaza) {
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

                res.status(200).json({ success: true, value: 'Успешно', errorCode: 200 });
        } else {
            // Записи нет, создаем новую
            const insertQuery = `
                INSERT INTO [SPOe_rc].[dbo].[x_Packer_Netr]
                (nazvanie_zdaniya, artikul, shk, mesto, vlozhennost, pallet, size_vps, vp, itog_zakaza)
                VALUES (@nazvanie_zdaniya, @artikul, @shk, @mesto, @vlozhennost, @pallet, @size_vps, @vp, @itog_zakaza)
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
                .input('itog_zakaza', mssql.Int, itog_zakaza)

                .query(insertQuery);

                res.status(200).json({ success: true, value: 'Успешно добавлено', errorCode: 200 });
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


async function updateItem(req, res) {
    try {
        const { id, mesto, vlozhennost, pallet } = req.body;

        if (!id || !mesto || !vlozhennost || !pallet) {
            return res.status(400).json({ success: false, value: 'Отсутствуют обязательные данные', errorCode: 400 });
        }

        const pool = await connectToDatabase();

        const updateQuery = `
            UPDATE [SPOe_rc].[dbo].[x_Packer_Netr]
            SET mesto = @mesto, vlozhennost = @vlozhennost, pallet = @pallet
            WHERE id = @id
        `;

        await pool.request()
            .input('id', mssql.Int, id)
            .input('mesto', mssql.NVarChar, mesto.toString())
            .input('vlozhennost', mssql.NVarChar, vlozhennost)
            .input('pallet', mssql.NVarChar, pallet)
            .query(updateQuery);

        res.status(200).json({ success: true, value: 'Запись успешно обновлена', errorCode: 200 });

    } catch (err) {
        console.error('Ошибка при обновлении записи:', err);
        res.status(500).json({ success: false, value: err, errorCode: 500 });
    }
}

async function getItemsByNazvanieZdaniya(req, res) {
    try {
        const { nazvanie_zdaniya } = req.query;

        if (!nazvanie_zdaniya) {
            return res.status(400).json({ message: 'nazvanie_zdaniya обязательно' });
        }

        const pool = await connectToDatabase();

        const query = `
            SELECT * FROM [SPOe_rc].[dbo].[x_Packer_Netr]
            WHERE nazvanie_zdaniya = @nazvanie_zdaniya
        `;

        const result = await pool.request()
            .input('nazvanie_zdaniya', mssql.NVarChar(255), nazvanie_zdaniya)
            .query(query);

        res.status(200).json({ success: true, data: result.recordset, errorCode: 200 });

    } catch (err) {
        console.error('Ошибка при получении списка записей:', err);
        res.status(500).json({ success: false, value: err, errorCode: 500 });
    }
}


async function getPalletToShkWpsMapping(req, res) {
    try {
        const { nazvanie_zdaniya } = req.query;

        if (!nazvanie_zdaniya) {
            return res.status(400).json({ success: false, message: 'nazvanie_zdaniya обязательно' });
        }

        const pool = await connectToDatabase();

        const query = `
            SELECT DISTINCT pallet, shk AS shk_wps
            FROM [SPOe_rc].[dbo].[x_Packer_Netr]
            WHERE nazvanie_zdaniya = @nazvanie_zdaniya
        `;

        const result = await pool.request()
            .input('nazvanie_zdaniya', mssql.NVarChar(255), nazvanie_zdaniya)
            .query(query);

        res.status(200).json({ success: true, data: result.recordset, errorCode: 200 });

    } catch (err) {
        console.error('Ошибка при получении связки pallet - shk_wps:', err);
        res.status(500).json({ success: false, value: err, errorCode: 500 });
    }
}


async function getPalletToShkWpsMapping(req, res) {
    try {
        const { nazvanie_zdaniya } = req.query;

        if (!nazvanie_zdaniya) {
            return res.status(400).json({ success: false, message: 'nazvanie_zdaniya обязательно' });
        }

        const pool = await connectToDatabase();

        const query = `
            SELECT DISTINCT pallet, shk AS shk_wps
            FROM [SPOe_rc].[dbo].[x_Packer_Netr]
            WHERE nazvanie_zdaniya = @nazvanie_zdaniya
        `;

        const result = await pool.request()
            .input('nazvanie_zdaniya', mssql.NVarChar(255), nazvanie_zdaniya)
            .query(query);

        res.status(200).json({ success: true, data: result.recordset, errorCode: 200 });

    } catch (err) {
        console.error('Ошибка при получении связки pallet - shk_wps:', err);
        res.status(500).json({ success: false, value: err, errorCode: 500 });
    }
}

async function uploadData(req, res) {
    try {
        const data = req.body;
  
        const pool = await connectToDatabase();
        if (!pool) {
            return res.status(500).json({ message: "Ошибка подключения к базе данных." });
        }
  
        const query = `
            INSERT INTO Test_MP 
            (Artikul, Nazvanie_Tovara, SHK,  Itog_Zakaz, Srok_Godnosti, 
            Pref, Nazvanie_Zadaniya, Status, Status_Zadaniya, Scklad_Pref, vp )
            VALUES 
            (@Artikul, @Nazvanie_Tovara, @SHK, @Itog_Zakaz, 
          @Srok_Godnosti,@Pref, @Nazvanie_Zadaniya, @Status, @Status_Zadaniya, @Scklad_Pref, @vp)
        `;
  
        const request = pool.request();
        request.input('vp', mssql.NVarChar, data.vp ? data.vp.toString() :null);
        request.input('Artikul', mssql.Int, data.Artikul);
        request.input('Nazvanie_Tovara', mssql.NVarChar, data.Nazvanie_Tovara);
        request.input('SHK', mssql.NVarChar, data.SHK ? data.SHK.toString() : null);
        request.input('Itog_Zakaz', mssql.Int, data.Itog_Zakaz);
        request.input('Srok_Godnosti', mssql.NVarChar, data.Srok_Godnosti);
        request.input('Pref', mssql.NVarChar, data.pref);
        request.input('Nazvanie_Zadaniya', mssql.NVarChar, data.Nazvanie_Zadaniya);
        request.input('Status', mssql.Int, data.Status);
        request.input('Status_Zadaniya', mssql.Int, data.Status_Zadaniya);
        request.input('Scklad_Pref', mssql.NVarChar, "NETR");
  
        await request.query(query);
  
        res.status(200).json({ message: "Данные успешно записаны в базу." });
    } catch (err) {
        console.error('Ошибка при записи данных в базу:', err);
        res.status(500).json({ message: "Ошибка при записи данных в базу." });
    }
}

module.exports = {
    addItem,
    getAcceptedQuantity,
    updateItem,
    getItemsByNazvanieZdaniya,
    getPalletToShkWpsMapping,
    uploadData
};