const express = require('express');
const bodyParser = require('body-parser');
const dataRouter = require('./routes/data');
const reasonRouter = require('./routes/reason');
const logger = require('./utils/logger');

const app = express();
const port = 3005;

app.use(bodyParser.json());

app.use('/data', dataRouter);
app.use('/reason', reasonRouter);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});