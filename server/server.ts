// server.ts
import express, { Request, Response } from 'express';
import next from 'next';
import { parse } from 'url';
import articleRoutes from './routes/articles.js';       // Note the .js extension for ESM compiled files
import latestTweetRouter from './routes/latestTweet.js'; // Note the .js extension for ESM compiled files

// If you need to list files in 'routes' dir (optional, for debug)
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('CWD:', process.cwd());
console.log('__dirname:', __dirname);

try {
    const files = fs.readdirSync(path.join(__dirname, 'routes'));
    console.log('FILES IN ROUTES:', files);
} catch (err) {
    console.log('COULD NOT LIST ROUTES:', err);
}

const port = parseInt(process.env.PORT || '3000', 10);
const dev = process.env.NODE_ENV !== 'production';

const createNext = next as unknown as (...args: any[]) => any;
const nextApp = createNext({ dev, dir: '../frontend' });
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
