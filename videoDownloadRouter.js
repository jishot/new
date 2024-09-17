const express = require('express');
const puppeteer = require('puppeteer');
const archiver = require('archiver');
const fs = require('fs');
const fetch = require('node-fetch').default;
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
            const response = await fetch(videoBlobURL);
            const videoData = await response.arrayBuffer();

            fs.writeFileSync(`video_${i + 1}.webm`, Buffer.from(videoData));

            ffmpeg(`video_${i + 1}.webm`)
                .output(`video_${i + 1}.mp4`)
                .on('end', () => {
                    archive.append(fs.createReadStream(`video_${i + 1}.mp4`), { name: `video_${i + 1}.mp4` });
                    if (i === videoBlobURLs.length - 1) {
                        archive.finalize();
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
