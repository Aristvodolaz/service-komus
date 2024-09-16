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
    const { name, artikul} = req.body;  

    try {
        const pool = await connectToDatabase();
        if (!pool) {
            return res.status(500).json({ success: false, value: null, errorCode: 500 });
        }

        // Выполнение SELECT-запроса для получения всех записей с нужными полями
        await pool.request()
            .input('Nazvanie_Zadaniya', mssql.NVarChar(255), name)
            .input('Artikul', mssql.Int, artikul)
            .query(`
                SELECT Nazvanie_Zadaniya, Artikul, Srok_Godnosti, SHK_WPS, Pallet_No, Kolvo_Tovarov
                FROM Test_MP_Privyazka
            `);

        res.json({ success: true, value: result.recordset, errorCode: 200 });
    } catch (error) {
        console.error('Ошибка при получении записей:', error);
        res.status(500).json({ success: false, value: null, errorCode: 500 });
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

module.exports = {
    addZapis,
    addSrokGodnosti,
    getZapis
};
