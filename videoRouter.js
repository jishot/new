const express = require('express');
const fs = require('fs');
const archiver = require('archiver');
const ytdl = require('ytdl-core');

const router = express.Router();

router.get('/', async (req, res) => {
  const { videoUrl } = req.query;

  if (!videoUrl) {
    return res.status(400).send('Missing videoUrl parameter');
  }

  try {
    const videoInfo = await ytdl.getInfo(videoUrl);
    const videoTitle = videoInfo.videoDetails.title;
    const videoStream = ytdl(videoUrl);

    const output = fs.createWriteStream(__dirname + `/${videoTitle}.mp4`);
    videoStream.pipe(output);

    output.on('finish', () => {
      const archive = archiver('zip', { zlib: { level: 9 } });
      const outputZip = fs.createWriteStream(__dirname + '/video.zip');

      archive.pipe(outputZip);
      archive.append(fs.createReadStream(__dirname + `/${videoTitle}.mp4`), { name: `${videoTitle}.mp4` });
      archive.finalize();

      outputZip.on('close', () => {
        res.download(__dirname + '/video.zip', 'video.zip', () => {
          fs.unlinkSync(__dirname + '/video.zip');
          fs.unlinkSync(__dirname + `/${videoTitle}.mp4`);
        });
      });
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('An error occurred');
  }
});

module.exports = router;
