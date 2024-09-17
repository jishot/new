const express = require('express');
const axios = require('axios');
const fs = require('fs');
const archiver = require('archiver');

const router = express.Router();

router.get('/', async (req, res) => {
  const { videoPath } = req.query;

  if (!videoPath) {
    return res.status(400).send('Missing videoPath parameter');
  }

  try {
    const response = await axios.get(`https://www.xvideos.com${videoPath}`, { responseType: 'stream' });
    const videoFileName = videoPath.split('/').pop();

    const output = fs.createWriteStream(__dirname + `/${videoFileName}.mp4`);
    response.data.pipe(output);

    output.on('finish', () => {
      const archive = archiver('zip', { zlib: { level: 9 } });
      const outputZip = fs.createWriteStream(__dirname + '/video.zip');

      archive.pipe(outputZip);
      archive.append(fs.createReadStream(__dirname + `/${videoFileName}.mp4`), { name: `${videoFileName}.mp4` });
      archive.finalize();

      outputZip.on('close', () => {
        res.download(__dirname + '/video.zip', 'video.zip', () => {
          fs.unlinkSync(__dirname + '/video.zip');
          fs.unlinkSync(__dirname + `/${videoFileName}.mp4`);
        });
      });
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('An error occurred');
  }
});

module.exports = router;
