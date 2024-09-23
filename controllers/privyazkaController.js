const mssql = require('mssql');
const { connectToDatabase, sql } = require('../dbConfig');
const { error } = require('winston');

const addZapis = async (req, res) => {
    const { name, artikul, kolvo, pallet, shk} = req.body;  
  
    try {
        const pool = await connectToDatabase();
        if (!pool) {
            return res.status(500).json({ success: false, value: null, errorCode: 500 });
        }
  
        // Добавление новой записи
        await pool.request()
            .input('Nazvanie_Zadaniya', mssql.NVarChar(255), name)
            .input('Artikul', mssql.Int, artikul)
            .input('Kolvo_Tovarov', mssql.Int, kolvo)
            .input('Pallet_No', mssql.Int, pallet)
            .input('SHK_WPS', mssql.NVarChar(255), shk)
            .query(`
                INSERT INTO Test_MP_Privyazka (Nazvanie_Zadaniya, Artikul, Kolvo_Tovarov, Pallet_No, SHK_WPS)
                VALUES (@Nazvanie_Zadaniya, @Artikul, @Kolvo_Tovarov, @Pallet_No, @SHK_WPS)
            `);
  
        res.json({ success: true, value: 'Запись успешно добавлена', errorCode: 200 });
    } catch (error) {
        console.error('Ошибка при добавлении записи:', error);
        res.status(500).json({ success: false, value: null, errorCode: 500 });
    }
};


const getZapis = async (req, res) => {
    const { name, artikul } = req.query;  

    console.log('Полученные данные:', { name, artikul }); // Логируем входящие данные

    try {
        const pool = await connectToDatabase();
        
        if (!pool) {
            return res.status(500).json({ success: false, value: null, errorCode: 500, message: 'Ошибка подключения к базе данных' });
        }
        
        const result = await pool.request()
            .input('Nazvanie_Zadaniya', mssql.NVarChar(255), name)
            .input('Artikul', mssql.NVarChar(50), artikul) // Измените на NVarChar, если это строка
            .query(`
                SELECT Nazvanie_Zadaniya, Artikul, Srok_Godnosti, SHK_WPS, Pallet_No, Kolvo_Tovarov
                FROM Test_MP_Privyazka
                WHERE Nazvanie_Zadaniya = @Nazvanie_Zadaniya AND Artikul = @Artikul
            `);

        // Проверка результата
        if (result.recordset.length > 0) {
            return res.json({ success: true, value: result.recordset, errorCode: 200 });
        } else {
            return res.status(200).json({ success: false, value: null, errorCode: 200 });
        }
    } catch (error) {
        console.error('Ошибка при получении записей:', error);
        return res.status(500).json({ success: false, value: null, errorCode: 500, message: 'Ошибка сервера' });
    }
};




const addSrokGodnosti = async (req, res) => {
    const { name, artikul, srok_godnosti} = req.body;  
  
    try {
        const pool = await connectToDatabase();
        if (!pool) {
            return res.status(500).json({ success: false, value: null, errorCode: 500 });
        }
  
        // Добавление новой записи
        await pool.request()
            .input('Nazvanie_Zadaniya', mssql.NVarChar(255), name)
            .input('Artikul', mssql.Int, artikul)
            .input('Srok_Godnosti', mssql.NVarChar(255), srok_godnosti)
            .query(`
                INSERT INTO Test_MP_Privyazka (Nazvanie_Zadaniya, Artikul, Srok_Godnosti)
                VALUES (@Nazvanie_Zadaniya, @Artikul, @Srok_Godnosti)
            `);
  
        res.json({ success: true, value: 'Запись успешно добавлена', errorCode: 200 });
    } catch (error) {
        console.error('Ошибка при добавлении записи:', error);
        res.status(500).json({ success: false, value: null, errorCode: 500 });
    }
};

