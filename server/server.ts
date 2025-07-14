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
// In production, the frontend files are copied to the root deployment directory
const nextDir = dev
  ? path.resolve(__dirname, '../frontend')
  : path.resolve(__dirname, '..');  // Go up one level from dist/ to root

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
  console.error('  Error reading nextDir:', err instanceof Error ? err.message : String(err));
}

// Additional debug: Check for specific Next.js directories
console.log('🔍 Checking for Next.js directories:');
const checkDirs = ['app', '.next', 'public'];
for (const dir of checkDirs) {
  const fullPath = path.join(nextDir, dir);
  try {
    const exists = fs.existsSync(fullPath);
    console.log(`- ${dir}: ${exists ? 'EXISTS' : 'MISSING'} at ${fullPath}`);
    if (exists && fs.statSync(fullPath).isDirectory()) {
      const contents = fs.readdirSync(fullPath);
      console.log(`  Contents: ${contents.slice(0, 5).join(', ')}${contents.length > 5 ? '...' : ''}`);
    }
  } catch (err) {
    console.log(`- ${dir}: ERROR - ${err instanceof Error ? err.message : String(err)}`);
  }
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
      console.warn('Could not list routes directory:', err instanceof Error ? err.message : String(err));
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
    console.error('Failed to start server:', err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
})();