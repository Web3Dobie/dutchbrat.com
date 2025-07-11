const express = require('express');
const router = express.Router();
const { BlobServiceClient } = require('@azure/storage-blob');
const matter = require('gray-matter');

const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
const containerName = 'w3d-articles';
const markdownExtension = '.md';

router.get('/latest', async (req, res) => {
    try {
        const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
        const containerClient = blobServiceClient.getContainerClient(containerName);

        let latestBlob = null;
        let latestModified = null;

        for await (const blob of containerClient.listBlobsFlat()) {
            if (blob.name.endsWith(markdownExtension)) {
                if (!latestModified || blob.properties.lastModified > latestModified) {
                    latestBlob = blob;
                    latestModified = blob.properties.lastModified;
                }
            }
        }

        if (!latestBlob) {
            return res.status(404).json({ error: 'No markdown files found.' });
        }

        const blobClient = containerClient.getBlobClient(latestBlob.name);
        const downloadBlockBlobResponse = await blobClient.download();
        const downloaded = await streamToString(downloadBlockBlobResponse.readableStreamBody);

        const parsed = matter(downloaded);
        const content = parsed.content;

        const lines = content.split('\n').filter(line => line.trim() !== '');

        const titleLine = lines.find(line => line.startsWith('#'));
        const title = titleLine ? titleLine.replace(/^#+/, '').trim() : 'Untitled';

        const imageLine = lines.find(line => line.startsWith('!['));
        const imageMatch = imageLine?.match(/\((.*?)\)/);
        const image = imageMatch ? imageMatch[1] : null;

        const summary = lines.find(
            line =>
                !line.startsWith('#') &&
                !line.startsWith('![') &&
                !line.toLowerCase().startsWith('[gpt generation') &&
                line.trim() !== ''
        ) || '';

        res.json({
            title,
            summary,
            image,
            file: blobClient.url,
        });

    } catch (err) {
        console.error('Error in /api/latest:', err.message);
        res.status(500).json({ error: 'Server error fetching latest article' });
    }
});

router.get('/', async (req, res) => {
    try {
        const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
        const containerClient = blobServiceClient.getContainerClient(containerName);

        const articles = [];

        for await (const blob of containerClient.listBlobsFlat()) {
            if (blob.name.endsWith(markdownExtension)) {
                const blobClient = containerClient.getBlobClient(blob.name);
                const downloadResponse = await blobClient.download();
                const downloaded = await streamToString(downloadResponse.readableStreamBody);

                const parsed = matter(downloaded);
                const content = parsed.content;

                const lines = content.split('\n').filter(line => line.trim() !== '');
                const titleLine = lines.find(line => line.startsWith('#'));
                const title = titleLine ? titleLine.replace(/^#+/, '').trim() : 'Untitled';

                const imageLine = lines.find(line => line.startsWith('!['));
                const imageMatch = imageLine?.match(/\((.*?)\)/);
                const image = imageMatch ? imageMatch[1] : null;

                const summary = lines.find(
                    line =>
                        !line.startsWith('#') &&
                        !line.startsWith('![') &&
                        !line.toLowerCase().startsWith('[gpt generation') &&
                        line.trim() !== ''
                ) || '';

                articles.push({
                    id: blob.name.replace('.md', ''),
                    title,
                    summary,
                    image,
                    file: blobClient.url,
                    date: blob.properties.lastModified
                });
            }
        }

        // Sort by date descending
        articles.sort((a, b) => new Date(b.date) - new Date(a.date));

        res.json(articles);

    } catch (err) {
        console.error('Error in /api/articles:', err.message);
        res.status(500).json({ error: 'Server error fetching articles list' });
    }
});

async function streamToString(readableStream) {
    const chunks = [];
    for await (const chunk of readableStream) {
        chunks.push(chunk.toString());
    }
    return chunks.join('');
}

module.exports = router;
