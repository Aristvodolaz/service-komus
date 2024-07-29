const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors'); // Импортируйте пакет cors

/*for gruzy*/
const dataRouter = require('./routes/test');
const reasonRouter = require('./routes/reason');

/* for market place*/
const tasksController = require('./routes/market_place/tasks');

/* for excel*/
const fileController = require('./routes/market_place/file');
const filesRouter = require('./routes/market_place/file');
const downloadController = require('./controllers/downloadController');
const exportRoutes = require('./routes/export');
const updateRoutes = require('./routes/finish');
const articleRoutes = require('./routes/market_place/article');
const authRoutes = require('./routes/market_place/auth');
const srokRoutes = require('./routes/market_place/srok');

const logger = require('./utils/logger');

const app = express();
const port = 3005;

// Настройка CORS
app.use(cors({
  origin: '*', // Разрешить все домены (для разработки)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Разрешить методы
  allowedHeaders: ['Content-Type', 'Authorization'] // Разрешить заголовки
}));

app.use(bodyParser.json());

/*for gruzy*/
app.use('/test', dataRouter);
app.use('/reason', reasonRouter);

/* for market place*/
app.use('/market/tasks', tasksController);

/* for excel download*/
app.use('/download/excel', fileController);
app.use('/download/files', filesRouter);
app.use('/download', downloadController);

app.use('/export', exportRoutes);
app.use('/send', updateRoutes);

app.use('/article', articleRoutes);
app.use('/auth', authRoutes);
app.use('/srok', srokRoutes);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
