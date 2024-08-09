const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const express = require('express');
const archiver = require('archiver');

const app = express();
const port = 3000;

// Serve static files from the public directory
app.use(express.static('public'));

// Serve index.html as the default file
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

app.use(express.json());

app.get('/screenshot', async (req, res) => {
  const url = req.query.url;

  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    await page.goto(url);
    // Take screenshot of the full page
    const screenshot = await page.screenshot({ fullPage: true });

    await browser.close();

    res.setHeader('Content-Type', 'image/png');
    res.send(screenshot);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'Failed to take screenshot' });
  }
});

app.get('/search', async (req, res) => {
  const query = req.query.query;

  if (!query) {
    return res.status(400).send({ error: 'Query parameter is missing' });
  }

  try {
    const { zip, resultsJson } = await searchGoogle(query);

    const zipStream = fs.createReadStream(path.join(__dirname, 'search_results.zip'));

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename=search_results.zip');

    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.on('error', (err) => {
      res.status(500).send({ error: err.message });
    });

    archive.on('end', () => {
      fs.unlinkSync(path.join(__dirname, 'search_results.zip'));
      fs.unlinkSync(path.join(__dirname, 'results.json'));
    });

    archive.pipe(res);
    archive.append(zipStream, { name: 'search_results.png' });
    archive.file(path.join(__dirname, 'results.json'), { name: 'results.json' });
    archive.finalize();
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'Failed to search Google' });
  }
});

const searchGoogle = async (query) => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  try {
    await page.goto('https://www.google.com');
    
    await page.type('input', query);
    await page.keyboard.press('Enter');
    
    await page.waitForNavigation();
    
    const searchResults = await page.$$eval('div.g', elements => elements.map(element => {
      const linkElement = element.querySelector('a');
      const descriptionElement = element.querySelector('div.VwiC3b > div');
      return {
        link: linkElement ? linkElement.href : null,
        description: descriptionElement ? descriptionElement.textContent.trim() : null
      };
    });
    
    await page.screenshot({ path: 'search_results.png', fullPage: true });
    
    await browser.close();
    
    return {
      zip: await createZip(),
      resultsJson: JSON.stringify(searchResults)
    };
  } catch (error) {
    console.error(error);
    await browser.close();
    throw error;
  }
};
  
async function createZip() {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(path.join(__dirname, 'search_results.zip'));
    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.on('error', (err) => reject(err));
    archive.on('finish', () => {
      console.log('Zip file created successfully.');
      resolve(output);
    });

    archive.pipe(output);
    archive.glob('search_results.png');
    archive.file(path.join(__dirname, 'results.json'), { name: 'results.json' });
    archive.finalize();

    // Add logging for file creation
    console.log('Creating results.json file...');
    fs.writeFileSync(path.join(__dirname, 'results.json'), 'Sample results');
  });
}
  
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
