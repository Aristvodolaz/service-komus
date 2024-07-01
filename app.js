const express = require('express');
const bodyParser = require('body-parser');

/*for gruzy*/
const dataRouter = require('./routes/test');
const reasonRouter = require('./routes/reason');

/* for market place*/
const palletsController = require('./routes/market_place/pallets');
const palletTController = require('./routes/market_place/palletT');
const placeController = require('./routes/market_place/place');
const placesController = require('./routes/market_place/places');
const tasksController = require('./routes/market_place/tasks');
const taskController = require('./routes/market_place/task');

const logger = require('./utils/logger');

const app = express();
const port = 3005;

app.use(bodyParser.json());

/*for gruzy*/
app.use('/data', dataRouter);
app.use('/reason', reasonRouter);

/* for market place*/
app.use('/market/pallets', palletsController);
app.use('/market/places', placesController);
app.use('/market/palet', palletTController);
app.use('/market/place', placeController);
app.use('/market/tasks', tasksController);
app.use('/market/task', taskController);


app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});