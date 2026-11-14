const path = require('path');

module.exports = {
  reactStrictMode: true,
  output: 'standalone',
  experimental: {
    // @react-pdf/renderer uses Node-only APIs (canvas, stream) — must not be bundled
    serverComponentsExternalPackages: ['@react-pdf/renderer'],
  },
  webpack: (config) => {
    config.resolve.alias['@'] = path.resolve(__dirname, 'app');
    return config;
  },
};