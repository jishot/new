const express = require('express');
const puppeteer = require('puppeteer');
const app = express();

app.get('/screenshot', async (req, res) => {
  const url = req.query.url;

  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.goto(url);
  //take screenshot of the full page
  const screenshot = await page.screenshot(
    {
      fullPage: true
    }
  );

  await browser.close();

  res.setHeader('Content-Type', 'image/png');
  res.send(screenshot);
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
