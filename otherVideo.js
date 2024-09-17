const express = require('express');
const fs = require('fs');
const archiver = require('archiver');

const router = express.Router();

router.get('/', async (req, res) => {
  const { videoPath } = req.query;

  if (!videoPath) {
    return res.status(400).send('Missing videoPath parameter');
  }

  try {
    const videoFileName = videoPath.split('/').pop(); // Extracting the file name from the path

    const output = fs.createWriteStream(__dirname + `/${videoFileName}`);
    const input = fs.createReadStream(videoPath);

    input.pipe(output);

    output.on('finish', () => {
      const archive = archiver('zip', { zlib: { level: 9 } });
      const outputZip = fs.createWriteStream(__dirname + '/video.zip');

      archive.pipe(outputZip);
      archive.append(fs.createReadStream(__dirname + `/${videoFileName}`), { name: videoFileName });
      archive.finalize();

      outputZip.on('close', () => {
        res.download(__dirname + '/video.zip', 'video.zip', () => {
          fs.unlinkSync(__dirname + '/video.zip');
          fs.unlinkSync(__dirname + `/${videoFileName}`);
        });
      });
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('An error occurred');
  }
});

module.exports = router;
