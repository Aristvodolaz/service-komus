const express = require('express');
const bodyParser = require('body-parser');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');

/*for gruzy*/
const dataRouter = require('./routes/test');
const reasonRouter = require('./routes/reason');
const zapisRouter = require('./routes/privyazka')

/* for market place*/
const tasksController = require('./routes/market_place/tasks');
const otkazController = require('./routes/market_place/otkaz');
const tasksNewController = require('./routes/market_place/newTasks');
const srokNewController = require('./routes/srok');
const taskNameRouter = require('./routes/taskName');

/* for excel*/
const fileController = require('./routes/market_place/file');
const filesRouter = require('./routes/market_place/file');
const downloadController = require('./controllers/downloadController');
const downloadExcelController = require('./controllers/downloadExcelController');
const fileExcelController = require('./controllers/fileController');

const exportRoutes = require('./routes/export');
const updateRoutes = require('./routes/finish');
const handRoutes = require('./routes/hand');
const articleRoutes = require('./routes/market_place/article');
const authRoutes = require('./routes/market_place/auth');
const { updateSrokGodnosti } = require('./controllers/srokController');
const palletRoutes = require('./routes/pallet'); 


/* NETR*/
const netrRoutes = require('./routes/netr');

const logger = require('./utils/logger');

const app = express();
const port = 3005;

app.use(bodyParser.json());

// Добавляем маршрут для Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

/*for gruzy*/
// app.use('/srok', dataRouter);
app.use('/reason', reasonRouter);

/* for market place*/
app.use('/market/tasks', tasksController);
app.use('/market/tasks/name', taskNameRouter);
app.use('/market/new', tasksNewController);
app.use('/market/otkaz', otkazController);
app.use('/srok', srokNewController);
/* for excel download*/
app.use('/download/excel', fileController);
app.use('/list',downloadExcelController)
app.use('/download/files', filesRouter);
app.use('/download', downloadController);
app.use('/',fileExcelController);
app.use('/',palletRoutes);
app.use('/',handRoutes);
app.use('/',netrRoutes);

app.use('/export', exportRoutes);
app.use('/send', updateRoutes);

app.use('/article', articleRoutes);
app.use('/auth', authRoutes);
app.post('/srok', updateSrokGodnosti)
app.use('/privyazka', zapisRouter)


app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
}); 