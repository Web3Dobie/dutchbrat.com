// server.ts
import express, { Request, Response } from 'express';
import next from 'next';
import { parse } from 'url';
import articleRoutes from './routes/articles';
import latestTweetRouter from './routes/latestTweet';

const fs = require('fs');
console.log('CWD:', process.cwd());
console.log('__dirname:', __dirname);

try {
    const files = fs.readdirSync(__dirname + '/routes');
    console.log('FILES IN ROUTES:', files);
} catch (err) {
    console.log('COULD NOT LIST ROUTES:', err);
}

try {
    require('./routes/latestTweet');
    console.log('LATESTTWEET REQUIRED!');
} catch (err) {
    console.log('FAILED TO REQUIRE LATESTTWEET:', err);
}

const port = parseInt(process.env.PORT || '3000', 10);
const dev = process.env.NODE_ENV !== 'production';

const nextApp = next({ dev, dir: '../frontend' });
const handle = nextApp.getRequestHandler();

nextApp.prepare().then(() => {
    const server = express();

    // Mount custom API routes
    server.use('/api/articles', articleRoutes);
    server.use('/api/latest-tweet', latestTweetRouter);

    // Let Next.js handle everything else
    server.all('*', (req: Request, res: Response) => {
        const parsedUrl = parse(req.url, true);
        return handle(req, res, parsedUrl);
    });

    server.listen(port, () => {
        console.log(`✅ Server running on http://localhost:${port}`);
    });
});


