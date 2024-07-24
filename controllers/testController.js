const mssql = require('mssql');
const logger = require('../utils/logger');
const SFTPClient = require('ssh2-sftp-client');
const sftp = new SFTPClient();

const testConnection =  async (req, res) => {
    try {
        await sftp.connect({
            host: '31.128.44.48',
            port: 22,
            username: 'root',
            password: 'Arishka_2002!'
        });
        
        console.log('Подключение успешно!');
        // Попробуйте выполнить простую операцию, например, перечисление файлов
        const list = await sftp.list('/root/task_file');
        console.log('Содержимое корневой директории:', list);
        
        res.status(200).json({ success: true, value: list, errorCode: 200 });

    } catch (err) {
        console.error('Ошибка подключения или выполнения:', err.message);
    } finally {
        sftp.end();
    }
}


module.exports = {
  testConnection};
