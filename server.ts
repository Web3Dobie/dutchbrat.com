// server.ts
import express, { Request, Response } from 'express';
import next from 'next';
import { parse } from 'url';
import articleRoutes from './routes/articles';

const port = parseInt(process.env.PORT || '3000', 10);
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();
const articleRoutes = require('./routes/articles');

app.prepare().then(() => {
    const server = express();

    // Custom API route
    server.use('/api/articles', articleRoutes);

    // Let Next.js handle everything else
    server.all('*', (req: Request, res: Response) => {
        const parsedUrl = parse(req.url, true);
        return handle(req, res, parsedUrl);
    });

    server.listen(port, (err?: Error) => {
        if (err) throw err;
        console.log(`✅ Server ready on http://localhost:${port}`);
    });
});

