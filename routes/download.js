const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { downloadFile } = require('../controllers/downloadController');

// Route to download a specific file by fileName
router.get('/file/:fileName', async (req, res) => {
  const { fileName } = req.params;
  const fileUrl = `http://31.128.44.48/root/task_file/wait/${fileName}`; // Replace with actual URL

  const outputFilePath = path.join(downloadDir, fileName);

  try {
    // Check if the file already exists locally
    if (fs.existsSync(outputFilePath)) {
      res.status(200).download(outputFilePath); // If exists, send it for download
      return;
    }

    // Download the file from the remote server
    await downloadFile(fileUrl, outputFilePath);
    res.status(200).download(outputFilePath); // Send downloaded file for download
  } catch (error) {
    console.error(`Ошибка при скачивании файла ${fileName}`, error);
    res.status(500).json({
      success: false,
      message: 'Ошибка работы сервера при скачивании файла',
      errorCode: 500,
    });
  }
});

module.exports = router;
