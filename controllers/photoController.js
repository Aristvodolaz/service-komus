const mssql = require('mssql');
const { connectToDatabase } = require('../dbConfig');

const getPhoto = async (req, res) => {
  const { Article, Marketplace } = req.query;

  if (!Article || !Marketplace) {
    return res.status(400).json({ success: false, msg: 'Необходимо указать Article и Marketplace', errorCode: 400 });
  }

  try {
    const pool = await connectToDatabase();
    if (!pool) {
      throw new Error('Ошибка подключения к базе данных');
    }

    const query = `
      SELECT [Id], [Article], [PhotoPath], [UploadedAt], [Marketplace]
      FROM [SPOe_rc].[dbo].[LduPhotos]
      WHERE [Article] = @Article AND [Marketplace] = @Marketplace
    `;

    const request = pool.request();
    request.input('Article', mssql.NVarChar, Article);
    request.input('Marketplace', mssql.NVarChar, Marketplace);

    const result = await request.query(query);

    if (result.recordset.length === 0) {
      return res.status(404).json({ success: false, msg: 'Фото не найдено', errorCode: 404 });
    } else {
      return res.status(200).json({ success: true, data: result.recordset, errorCode: 200 });
    }
  } catch (error) {
    console.error('Ошибка при получении фото:', error);
    res.status(500).json({ success: false, msg: 'Ошибка при получении фото', errorCode: 500 });
  }
};

module.exports = {
  getPhoto,
};
