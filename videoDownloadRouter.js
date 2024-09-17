const express = require('express');
const puppeteer = require('puppeteer');
const archiver = require('archiver');
const fs = require('fs');
const axios = require('axios'); // Replace the import for node-fetch with axios
const ffmpeg = require('fluent-ffmpeg');

const router = express.Router();

router.get('/', async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).send('Missing URL parameter');
  }

  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    await page.goto(url);

    const videoBlobURLs = await page.evaluate(() => {
      const videos = Array.from(document.querySelectorAll('video'));
      return videos.map(video => video.src);
    });

    const archive = archiver('zip', { zlib: { level: 9 } });
    res.attachment('videos.zip');
    archive.pipe(res);

    for (let i = 0; i < videoBlobURLs.length; i++) {
      const videoBlobURL = videoBlobURLs[i];
      const response = await axios.get(videoBlobURL, { responseType: 'arraybuffer' }); // Use axios for making HTTP requests
      const videoData = response.data;

      fs.writeFileSync(`video_${i + 1}.webm`, Buffer.from(videoData));
      
      console.log(`Video ${i + 1} downloaded successfully`);

      ffmpeg(`video_${i + 1}.webm`)
        .output(`video_${i + 1}.mp4`)
        .on('end', () => {
          archive.append(fs.createReadStream(`video_${i + 1}.mp4`), { name: `video_${i + 1}.mp4` });
          console.log(`Video ${i + 1} converted successfully`);
          if (i === videoBlobURLs.length - 1) {
            archive.finalize();
            console.log('All videos downloaded and converted');
          }
        })
        .run();
    }

    await browser.close();
  } catch (error) {
    console.error(`An error occurred: ${error.message}`);
    res.status(500).send('Internal Server Error');
  }
});

module.exports = router;
