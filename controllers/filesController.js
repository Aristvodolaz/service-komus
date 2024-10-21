const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const { sql, connectToDatabase } = require('./db');
const path = require('path');
const xlsx = require('xlsx'); // Для работы с Excel

const app = express();
const PORT = 3000;

// Настройка хранения файлов
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
});

const upload = multer({ storage });

// Middleware для обработки JSON запросов
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Подключение к базе данных
connectToDatabase();

// 1. Метод для загрузки файла
app.post('/upload', upload.single('file'), async (req, res) => {
    try {
        const filePath = req.file.path;
        const fileName = req.file.filename;
        const selectedSklad = req.body.sklad; // Склад, выбранный пользователем на клиенте

        const pref = fileName.split(' ')[0]; // Извлечение pref из имени файла
        const query = `
            INSERT INTO Test_MP (
                Pref, Nazvanie_Zadaniya, Status_Zadaniya, Status, Ispolnitel, Artikul, Artikul_Syrya, Nomenklatura,
                Nazvanie_Tovara, SHK, SHK_Syrya, SHK_SPO, SHK_SPO_1, Kol_vo_Syrya, Itog_Zakaz, Sht_v_MP, Itog_MP, SOH,
                Tip_Postavki, Srok_Godnosti, Op_1_Bl_1_Sht, Op_2_Bl_2_Sht, Op_3_Bl_3_Sht, Op_4_Bl_4_Sht, Op_5_Bl_5_Sht,
                Op_6_Blis_6_10_Sht, Op_7_Pereschyot, Op_9_Fasovka_Sborka, Op_10_Markirovka_SHT, Op_11_Markirovka_Prom,
                Op_12_Markirovka_Prom, Op_13_Markirovka_Fabr, Op_14_TU_1_Sht, Op_15_TU_2_Sht, Op_16_TU_3_5, Op_17_TU_6_8,
                Op_468_Proverka_SHK, Op_469_Spetsifikatsiya_TM, Op_470_Dop_Upakovka, Mesto, Vlozhennost, Pallet_No,
                Time_Start, Time_End, Persent, SHK_WPS, Scklad_Pref
            )
            VALUES (@pref, @fileName, @statusZadaniya, @status, @ispolnitel, @artikul, @artikulSyrya, @nomenklatura,
                    @nazvanieTovara, @shk, @shkSyrya, @shkSpo, @shkSpo1, @kol_voSyrya, @itogZakaz, @sht_vMP, @itogMP,
                    @soh, @tipPostavki, @srokGodnosti, @op1Bl1Sht, @op2Bl2Sht, @op3Bl3Sht, @op4Bl4Sht, @op5Bl5Sht,
                    @op6Blis610Sht, @op7Pereschyot, @op9FasovkaSborka, @op10MarkirovkaSHT, @op11MarkirovkaProm,
                    @op12MarkirovkaProm, @op13MarkirovkaFabr, @op14TU1Sht, @op15TU2Sht, @op16TU35, @op17TU68,
                    @op468ProverkaSHK, @op469SpetsifikatsiyaTM, @op470DopUpakovka, @mesto, @vlozhennost, @palletNo,
                    @timeStart, @timeEnd, @persent, @shkWps, @skladPref)`;

        const request = new sql.Request();
        request.input('pref', sql.NVarChar, pref);
        request.input('fileName', sql.NVarChar, fileName);
        // Пример ввода данных для остальных полей (заполните остальные параметры аналогично)
        request.input('skladPref', sql.NVarChar, selectedSklad);

        await request.query(query);
        res.status(200).json({ message: "Файл успешно загружен и данные добавлены в базу данных." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Ошибка при загрузке файла." });
    }
});

// 2. Метод для получения списка складов
app.get('/sklads', async (req, res) => {
    try {
        const query = "SELECT Pref, City FROM Scklad_City_MP";
        const result = await sql.query(query);

        const sklads = result.recordset.map(row => `${row.Pref} - ${row.City}`);
        res.status(200).json({ sklads });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Ошибка при загрузке списка складов." });
    }
});

// 3. Метод для получения списка выполненных файлов для выбранного склада
app.get('/files', async (req, res) => {
    try {
        const skladPref = req.query.skladPref;
        const query = "SELECT DISTINCT Nazvanie_Zadaniya FROM Test_MP WHERE Scklad_Pref = @skladPref";
        
        const request = new sql.Request();
        request.input('skladPref', sql.NVarChar, skladPref);

        const result = await request.query(query);
        const files = result.recordset.map(row => row.Nazvanie_Zadaniya);

        res.status(200).json({ files });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Ошибка при загрузке списка файлов." });
    }
});

// 4. Метод для скачивания файла (создание и скачивание Excel файла)
app.get('/download', async (req, res) => {
    try {
        const taskName = req.query.task;
        const isWB = taskName.includes('WB');

        let query;
        if (isWB) {
            // Если файл WB, выгружаем уникальные записи из таблицы Test_MP_Privyazka
            query = `
                SELECT Nazvanie_Zadaniya, Artikul, Barcode, Kolvo_Tovarov, SHK_Coroba, Srok_Godnosti, Pallet_No, SHK_WPS
                FROM Test_MP_Privyazka WHERE Nazvanie_Zadaniya = @taskName`;
        } else {
            // Если файл не WB, выгружаем данные из основной таблицы Test_MP
            query = `
                SELECT Nazvanie_Zadaniya, Artikul, Artikul_Syrya, Nazvanie_Tovara, SHK, SHK_Syrya, Kol_vo_Syrya, Itog_Zakaz,
                       Itog_MP, SOH, Srok_Godnosti, Op_1_Bl_1_Sht, Op_2_Bl_2_Sht, Op_3_Bl_3_Sht, Op_4_Bl_4_Sht, Op_5_Bl_5_Sht,
                       Op_6_Blis_6_10_Sht, Op_7_Pereschyot, Op_9_Fasovka_Sborka, Op_10_Markirovka_SHT, Op_11_Markirovka_Prom,
                       Op_13_Markirovka_Fabr, Op_14_TU_1_Sht, Op_15_TU_2_Sht, Op_16_TU_3_5, Op_17_TU_6_8, Op_468_Proverka_SHK,
                       Op_469_Spetsifikatsiya_TM, Op_470_Dop_Upakovka, Mesto, Vlozhennost, Pallet_No, Ispolnitel, SHK_WPS
                FROM Test_MP WHERE Nazvanie_Zadaniya = @taskName`;
        }

        const request = new sql.Request();
        request.input('taskName', sql.NVarChar, taskName);

        const result = await request.query(query);

        const data = result.recordset;

        // Преобразование данных в Excel файл
        const ws = xlsx.utils.json_to_sheet(data);
        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, ws, 'Sheet1');

        const filePath = path.join(__dirname, 'downloads', `${taskName}.xlsx`);
        xlsx.writeFile(wb, filePath);

        res.download(filePath);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Ошибка при скачивании файла." });
    }
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
