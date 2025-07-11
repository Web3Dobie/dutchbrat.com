const express = require('express');
const next = require('next');
const { parse } = require('url');

const port = parseInt(process.env.PORT, 10) || 3000;
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

try {
    const articleRoutes = require('./routes/articles');
    server.use('/api/articles', articleRoutes);
} catch (err) {
    console.error("💥 Failed to load /api/articles:", err);
}

app.prepare().then(() => {
    const server = express();

    // Custom API routes
    server.use('/api/articles', articleRoutes);

    // Let Next.js handle everything else
    server.all('*', (req, res) => {
        const parsedUrl = parse(req.url, true);
        return handle(req, res, parsedUrl);
    });

    server.listen(port, (err) => {
        if (err) throw err;
        console.log(`✅ Server ready on http://localhost:${port}`);
    });
});
