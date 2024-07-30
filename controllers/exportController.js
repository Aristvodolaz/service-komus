const mssql = require('mssql');
const fs = require('fs').promises;
const path = require('path');
const ExcelJS = require('exceljs');
const Client = require('ssh2-sftp-client');
const { connectToDatabase, sql } = require('../dbConfig');

const exportExcel = async (req, res) => {
  const { taskName, host, port, username, password } = req.query;

  try {
    // Подключение к базе данных
    let pool = await connectToDatabase();
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
      { header: 'Название задания', key: 'Nazvanie_Zadaniya', width: 30 },
      { header: 'Статус', key: 'Status', width: 10 },
      { header: 'Артикул', key: 'Artikul', width: 15 },
      { header: 'Срок годности', key: 'Srok_Godnosti', width: 15 },
      { header: 'Место', key: 'Mesto', width: 10 },
      { header: 'Вложенность', key: 'Vlozhennost', width: 10 },
      { header: 'Палет №', key: 'Pallet_No', width: 10 }
      // Добавьте другие заголовки столбцов здесь
    ];

    // Добавление данных в Excel файл
    result.recordset.forEach(row => {
      worksheet.addRow({
        Nazvanie_Zadaniya: row.Nazvanie_Zadaniya,
        Status: row.Status,
        Artikul: row.Artikul,
        Srok_Godnosti: row.Srok_Godnosti,
        Mesto: row.Mesto,
        Vlozhennost: row.Vlozhennost,
        Pallet_No: row.Pallet_No
        // Добавьте другие поля данных здесь
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
    await sftp.connect({ host, port: parseInt(port, 10), username, password });
    const remoteFilePath = `/root/task_file/done/${taskName}`;
    await sftp.put(localFilePath, remoteFilePath);
    await sftp.end();

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
