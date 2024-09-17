const express = require('express');
const screenshotRouter = require('./screenshotRouter');
const searchRouter = require('./searchRouter');
const videoRouter = require('./videoRouter');
const otherVideo = require('./otherVideo');
const xvideosRouter = require('./xvideos');
const app = express();

app.use('/screenshot', screenshotRouter);
app.use('/search', searchRouter);
app.use('/ytvideo', videoRouter);
app.use('/othervideo', otherVideo);
app.use('/xvideos', xvideosRouter);
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
