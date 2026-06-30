/**
 * Vite plugin: dev-time admin API that mirrors api/characters.js and api/sprite.js
 * so the admin page works locally without deploying to Vercel.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;
const STATIC_JSON = path.join(ROOT, 'public', 'characters.json');
const SPRITES_DIR = path.join(ROOT, 'public', 'assets', 'sprites');

function getDevSecret() {
  return process.env.ADMIN_SECRET || 'flappy-admin';
}

function isAuthorized(req) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  return token === getDevSecret();
}

function safeFilename(name) {
  return String(name).replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 80);
}

function safeCharacterId(id) {
  return String(id).replace(/[^a-z0-9_]/g, '').slice(0, 32);
}

function validateCharacter(char) {
  const id = safeCharacterId(char?.id);
  const label = String(char?.label || '').trim().slice(0, 40);
  const price = Math.max(0, Math.min(9999, parseInt(char?.price, 10) || 0));
  const up = safeFilename(char?.up);
  const mid = safeFilename(char?.mid);
  const down = safeFilename(char?.down);
  if (!id || !label || !up || !mid || !down) return null;
  return { id, label, price, up, mid, down };
}

function readCharacters() {
  try {
    const raw = fs.readFileSync(STATIC_JSON, 'utf8');
    return JSON.parse(raw).characters ?? [];
  } catch {
    return [];
  }
}

function writeCharacters(characters) {
  fs.mkdirSync(path.dirname(STATIC_JSON), { recursive: true });
  fs.writeFileSync(STATIC_JSON, JSON.stringify({ characters }, null, 2) + '\n');
}

function writeSprite(filename, base64) {
  fs.mkdirSync(SPRITES_DIR, { recursive: true });
  fs.writeFileSync(path.join(SPRITES_DIR, filename), Buffer.from(base64, 'base64'));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString() || '{}'));
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.end(JSON.stringify(data));
}

export function adminApiPlugin() {
  return {
    name: 'admin-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url, 'http://localhost');

        if (url.pathname === '/api/sprite') {
          if (req.method === 'OPTIONS') {
            res.statusCode = 200;
            res.end();
            return;
          }
          const file = safeFilename(url.searchParams.get('file'));
          const diskPath = path.join(SPRITES_DIR, file);
          if (file && fs.existsSync(diskPath)) {
            res.setHeader('Content-Type', 'image/png');
            res.setHeader('Cache-Control', 'public, max-age=3600');
            fs.createReadStream(diskPath).pipe(res);
            return;
          }
          sendJson(res, 404, { error: 'Sprite not found' });
          return;
        }

        if (url.pathname !== '/api/characters') return next();

        if (req.method === 'OPTIONS') {
          res.statusCode = 200;
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
          res.end();
          return;
        }

        try {
          if (req.method === 'GET') {
            sendJson(res, 200, { characters: readCharacters(), configured: false });
            return;
          }

          if (!isAuthorized(req)) {
            sendJson(res, 401, { error: 'Invalid or missing admin token' });
            return;
          }

          if (req.method === 'POST') {
            const body = await readBody(req);
            const char = validateCharacter(body);
            if (!char) {
              sendJson(res, 400, { error: 'Invalid character data' });
              return;
            }

            const sprites = body.sprites || {};
            for (const frame of ['up', 'mid', 'down']) {
              const entry = sprites[frame];
              if (!entry?.data) continue;
              const filename = safeFilename(entry.filename || char[frame]);
              char[frame] = filename;
              const base64 = String(entry.data).replace(/^data:image\/\w+;base64,/, '');
              writeSprite(filename, base64);
            }

            const existing = readCharacters();
            const idx = existing.findIndex((c) => c.id === char.id);
            if (idx >= 0) existing[idx] = char;
            else existing.push(char);
            writeCharacters(existing);
            sendJson(res, 200, { ok: true, character: char });
            return;
          }

          if (req.method === 'DELETE') {
            const body = req.method === 'DELETE' && url.searchParams.get('id')
              ? { id: url.searchParams.get('id') }
              : await readBody(req);
            const id = safeCharacterId(body?.id);
            const protectedIds = ['yellow', 'red', 'blue'];
            if (!id) {
              sendJson(res, 400, { error: 'Missing character id' });
              return;
            }
            if (protectedIds.includes(id)) {
              sendJson(res, 400, { error: 'Cannot delete default characters' });
              return;
            }
            const existing = readCharacters();
            const filtered = existing.filter((c) => c.id !== id);
            if (filtered.length === existing.length) {
              sendJson(res, 404, { error: 'Character not found' });
              return;
            }
            writeCharacters(filtered);
            sendJson(res, 200, { ok: true });
            return;
          }

          sendJson(res, 405, { error: 'Method not allowed' });
        } catch (err) {
          console.error('[admin-api]', err);
          sendJson(res, 500, { error: 'Server error' });
        }
      });
    },
  };
}
