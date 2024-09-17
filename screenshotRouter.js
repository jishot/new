const express = require('express');
const puppeteer = require('puppeteer');
const fs = require('fs');
const archiver = require('archiver');

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
    await page.setViewport({ width: 1920, height: 1080 });
  
    const screenshot = await page.screenshot({ fullPage: true });
    const htmlContent = await page.content();

    const archive = archiver('zip', { zlib: { level: 9 } });
    const output = fs.createWriteStream(__dirname + '/screenshot.zip');

    archive.pipe(output);
    archive.append(screenshot, { name: 'screenshot.png' });
    archive.append(htmlContent, { name: 'screenshot.html' });
    archive.finalize();

    output.on('close', () => {
      res.download(__dirname + '/screenshot.zip', 'screenshot.zip', () => {
        fs.unlinkSync(__dirname + '/screenshot.zip');
      });
    });

    await browser.close();
  } catch (error) {
    console.error(error);
    res.status(500).send('An error occurred');
  }
});

module.exports = router;
