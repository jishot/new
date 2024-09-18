const express = require('express');
const screenshotRouter = require('./screenshotRouter');
const searchRouter = require('./searchRouter');
const videoRouter = require('./videoRouter');
const otherVideo = require('./otherVideo');
const xvideosRouter = require('./xvideos');
const videoDownloadRouter = require('./videoDownloadRouter'); // Add this line
const app = express();

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});
app.use('/screenshot', screenshotRouter);
app.use('/search', searchRouter);
app.use('/ytvideo', videoRouter);
app.use('/othervideo', otherVideo);
app.use('/xvideos', xvideosRouter);
app.use('/downloadVideos', videoDownloadRouter); // Include the new router for video downloads

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
