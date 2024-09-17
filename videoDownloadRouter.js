const express = require('express');
const puppeteer = require('puppeteer');
const archiver = require('archiver');
const cheerio = require('cheerio');
const got = require('got');
const { PassThrough } = require('stream');
const { URL } = require('url');

const router = express.Router();

router.get('/', async (req, res) => {
    const { url } = req.query;

    if (!url) {
        return res.status(400).send('Missing URL parameter');
    }

    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    await page.goto(url);

    const htmlContent = await page.content();
    const $ = cheerio.load(htmlContent);
    
    const videoUrls = [];
    $('video').each((index, element) => {
        const videoSrc = $(element).attr('src');
        if (videoSrc) {
            videoUrls.push(videoSrc);
        }
    });

    const archive = archiver('zip', { zlib: { level: 9 } });
    res.attachment('videos.zip');
    archive.pipe(res);

    for (let i = 0; i < videoUrls.length; i++) {
        const videoUrl = videoUrls[i];

        const videoFileName = `video_${i + 1}.mp4`;

        const videoStream = got.stream(videoUrl);
        archive.append(videoStream, { name: videoFileName });
    }

    archive.finalize();

    await browser.close();
});

module.exports = router;
