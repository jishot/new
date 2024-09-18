const express = require('express');
const router = express.Router();
const axios = require('axios');
const fs = require('fs');
const archiver = require('archiver');

router.get('/', async (req, res) => {
    const { videoUrl } = req.query;

    if (!videoUrl) {
        return res.status(400).send('Video URL is required');
    }

    const response = await axios.get(videoUrl, { responseType: 'stream' });

    const zipFilePath = 'video.zip';
    const output = fs.createWriteStream(zipFilePath);
    const archive = archiver('zip', {
        zlib: { level: 9 } // set compression level
    });

    archive.pipe(output);
    archive.append(response.data, { name: 'video.mp4' });

    output.on('close', () => {
        res.download(zipFilePath, 'video.zip', () => {
            fs.unlinkSync(zipFilePath); // delete the temporary zip file after download
        });
    });

    archive.on('error', (err) => {
        console.error('Error creating zip file:', err);
        res.status(500).send('Error creating zip file');
    });

    archive.finalize();
});

module.exports = router;
