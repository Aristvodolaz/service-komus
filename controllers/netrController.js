const { connectToDatabase, sql } = require('../dbConfig');
const mssql = require('mssql');

async function addItem(req, res) {
    try {
        const { nazvanie_zdaniya, artikul, shk, vlozhennost, pallet, size_vps, vp, itog_zakaza, nazvanie_tovara } = req.body;

        if (!nazvanie_zdaniya || !artikul || !shk || !vlozhennost || !pallet || !vp || !itog_zakaza) {
            return res.status(404).json({ success: false, value: 'Нет данных', errorCode: 404 });
        }

        const pool = await connectToDatabase();
        const srokQuery = `
        SELECT TOP 1 Srok_Godnosti 
        FROM [SPOe_rc].[dbo].[Test_Mp] 
        WHERE Nazvanie_Zadaniya = @Nazvanie_Zadaniya AND Artikul = @Artikul
    `;

    const srokResult = await pool.request()
    .input('Nazvanie_Zadaniya', mssql.NVarChar(255), nazvanie_zdaniya)
    .input('Artikul', mssql.Int, artikul)
    .query(srokQuery);

const srokGodnosti = srokResult.recordset.length > 0 ? srokResult.recordset[0].Srok_Godnosti : null;


        // Проверяем, есть ли уже запись с такими параметрами
        const checkQuery = `
            SELECT id, vlozhennost FROM [SPOe_rc].[dbo].[x_Packer_Netr]
            WHERE nazvanie_zdaniya = @nazvanie_zdaniya
              AND artikul = @artikul
              AND pallet = @pallet
        `;

        const checkResult = await pool.request()
            .input('nazvanie_zdaniya', mssql.NVarChar(255), nazvanie_zdaniya)
            .input('artikul', mssql.NVarChar, artikul)
            .input('pallet', mssql.NVarChar, pallet)
            .query(checkQuery);

        if (checkResult.recordset.length > 0) {
            // Запись найдена, суммируем vlozhennost
            const existingId = checkResult.recordset[0].id;
            const newVlozhennost = parseInt(checkResult.recordset[0].vlozhennost) + parseInt(vlozhennost);

            const updateQuery = `
                UPDATE [SPOe_rc].[dbo].[x_Packer_Netr]
                SET vlozhennost = @newVlozhennost
                WHERE id = @existingId
            `;

            await pool.request()
                .input('newVlozhennost', mssql.NVarChar, newVlozhennost.toString())
                .input('existingId', mssql.Int, existingId)
                .query(updateQuery);

            res.status(200).json({ success: true, value: 'Успешно обновлено', errorCode: 200 });
        } else {
            // Записи нет, создаем новую
            const insertQuery = `
                INSERT INTO [SPOe_rc].[dbo].[x_Packer_Netr]
                (nazvanie_zdaniya, artikul, shk, vlozhennost, pallet, size_vps, vp, itog_zakaza, nazvanie_tovara, srok_godnosti)
                VALUES (@nazvanie_zdaniya, @artikul, @shk, @vlozhennost, @pallet, @size_vps, @vp, @itog_zakaza, @nazvanie_tovara, @srok_godnosti)
            `;

            await pool.request()
                .input('nazvanie_zdaniya', mssql.NVarChar, nazvanie_zdaniya)
                .input('artikul', mssql.NVarChar, artikul)
                .input('shk', mssql.NVarChar, shk)
                .input('vlozhennost', mssql.NVarChar, vlozhennost)
                .input('pallet', mssql.NVarChar, pallet)
                .input('size_vps', mssql.NVarChar, size_vps)
                .input('vp', mssql.NVarChar, vp)
                .input('itog_zakaza', mssql.Int, itog_zakaza)
                .input('nazvanie_tovara', mssql.NVarChar, nazvanie_tovara)
                .input('srok_godnosti', mssql.NVarChar, srokGodnosti) 
                .query(insertQuery);

            res.status(200).json({ success: true, value: 'Успешно добавлено', errorCode: 200 });
        }
    } catch (err) {
        console.error('Ошибка при добавлении записи:', err);
        res.status(500).json({ success: false, value: err.message, errorCode: 500 });
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
            SELECT SUM(CAST(vlozhennost AS INT)) AS totalAccepted
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
        const { id, vlozhennost, pallet } = req.body;

        if (!id || !vlozhennost || !pallet) {
            return res.status(400).json({ success: false, value: 'Отсутствуют обязательные данные', errorCode: 400 });
        }

        const pool = await connectToDatabase();

        // Если vlozhennost = 0, удаляем запись
        if (vlozhennost === '0' || vlozhennost === 0) {
            const deleteQuery = `
                DELETE FROM [SPOe_rc].[dbo].[x_Packer_Netr]
                WHERE id = @id
            `;

            await pool.request()
                .input('id', mssql.Int, id)
                .query(deleteQuery);

            return res.status(200).json({ 
                success: true, 
                value: 'Запись успешно удалена', 
                errorCode: 200 
            });
        }

        // Если vlozhennost не 0, обновляем запись
        const updateQuery = `
            UPDATE [SPOe_rc].[dbo].[x_Packer_Netr]
            SET vlozhennost = @vlozhennost, pallet = @pallet
            WHERE id = @id
        `;

        await pool.request()
            .input('id', mssql.Int, id)
            .input('vlozhennost', mssql.NVarChar, vlozhennost)
            .input('pallet', mssql.NVarChar, pallet)
            .query(updateQuery);

        res.status(200).json({ 
            success: true, 
            value: 'Запись успешно обновлена', 
            errorCode: 200 
        });

    } catch (err) {
        console.error('Ошибка при обновлении/удалении записи:', err);
        res.status(500).json({ 
            success: false, 
            value: err.message, 
            errorCode: 500 
        });
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
            SELECT DISTINCT pallet, shk_wps
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

async function getListVp(req, res) {
    try {
        const { Nazvanie_Zadaniya } = req.query;

        if (!Nazvanie_Zadaniya) {
            return res.status(400).json({ success: false, message: 'nazvanie_zdaniya обязательно' });
        }

        const pool = await connectToDatabase();

        const query = `
            SELECT DISTINCT vp
            FROM [SPOe_rc].[dbo].[Test_MP]
            WHERE Nazvanie_Zadaniya = @Nazvanie_Zadaniya
        `;

        const result = await pool.request()
            .input('Nazvanie_Zadaniya', mssql.NVarChar(255), Nazvanie_Zadaniya)
            .query(query);

        res.status(200).json({ success: true, data: result.recordset, errorCode: 200 });

    } catch (err) {
        console.error('Ошибка при получении vp:', err);
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

        // Проверяем существование задания
        const checkQuery = `
            SELECT COUNT(*) as count 
            FROM Test_MP 
            WHERE Nazvanie_Zadaniya = @Nazvanie_Zadaniya
        `;

        const checkResult = await pool.request()
            .input('Nazvanie_Zadaniya', mssql.NVarChar, data.Nazvanie_Zadaniya)
            .query(checkQuery);

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
  
        res.status(200).json({ 
            success: true,
            message: "Данные успешно записаны в базу.",
            errorCode: 200
        });
    } catch (err) {
        console.error('Ошибка при записи данных в базу:', err);
        res.status(500).json({ 
            success: false,
            message: "Ошибка при записи данных в базу.",
            errorCode: 500
        });
    }
}

async function downloadData(req, res) {
    try {
        const taskName = req.query.task;

        if (!taskName) {
            return res.status(400).json({ success: false, message: "Параметр 'task' обязателен." });
        }

        const pool = await connectToDatabase();
        if (!pool) {
            return res.status(500).json({ success: false, message: "Ошибка подключения к базе данных." });
        }

        const query = `
            SELECT * FROM x_Packer_Netr WHERE nazvanie_zdaniya = @taskName
        `;

        const request = pool.request();
        request.input('taskName', mssql.NVarChar, taskName);

        const result = await request.query(query);

        if (result.recordset.length === 0) {
            return res.status(404).json({ success: false, message: "Нет данных по данному заданию." });
        }

        res.status(200).json({ success: true, data: result.recordset });

    } catch (err) {
        console.error('Ошибка при получении данных:', err);
        res.status(500).json({ success: false, message: "Ошибка при получении данных.", error: err.message });
    }
}

async function distinctName(req, res) {
    try {
        const pool = await connectToDatabase();
        if (!pool) {
            return res.status(500).json({ success: false, message: "Ошибка подключения к базе данных." });
        }

        const query = `
            SELECT DISTINCT Nazvanie_Zadaniya FROM Test_MP
            where Scklad_Pref = 'NETR' and Status_Zadaniya = 0
            ORDER BY Nazvanie_Zadaniya
        `;

        const request = pool.request();
        const result = await request.query(query);

        if (!result.recordset || result.recordset.length === 0) {
            return res.status(404).json({ success: false, message: "Нет доступных заданий." });
        }

        // Преобразуем результат в массив строк без вложенных объектов
        const taskNames = result.recordset.map(row => row.nazvanie_zdaniya);

        res.status(200).json({ success: true, data: taskNames });

    } catch (err) {
        console.error('Ошибка при получении данных:', err);
        res.status(500).json({ 
            success: false, 
            message: "Ошибка при получении данных.", 
            error: err.message 
        });
    }
}

async function uploadWPS(req, res) {
    try {
        // Проверяем обязательные параметры
        const { nazvanie_zdaniya, artikul,  vlozhennost, pallet, size_vps, vp, itog_zakaza, shk_wps } = req.body;


        // Подключаемся к базе данных
        const pool = await connectToDatabase();
        if (!pool) {
            return res.status(500).json({ success: false, message: "Ошибка подключения к базе данных." });
        }

        // Проверяем наличие записи
        const queryCheck = `
            SELECT id FROM x_Packer_Netr
            WHERE nazvanie_zdaniya = @nazvanie_zdaniya
              AND artikul = @artikul   
              AND vlozhennost = @vlozhennost
              AND pallet like @pallet
              AND size_vps = @size_vps
              AND vp = @vp
              AND itog_zakaza = @itog_zakaza
        `;

        const requestCheck = pool.request();
        requestCheck
        .input('nazvanie_zdaniya', mssql.NVarChar(255), nazvanie_zdaniya)
        .input('artikul', mssql.NVarChar, artikul.toString())
            .input('vlozhennost', mssql.NVarChar, vlozhennost.toString())
            .input('pallet', mssql.NVarChar, pallet.toString())
            .input('size_vps', mssql.NVarChar, size_vps.toString())
            .input('vp', mssql.NVarChar, vp.toString())
            .input('itog_zakaza', mssql.Int, itog_zakaza);

        const existing = await requestCheck.query(queryCheck);

        if (existing.recordset.length === 0) {
            return res.status(404).json({ success: false, message: "Запись не найдена." });
        }

        // Обновляем запись
        const recordId = existing.recordset[0].id;
        const queryUpdate = `
            UPDATE x_Packer_Netr
            SET shk_wps = @shk_wps
            WHERE id = @id
        `;

        const transaction = pool.transaction();
        await transaction.begin();

        try {
            await transaction.request()
                .input('shk_wps', mssql.NVarChar, shk_wps)
                .input('id', mssql.Int, recordId)
                .query(queryUpdate);

            await transaction.commit();

            console.log(`✅ Запись успешно обновлена. ID: ${recordId}, ШК_ВПС: ${shk_wps}`);
            res.status(200).json({ success: true, message: "Запись успешно обновлена." });
        } catch (updateError) {
            await transaction.rollback();
            console.error('Ошибка при обновлении записи:', updateError);
            res.status(500).json({ success: false, message: "Ошибка при обновлении записи.", error: updateError.message });
        }
    } catch (err) {
        console.error('Ошибка при выполнении запроса:', err);
        res.status(500).json({ success: false, message: "Внутренняя ошибка сервера.", error: err.message });
    }
}

async function deleteRecordsByArtikul(req, res) {
    try {
        // Получаем параметры либо из тела запроса (POST), либо из query (GET)
        const nazvanie_zdaniya = req.body.nazvanie_zdaniya || req.query.nazvanie_zdaniya;
        const artikul = req.body.artikul || req.query.artikul;

        if (!nazvanie_zdaniya || !artikul) {
            return res.status(400).json({ 
                success: false, 
                message: 'nazvanie_zdaniya и artikul обязательны', 
                errorCode: 400 
            });
        }

        const pool = await connectToDatabase();

        // Начинаем транзакцию
        const transaction = new mssql.Transaction(pool);
        await transaction.begin();

        try {
            // Удаляем записи из x_Packer_Netr
            const deleteQuery = `
                DELETE FROM [SPOe_rc].[dbo].[x_Packer_Netr]
                WHERE nazvanie_zdaniya = @nazvanie_zdaniya 
                AND artikul = @artikul
            `;

            // Обновляем статусы в Test_MP
            const updateQuery = `
                UPDATE [SPOe_rc].[dbo].[Test_MP]
                SET Status = 0, Status_Zadaniya = 0
                WHERE Nazvanie_Zadaniya = @nazvanie_zdaniya 
                AND Artikul = @artikul
            `;

            // Выполняем удаление
            await transaction.request()
                .input('nazvanie_zdaniya', mssql.NVarChar, nazvanie_zdaniya)
                .input('artikul', mssql.NVarChar, artikul)
                .query(deleteQuery);

            // Выполняем обновление статусов
            await transaction.request()
                .input('nazvanie_zdaniya', mssql.NVarChar, nazvanie_zdaniya)
                .input('artikul', mssql.NVarChar, artikul)
                .query(updateQuery);

            // Подтверждаем транзакцию
            await transaction.commit();

            res.status(200).json({ 
                success: true, 
                message: 'Записи успешно удалены и статусы обновлены', 
                errorCode: 200 
            });

        } catch (err) {
            // В случае ошибки откатываем транзакцию
            await transaction.rollback();
            throw err;
        }

    } catch (err) {
        console.error('Ошибка при удалении записей:', err);
        res.status(500).json({ 
            success: false, 
            message: err.message, 
            errorCode: 500 
        });
    }
}

async function hideTask(req, res) {
    try {
        const { nazvanie_zdaniya } = req.body;

        if (!nazvanie_zdaniya) {
            return res.status(400).json({ 
                success: false, 
                message: 'nazvanie_zdaniya обязательно', 
                errorCode: 400 
            });
        }

        const pool = await connectToDatabase();

        // Обновляем статусы в Test_MP
        const updateQuery = `
            UPDATE [SPOe_rc].[dbo].[Test_MP]
            SET Status = 2, Status_Zadaniya = 1
            WHERE Nazvanie_Zadaniya = @nazvanie_zdaniya
        `;

        await pool.request()
            .input('nazvanie_zdaniya', mssql.NVarChar, nazvanie_zdaniya)
            .query(updateQuery);

        res.status(200).json({ 
            success: true, 
            message: 'Задание успешно скрыто', 
            errorCode: 200 
        });

    } catch (err) {
        console.error('Ошибка при скрытии задания:', err);
        res.status(500).json({ 
            success: false, 
            message: err.message, 
            errorCode: 500 
        });
    }
}

module.exports = {
    addItem,
    getAcceptedQuantity,
    updateItem,
    getItemsByNazvanieZdaniya,
    getPalletToShkWpsMapping,
    uploadData,
    downloadData,
    distinctName,
    uploadWPS,
    getListVp,
    deleteRecordsByArtikul,
    hideTask
};