const express = require('express');
const puppeteer = require('puppeteer');
const fs = require('fs');
const archiver = require('archiver');

const router = express.Router();

router.get('/', async (req, res) => {
  // Code for searching Google and creating a zip file with screenshots and HTML files
  const { query } = req.query;

  if (!query) {
    return res.status(400).send('Missing query parameter');
  }

  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
  
    await page.goto(`https://www.google.com/search?q=${query}`);
    await page.setViewport({ width: 1920, height: 1080 });

    const screenshot = await page.screenshot({ fullPage: true });
    const htmlContent = await page.content();

    const archive = archiver('zip', { zlib: { level: 9 } });
    const output = fs.createWriteStream(__dirname + '/search_results.zip');

    archive.pipe(output);
    archive.append(screenshot, { name: 'screenshot.png' });
    archive.append(htmlContent, { name: 'search_results.html' });
    archive.finalize();

    output.on('close', () => {
      res.download(__dirname + '/search_results.zip', 'search_results.zip', () => {
        fs.unlinkSync(__dirname + '/search_results.zip');
      });
    });

    await browser.close();
  } catch (error) {
    console.error(error);
    res.status(500).send('An error occurred');
  }
});

module.exports = router;
