// server.ts
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { parse } from 'url';

// Resolve ES module __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Determine environment
const dev = process.env.NODE_ENV !== 'production';
// Next.js directory: source folder in dev, root in production
const nextDir = dev
  ? path.resolve(__dirname, '../frontend')
  : process.cwd();

  // Add this debug code right after determining nextDir
console.log('🔍 Debug info:');
console.log('- dev:', dev);
console.log('- __dirname:', __dirname);
console.log('- process.cwd():', process.cwd());
console.log('- nextDir:', nextDir);
console.log('- Contents of nextDir:');
try {
  const contents = fs.readdirSync(nextDir);
  console.log('  ', contents);
} catch (err) {
  console.error('  Error reading nextDir:', err);
}

(async () => {
  try {
    // Dynamically import Next.js to ensure callable default
    const NextModule = await import('next');
    const NextApp = (NextModule as any).default || NextModule;
    const nextApp = NextApp({ dev, dir: nextDir });
    const handle = nextApp.getRequestHandler();

    // Prepare Next.js app
    await nextApp.prepare();

    const app = express();

    // Debug: list compiled route files
    try {
      const routesPath = path.join(__dirname, 'routes');
      const files = fs.readdirSync(routesPath);
      console.log('Loaded route files:', files);
    } catch (err) {
      console.warn('Could not list routes directory:', err);
    }

    // Mount custom API routes
    {
      const { default: articleRoutes } = await import('./routes/articles.js');
      app.use('/api/articles', articleRoutes);
    }
    {
      const { default: latestTweetRouter } = await import('./routes/latestTweet.js');
      app.use('/api/latest-tweet', latestTweetRouter);
    }

    // Handle all other requests with Next.js
    app.all('*', (req, res) => {
      const parsedUrl = parse(req.url, true);
      return handle(req, res, parsedUrl);
    });

    // Start Express server
    const port = parseInt(process.env.PORT || '3000', 10);
    app.listen(port, () => {
      console.log(`✅ Server running on http://localhost:${port} (dev=${dev})`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
})();