const mssql = require('mssql');
const fs = require('fs').promises;
const path = require('path');
const ExcelJS = require('exceljs');
const Client = require('ssh2-sftp-client');
const { connectToDatabase } = require('../dbConfig');

const exportExcel = async (req, res) => {
  const { taskName, host, port, username, password } = req.query;

  try {
    // Подключение к базе данных
    const pool = await connectToDatabase();
    const result = await pool.request()
      .input('Nazvanie_Zadaniya', mssql.NVarChar(255), taskName)
      .query('SELECT * FROM Test_MP WHERE Nazvanie_Zadaniya = @Nazvanie_Zadaniya');

    if (result.recordset.length === 0) {
      console.log('Нет данных для указанного задания');
      res.status(404).json({ success: false, message: 'Нет данных для указанного задания' });
      return;
    }

    console.log('Данные успешно получены:', result.recordset);

    // Создание нового Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Data');

    // Шапка Excel файла (заголовки столбцов)
    worksheet.columns = [

      { header: 'Артикул', key: 'Artikul', width: 15 },
      { header: 'Артикул сырья', key: 'Artikul_Syrya', width: 15 },
      { header: 'Название товара', key: 'Nazvanie_Tovara', width: 30 },
      { header: 'ШК СПО', key: 'SHK', width: 15 },
      { header: 'Кол-во сырья', key: 'Kol_vo_Syrya', width: 15 },
      { header: 'Итог заказа', key: 'Itog_Zakaz', width: 15 },
      { header: 'СОХ', key: 'SOH', width: 10 },
      { header: 'Срок годности', key: 'Srok_Godnosti', width: 15 },
      { header: 'Оп 1 Бл 1 Шт', key: 'Op_1_Bl_1_Sht', width: 15 },
      { header: 'Оп 2 Бл 2 Шт', key: 'Op_2_Bl_2_Sht', width: 15 },
      { header: 'Оп 3 Бл 3 Шт', key: 'Op_3_Bl_3_Sht', width: 15 },
      { header: 'Оп 4 Бл 4 Шт', key: 'Op_4_Bl_4_Sht', width: 15 },
      { header: 'Оп 5 Бл 5 Шт', key: 'Op_5_Bl_5_Sht', width: 15 },
      { header: 'Оп 6 Блис 6-10 Шт', key: 'Op_6_Blis_6_10_Sht', width: 20 },
      { header: 'Оп 7 Пересчет', key: 'Op_7_Pereschyot', width: 20 },
      { header: 'Оп 9 Фасовка Сборка', key: 'Op_9_Fasovka_Sborka', width: 20 },
      { header: 'Оп 10 Маркировка ШТ', key: 'Op_10_Markirovka_SHT', width: 20 },
      { header: 'Оп 11 Маркировка Пром', key: 'Op_11_Markirovka_Prom', width: 20 },
      { header: 'Оп 12 Маркировка Пром', key: 'Op_12_Markirovka_Prom', width: 20 },
      { header: 'Оп 13 Маркировка Фабр', key: 'Op_13_Markirovka_Fabr', width: 20 },
      { header: 'Оп 14 ТУ 1 Шт', key: 'Op_14_TU_1_Sht', width: 15 },
      { header: 'Оп 15 ТУ 2 Шт', key: 'Op_15_TU_2_Sht', width: 15 },
      { header: 'Оп 16 ТУ 3-5', key: 'Op_16_TU_3_5', width: 15 },
      { header: 'Оп 17 ТУ 6-8', key: 'Op_17_TU_6_8', width: 15 },
      { header: 'Оп 468 Проверка ШК', key: 'Op_468_Proverka_SHK', width: 20 },
      { header: 'Оп 469 Спецификация ТМ', key: 'Op_469_Spetsifikatsiya_TM', width: 20 },
      { header: 'Оп 470 Доп. упаковка', key: 'Op_470_Dop_Upakovka', width: 20 },
      { header: 'Место', key: 'Mesto', width: 10 },
      { header: 'Вложенность', key: 'Vlozhennost', width: 10 },
      { header: 'Палет №', key: 'Pallet_No', width: 10 },
      { header: 'Процент', key: 'Persent', width: 10 },
      { header: 'Исполнитель', key: 'Ispolnitel', width: 15},
      { header: 'Время начала', key: 'Time_Start', width: 20 },
      { header: 'Время середины', key: 'Time_Middle', width: 20 },
      { header: 'Время конца', key: 'Time_End', width: 20 },
    ];

    // Добавление данных в Excel файл
    result.recordset.forEach(row => {
      worksheet.addRow({
        Artikul: row.Artikul,
        Artikul_Syrya: row.Artikul_Syrya,
        Nazvanie_Tovara: row.Nazvanie_Tovara,
        SHK: row.SHK,
        Kol_vo_Syrya: row.Kol_vo_Syrya,
        Itog_Zakaz: row.Itog_Zakaz,
        Itog_MP: row.Itog_MP,
        SOH: row.SOH,
        Srok_Godnosti: row.Srok_Godnosti,
        Op_1_Bl_1_Sht: row.Op_1_Bl_1_Sht,
        Op_2_Bl_2_Sht: row.Op_2_Bl_2_Sht,
        Op_3_Bl_3_Sht: row.Op_3_Bl_3_Sht,
        Op_4_Bl_4_Sht: row.Op_4_Bl_4_Sht,
        Op_5_Bl_5_Sht: row.Op_5_Bl_5_Sht,
        Op_6_Blis_6_10_Sht: row.Op_6_Blis_6_10_Sht,
        Op_7_Pereschyot: row.Op_7_Pereschyot,
        Op_9_Fasovka_Sborka: row.Op_9_Fasovka_Sborka,
        Op_10_Markirovka_SHT: row.Op_10_Markirovka_SHT,
        Op_11_Markirovka_Prom: row.Op_11_Markirovka_Prom,
        Op_12_Markirovka_Prom: row.Op_12_Markirovka_Prom,
        Op_13_Markirovka_Fabr: row.Op_13_Markirovka_Fabr,
        Op_14_TU_1_Sht: row.Op_14_TU_1_Sht,
        Op_15_TU_2_Sht: row.Op_15_TU_2_Sht,
        Op_16_TU_3_5: row.Op_16_TU_3_5,
        Op_17_TU_6_8: row.Op_17_TU_6_8,
        Op_468_Proverka_SHK: row.Op_468_Proverka_SHK,
        Op_469_Spetsifikatsiya_TM: row.Op_469_Spetsifikatsiya_TM,
        Op_470_Dop_Upakovka: row.Op_470_Dop_Upakovka,
        Mesto: row.Mesto,
        Vlozhennost: row.Vlozhennost,
        Pallet_No: row.Pallet_No,
        Persent: row.Persent,
        Ispolnitel: row.Ispolnitel,
        Time_Start: row.Time_Start,
        Time_Middle: row.Time_Middle,
        Time_End: row.Time_End,
      });
    });

    // Путь к файлу на сервере, куда будет сохранен Excel файл
    const dirPath = path.join(__dirname, '..', 'downloads');
    await fs.mkdir(dirPath, { recursive: true });
    const localFilePath = path.join(dirPath, `${taskName}.xlsx`);

    // Сохранение Excel файла на сервер
    await workbook.xlsx.writeFile(localFilePath);

    // Подключение к SFTP серверу и загрузка файла
    const sftp = new Client();
    try {
      await sftp.connect({ host, port: parseInt(port, 10), username, password });
      const remoteFilePath = `/root/task_file/done/${taskName}.xlsx`;
      await sftp.put(localFilePath, remoteFilePath);
    } finally {
      await sftp.end();
    }

    // Удаление локального файла после загрузки на SFTP (опционально)
    await fs.unlink(localFilePath);

    // Отправка успешного ответа клиенту
    res.json({ success: true, message: `Файл ${taskName} успешно экспортирован и загружен на SFTP сервер.` });

  } catch (error) {
    console.error('Ошибка при экспорте данных в Excel и загрузке на SFTP сервер:', error);
    res.status(500).json({ success: false, message: 'Ошибка при экспорте данных в Excel и загрузке на SFTP сервер', error: error.message });
  }
};

module.exports = {
  exportExcel,
};
