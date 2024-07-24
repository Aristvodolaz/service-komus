const mssql = require('mssql');
const logger = require('../utils/logger');
const SFTPClient = require('ssh2-sftp-client');
const XLSX = require('xlsx');
const sftp = new SFTPClient();
const {connectToDatabase, sql } = require('../dbConfig')


const testConnection = async (req, res) => {
    
        await sftp.connect({
            host: '31.128.44.48',
            port: 22,
            username: 'root',
            password: 'Arishka_2002!'
        });

        console.log('SFTP connection successful!');

        // Define the path and the local file name
        const remoteFilePath = '/root/task_file/wait/Test.xlsx';
        const localFilePath = 'downloads/Test.xlsx';

        // Download the file
        await sftp.fastGet(remoteFilePath, localFilePath);
        console.log('File downloaded successfully!');

        // Read the XLSX file
        const workbook = XLSX.readFile(localFilePath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        // Convert the sheet to JSON
        const data = XLSX.utils.sheet_to_json(sheet);
        console.log('Data extracted from the file:', data);

        const pool = await connectToDatabase(); // Подключение к базе данных

  try {
    const transaction = await pool.transaction();
    await transaction.begin();

    for (const item of data) {
      const request = transaction.request();

      const query = `INSERT INTO Test_te (Name, Surname) VALUES (@Name, @Surname)`;
      request.input('Name', mssql.NVarChar(255), item['Name'].toString());
      request.input('Surname', mssql.NVarChar(255), item['Surname'].toString());
      await request.query(query);
    }

    await transaction.commit();
    console.log('Данные успешно добавлены в базу данных');
    res.status(200).json({ success: true, error: "SUccess", errorCode: 500 });

    } catch (err) {
        console.error('Error occurred:', err.message);
        res.status(500).json({ success: false, error: err.message, errorCode: 500 });
  
  } 
}

module.exports = {
  testConnection
};
