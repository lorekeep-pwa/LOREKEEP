import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCoverApiMiddleware, loadServerEnv } from './cover-api-handler.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const env = loadServerEnv(rootDir);
const port = Number(env.COVER_PROXY_PORT || 8787);

const handler = createCoverApiMiddleware(rootDir);

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }
  void handler(req, res);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`LOREKEEP Cover Proxy listening on http://127.0.0.1:${port}`);
});
