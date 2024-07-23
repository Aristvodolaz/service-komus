const mssql = require('mssql');
const fs = require('fs').promises; // Используем асинхронные методы
const path = require('path');
const ExcelJS = require('exceljs');
const Client = require('ssh2-sftp-client');
const { connectToDatabase, sql } = require('../dbConfig'); // Убедитесь, что путь к dbConfig верен

// Контроллер для экспорта данных в Excel файл и загрузки его на SFTP сервер
const exportExcel = async (req, res) => {
  const { taskName, host, port, username, password } = req.query;

  try {
    // Подключение к базе данных
    let pool = await connectToDatabase();
    // Запрос на получение данных из базы данных
    const result = await pool.request()
      .input('Nazvanie_Zadaniya', mssql.NVarChar(255), taskName)
      .query('SELECT * FROM Test_MP where Nazvanie_Zadaniya = @Nazvanie_Zadaniya');


      if (result.recordset.length === 0) {
        console.log('Нет данных для указанного задания');
      } else {
        console.log('Данные успешно получены:', result.recordset);
      }
    // Создание нового Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Data');

    // Шапка Excel файла (заголовки столбцов)
    worksheet.columns = [
      { header: 'Название задания', key: 'Nazvanie_Zadaniya', width: 30 },
      { header: 'Статус', key: 'Status', width: 10 },
      { header: 'Артикул', key: 'Artikul', width: 15 },
      // Добавьте другие заголовки столбцов здесь
    ];

    // Добавление данных в Excel файл
    result.recordset.forEach(row => {
      worksheet.addRow({
        Nazvanie_Zadaniya: row.Nazvanie_Zadaniya,
        Status: row.Status,
        Artikul: row.Artikul,
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

    const remoteFilePath = `/root/task_file/done/${taskName}.xlsx`; // Укажите удаленный путь для загрузки файла
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
