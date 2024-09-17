const express = require('express');
const puppeteer = require('puppeteer');
const archiver = require('archiver');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { URL } = require('url'); // Import the URL module

const router = express.Router();

router.get('/', async (req, res) => {
    const { url } = req.query;

    if (!url) {
        return res.status(400).send('Missing URL parameter');
    }

    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    await page.goto(url);

    const videoUrls = await page.evaluate(() => {
        const videoElements = document.querySelectorAll('.frame-block.thumb-block');
        return Array.from(videoElements).map((videoElement) => videoElement.querySelector('a').getAttribute('href'));
    });

    const archive = archiver('zip', { zlib: { level: 9 } });
    res.attachment('videos.zip');
    archive.pipe(res);

    for (let i = 0; i < videoUrls.length; i++) {
        const videoUrl = videoUrls[i];
        const absoluteUrl = new URL(videoUrl, url).href; // Convert relative URL to absolute URL
        const response = await axios.get(absoluteUrl, { responseType: 'arraybuffer' });

        const videoFileName = `video_${absoluteUrl.split('/').pop()}.mp4`;
        const tempFilePath = path.join(__dirname, `temp_${i}.mp4`);

        fs.writeFileSync(tempFilePath, response.data); // Save video data to temporary file
        console.log(`Saved video ${i + 1} to ${tempFilePath}`);

        const expectedVideoSize = response.headers['content-length'];
        const actualVideoSize = fs.statSync(tempFilePath).size;

        if (expectedVideoSize && expectedVideoSize != actualVideoSize) {
            console.error(`Video ${i + 1} size mismatch. Expected: ${expectedVideoSize}, Actual: ${actualVideoSize}`);
        }

        archive.file(tempFilePath, { name: videoFileName });
    }

    archive.finalize();

    await browser.close();
});

module.exports = router;
