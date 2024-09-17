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

    page.on('response', async (response) => {
      const url = response.url();
      if (response.request().resourceType() === 'video') {
        videoBlobURLs.push(url);
      }
    });

    console.log('Navigating to the URL...');
    await page.goto(url);

    const downloadLink = await page.evaluate(() => {
      const downloadElement = document.querySelector('#tabDownload a');
      if (downloadElement) {
        const computedStyle = window.getComputedStyle(downloadElement);
        if (computedStyle && (computedStyle.display === 'none' || computedStyle.visibility === 'hidden')) {
          downloadElement.style.display = 'block'; // Make the element visible
        }
        return downloadElement.href;
      }
      return null;
    });

    if (downloadLink) {
      console.log('Found download link:', downloadLink);
      
      const response = await axios.get(downloadLink, { responseType: 'arraybuffer' });
      const videoData = response.data;

      fs.writeFileSync('video.mp4', Buffer.from(videoData));
      console.log('Video downloaded successfully');

      const archive = archiver('zip', { zlib: { level: 9 } });
      res.attachment('downloaded_video.zip');
      archive.pipe(res);
      archive.append(fs.createReadStream('video.mp4'), { name: 'video.mp4' });
      
      archive.finalize(function(err) {
        if (err) {
          console.error('Error finalizing archive:', err);
          res.status(500).send('Internal Server Error');
        } else {
          console.log('Archive finalized successfully');
          fs.unlinkSync('video.mp4'); // Delete the video file after archiving
          res.end(); // Close the response after archiving is completed
        }
      });
    } else {
      console.log('Download link not found on the page');
      res.status(404).send('Download link not found');
    }

    await browser.close();
    console.log('Puppeteer closed');
  } catch (error) {
    console.error(`An error occurred: ${error.message}`);
    res.status(500).send('Internal Server Error');
  }
});

module.exports = router;
