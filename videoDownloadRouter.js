const express = require('express');
const puppeteer = require('puppeteer');
const archiver = require('archiver');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

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

    const tempDir = path.join(__dirname, 'temp_videos');
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir);
    }

    for (const videoUrl of videoUrls) {
        const videoResponse = await axios.get(videoUrl, { responseType: 'stream' });
        const videoFileName = `video_${videoUrl.split('/').pop()}.mp4`;
        const tempFilePath = path.join(tempDir, videoFileName);

        const writer = fs.createWriteStream(tempFilePath);
        videoResponse.data.pipe(writer);

        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });

        archive.append(fs.createReadStream(tempFilePath), { name: videoFileName });
    }

    archive.finalize();

    await browser.close();
});

module.exports = router;