const endZapis = async (req, res) => {
    const { name, artikul } = req.query;

    try {
        const pool = await connectToDatabase();
        if (!pool) {
            return res.status(500).json({ success: false, value: null, errorCode: 500 });
        }

        // Обновление записи
        const result = await pool.request()
            .input('Nazvanie_Zadaniya', mssql.NVarChar, name)
            .input('Artikul', mssql.NVarChar, artikul)
            .input('Status', mssql.Int, 2)
            .input('Status_Zadaniya', mssql.Int, 1)
            .query(`
                UPDATE Test_MP
                SET Status = @Status, Status_Zadaniya = @Status_Zadaniya
                WHERE Nazvanie_Zadaniya = @Nazvanie_Zadaniya AND Artikul = @Artikul
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ success: false, value: 'Запись не найдена', errorCode: 404 });
        }

        res.json({ success: true, value: 'Запись успешно обновлена', errorCode: 200 });
    } catch (error) {
        console.error('Ошибка при обновлении записи:', error);
        res.status(500).json({ success: false, value: null, errorCode: 500 });
    }
};


const getAllByNazvanieZadaniya = async (req, res) => {
    const { name } = req.query;

    console.log('Received name:', name); // Логируем параметр
    try {
        const pool = await connectToDatabase();
        if (!pool) {
            return res.status(500).json({ success: false, value: null, errorCode: 500 });
        }

        const result = await pool.request()
            .input('Nazvanie_Zadaniya', mssql.NVarChar(255), name)
            .query(`
                SELECT Nazvanie_Zadaniya, Artikul, Srok_Godnosti, SHK_WPS, Pallet_No, Kolvo_Tovarov
                FROM Test_MP_Privyazka
                WHERE Nazvanie_Zadaniya = @Nazvanie_Zadaniya
            `);

        if (result.recordset.length > 0) {
            return res.json({ success: true, value: result.recordset, errorCode: 200 });
        } else {
            return res.status(404).json({ success: false, value: 'Данные не найдены', errorCode: 404 });
        }
    } catch (error) {
        console.error('Ошибка при получении данных по заданию:', error);
        return res.status(500).json({ success: false, value: null, errorCode: 500 });
    }
};

// Метод для обновления паллета и вложенности
const updatePalletAndKolvo = async (req, res) => {
    const { name, artikul, pallet, kolvo } = req.query;

    try {
        const pool = await connectToDatabase();
        if (!pool) {
            return res.status(500).json({ success: false, value: null, errorCode: 500 });
        }

        const result = await pool.request()
            .input('Nazvanie_Zadaniya', mssql.NVarChar(255), name)
            .input('Artikul', mssql.NVarChar(50), artikul)
            .input('Pallet_No', mssql.Int, pallet)
            .input('Kolvo_Tovarov', mssql.Int, kolvo)
            .query(`
                UPDATE Test_MP_Privyazka
                SET Pallet_No = @Pallet_No, Kolvo_Tovarov = @Kolvo_Tovarov
                WHERE Nazvanie_Zadaniya = @Nazvanie_Zadaniya AND Artikul = @Artikul
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ success: false, value: 'Запись не найдена для обновления', errorCode: 404 });
        }

        res.json({ success: true, value: 'Паллет и вложенность успешно обновлены', errorCode: 200 });
    } catch (error) {
        console.error('Ошибка при обновлении паллета и вложенности:', error);
        res.status(500).json({ success: false, value: null, errorCode: 500 });
    }
};

const getSklads = async (req, res) => {
    try {
        const pool = await connectToDatabase();
        if (!pool) {
            return res.status(500).json({ success: false, value: null, errorCode: 500, message: 'Ошибка подключения к базе данных' });
        }

        // Выполнение запроса к базе данных для получения данных о складах
        const result = await pool.request()
            .query(`SELECT Pref, Name, City FROM Scklad_City_MP`);

        // Проверяем, есть ли записи в результате запроса
        if (result.recordset.length === 0) {
            return res.status(404).json({ success: false, value: [], errorCode: 404, message: 'Записи не найдены' });
        }

        // Успешный ответ с данными
        res.json({ success: true, value: result.recordset, errorCode: 200 });
    } catch (error) {
        console.error('Ошибка при получении данных о складах:', error);
        res.status(500).json({ success: false, value: null, errorCode: 500, message: 'Внутренняя ошибка сервера' });
    }
};


module.exports = {
    addZapis,
    addSrokGodnosti,
    getZapis,
    endZapis,
    getAllByNazvanieZadaniya,  // Экспорт метода для получения всех данных по названию задания
    updatePalletAndKolvo,       // Экспорт метода для обновления паллета и вложенности
    getSklads
};