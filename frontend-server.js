/**
 * Simple frontend server for BookClub
 * - Serves static files from /app/dist
 * - Proxies /api/* requests to backend
 * - Fully configurable via environment variables
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createProxyMiddleware } from 'http-proxy-middleware';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 6311;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:6310';

console.log('Frontend Server Configuration:');
console.log(`  PORT: ${PORT}`);
console.log(`  BACKEND_URL: ${BACKEND_URL}`);
console.log(`  Static files: ${path.join(__dirname, 'dist')}`);

// Proxy API requests to backend
app.use('/api', createProxyMiddleware({
  target: BACKEND_URL,
  changeOrigin: true,
  logLevel: 'info',
  onProxyReq: (proxyReq, req) => {
    console.log(`[Proxy] ${req.method} ${req.url} -> ${BACKEND_URL}${req.url}`);
  },
  onError: (err, req, res) => {
    console.error(`[Proxy Error] ${err.message}`);
    res.status(502).json({ error: 'Backend not available' });
  }
}));

// Serve static files
app.use(express.static(path.join(__dirname, 'dist')));

// Handle React Router - send all non-API requests to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✓ Frontend server running on http://0.0.0.0:${PORT}`);
  console.log(`✓ Proxying /api/* to ${BACKEND_URL}`);
});

