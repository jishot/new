const express = require('express');
const puppeteer = require('puppeteer');
const archiver = require('archiver');
const fs = require('fs');
const axios = require('axios');
const ffmpeg = require('fluent-ffmpeg');

const router = express.Router();

router.get('/', async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).send('Missing URL parameter');
  }

  try {
    console.log('Launching Puppeteer...');
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    await page.setRequestInterception(true);

    const videoBlobURLs = [];
    page.on('request', interceptedRequest => {
      if (interceptedRequest.resourceType() === 'video') {
        videoBlobURLs.push(interceptedRequest.url());
      }
      interceptedRequest.continue();
    });

    console.log('Navigating to the URL...');
    await page.goto(url);

    const archive = archiver('zip', { zlib: { level: 9 } });
    res.attachment('videos.zip');
    archive.pipe(res);

    for (let i = 0; i < videoBlobURLs.length; i++) {
      const videoBlobURL = videoBlobURLs[i];
      console.log(`Downloading video ${i + 1}...`);
      const response = await axios.get(videoBlobURL, { responseType: 'arraybuffer' });
      const videoData = response.data;

      fs.writeFileSync(`video_${i + 1}.webm`, Buffer.from(videoData));
      
      console.log(`Video ${i + 1} downloaded successfully`);

      await new Promise((resolve, reject) => {
        ffmpeg(`video_${i + 1}.webm`)
          .output(`video_${i + 1}.mp4`)
          .on('end', () => {
            archive.append(fs.createReadStream(`video_${i + 1}.mp4`), { name: `video_${i + 1}.mp4` });
            console.log(`Video ${i + 1} converted successfully`);
            resolve();
          })
          .run();
      });
    }

    await browser.close();
    console.log('Puppeteer closed');
  } catch (error) {
    console.error(`An error occurred: ${error.message}`);
    res.status(500).send('Internal Server Error');
  }
});

module.exports = router;
