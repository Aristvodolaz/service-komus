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
      { header: 'Примерка ШК', key: 'Primeryka_SHK', width: 14 },
      { header: 'Проверка срока годности', key: 'Proverka_Sroka_Godnosti', width: 20 },
      { header: 'Упаковка в ПЭ пакет', key: 'Upakovka_v_PE_Paket', width: 16 },
      { header: 'Упаковка в бабл плёнку', key: 'Upakovka_v_Babl_Plenku', width: 18 },
      { header: 'Упаковка в инд. короб', key: 'Upakovka_v_Ind_Korob', width: 18 },
      { header: 'Маркировка товара (ЧЗ)', key: 'Markirovka_Tovara_Stiker_CHZ', width: 22 },
      { header: 'Удаление маркировки', key: 'Udalenie_Stikera_Markirovki', width: 18 },
      { header: 'Доп. защита товара', key: 'Dopolnitelnaya_Zashchita_Tovara', width: 18 },
      { header: 'Маркировка трансп. короба', key: 'Markirovka_Transportnogo_Koroba', width: 20 },
      { header: 'Спецификация ТМ', key: 'Spetsifikatsiya_TM', width: 16 },
      { header: 'Формирование паллет отгрузки', key: 'Formirovanie_Pallet_Otgruzki', width: 22 },
      { header: 'Упаковочный материал', key: 'Upakovochnyi_Material', width: 18 },
      { header: 'Маркировка паллеты (ТМ)', key: 'Markirovka_Palleta_TM', width: 20 },
      { header: 'Раскомплект заказа', key: 'Raskomplekt_Zakaza', width: 18 },
      { header: 'Тип операции', key: 'Tip_Operatsii_LDU', width: 22 },
      { header: 'Сортируемый товар', key: 'Sortiruemyi_Tovar', width: 16 },
      { header: 'Не сортируемый товар', key: 'Ne_Sortiruemyi_Tovar', width: 18 },
      { header: 'Продукты', key: 'Produkty', width: 12 },
      { header: 'Опасный товар', key: 'Opasnyi_Tovar', width: 14 },
      { header: 'Замороженная зона', key: 'Zamorozhennaya_Zona', width: 16 },
      { header: 'Крупногабаритный товар', key: 'Krupnogabaritnyi_Tovar', width: 18 },
      { header: 'Ювелирные изделия', key: 'Yuvelirnye_Izdelia', width: 18 },
      { header: 'Сортировка по признаку', key: 'PriznakSortirovki', width: 20 },
      { header: 'Формирование наборов от 2 ед.', key: 'Sborka_naborov_ot_2_shtuk_raznykh_tovarov', width: 24 },
      { header: 'Место', key: 'Mesto', width: 10 },
      { header: 'Вложенность', key: 'Vlozhennost', width: 10 },
      { header: 'Палет №', key: 'Pallet_No', width: 10 },
      { header: 'Изначальный ШК', key: 'SHK_Original', width: 20 },
      { header: 'Измененный ШК', key: 'SHK_Changed', width: 20 },
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
        Primeryka_SHK: row.Primeryka_SHK,
        Proverka_Sroka_Godnosti: row.Proverka_Sroka_Godnosti,
        Upakovka_v_PE_Paket: row.Upakovka_v_PE_Paket,
        Upakovka_v_Babl_Plenku: row.Upakovka_v_Babl_Plenku,
        Upakovka_v_Ind_Korob: row.Upakovka_v_Ind_Korob,
        Markirovka_Tovara_Stiker_CHZ: row.Markirovka_Tovara_Stiker_CHZ,
        Udalenie_Stikera_Markirovki: row.Udalenie_Stikera_Markirovki,
        Dopolnitelnaya_Zashchita_Tovara: row.Dopolnitelnaya_Zashchita_Tovara,
        Markirovka_Transportnogo_Koroba: row.Markirovka_Transportnogo_Koroba,
        Spetsifikatsiya_TM: row.Spetsifikatsiya_TM,
        Formirovanie_Pallet_Otgruzki: row.Formirovanie_Pallet_Otgruzki,
        Upakovochnyi_Material: row.Upakovochnyi_Material,
        Markirovka_Palleta_TM: row.Markirovka_Palleta_TM,
        Raskomplekt_Zakaza: row.Raskomplekt_Zakaza,
        Tip_Operatsii_LDU: row.Tip_Operatsii_LDU,
        Sortiruemyi_Tovar: row.Sortiruemyi_Tovar,
        Ne_Sortiruemyi_Tovar: row.Ne_Sortiruemyi_Tovar,
        Produkty: row.Produkty,
        Opasnyi_Tovar: row.Opasnyi_Tovar,
        Zamorozhennaya_Zona: row.Zamorozhennaya_Zona,
        Krupnogabaritnyi_Tovar: row.Krupnogabaritnyi_Tovar,
        Yuvelirnye_Izdelia: row.Yuvelirnye_Izdelia,
        PriznakSortirovki: row.PriznakSortirovki,
        Sborka_naborov_ot_2_shtuk_raznykh_tovarov: row.Sborka_naborov_ot_2_shtuk_raznykh_tovarov,
        Mesto: row.Mesto,
        Vlozhennost: row.Vlozhennost,
        Pallet_No: row.Pallet_No,
        SHK_Original: row.SHK_Original,
        SHK_Changed: row.SHK_Changed,
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
