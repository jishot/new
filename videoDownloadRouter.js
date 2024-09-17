const express = require('express');
const puppeteer = require('puppeteer');
const archiver = require('archiver');
const axios = require('axios');
const { PassThrough } = require('stream');
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

        const response = await axios.get(absoluteUrl, { responseType: 'stream' });
        const videoFileName = `video_${absoluteUrl.split('/').pop()}.mp4`;

        archive.append(response.data, { name: videoFileName });
    }

    archive.finalize();

    await browser.close();
});

module.exports = router;
