// server.ts
import express, { Request, Response } from 'express';
import next from 'next';
import { parse } from 'url';
import articleRoutes from './routes/articles';
import latestTweetRouter from './routes/latestTweet';

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


