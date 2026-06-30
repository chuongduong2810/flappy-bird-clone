import path from 'path';
import {
  setCors,
  isAdminAuthorized,
  getAdminSecret,
  loadAllCharacters,
  saveCharactersToRedis,
  saveSpriteToRedis,
  writeSpriteToDisk,
  writeCharactersJson,
  validateCharacter,
  safeFilename,
  safeCharacterId,
  isKvConfigured,
} from './_lib.js';

const STATIC_JSON = path.join(process.cwd(), 'public', 'characters.json');
const SPRITES_DIR = path.join(process.cwd(), 'public', 'assets', 'sprites');

function canWriteDisk() {
  return !process.env.VERCEL;
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const characters = await loadAllCharacters(STATIC_JSON);
      return res.json({ characters, configured: isKvConfigured() });
    }

    if (!isAdminAuthorized(req)) {
      const hint = getAdminSecret()
        ? 'Invalid or missing admin token'
        : 'ADMIN_SECRET env var is not configured';
      return res.status(401).json({ error: hint });
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      const char = validateCharacter(body);
      if (!char) return res.status(400).json({ error: 'Invalid character data' });

      const sprites = body.sprites || {};
      for (const frame of ['up', 'mid', 'down']) {
        const entry = sprites[frame];
        if (!entry?.data) continue;
        const filename = safeFilename(entry.filename || char[frame]);
        char[frame] = filename;
        const base64 = String(entry.data).replace(/^data:image\/\w+;base64,/, '');
        if (isKvConfigured()) {
          await saveSpriteToRedis(filename, base64);
        }
        if (canWriteDisk()) {
          writeSpriteToDisk(SPRITES_DIR, filename, base64);
        }
      }

      const existing = await loadAllCharacters(STATIC_JSON);
      const idx = existing.findIndex((c) => c.id === char.id);
      if (idx >= 0) existing[idx] = char;
      else existing.push(char);

      if (isKvConfigured()) {
        await saveCharactersToRedis(existing);
      } else if (!canWriteDisk()) {
        return res.status(503).json({ error: 'Redis not configured — cannot persist on server' });
      }
      if (canWriteDisk()) {
        writeCharactersJson(STATIC_JSON, existing);
      }

      return res.json({ ok: true, character: char });
    }

    if (req.method === 'DELETE') {
      const id = safeCharacterId(req.query?.id || req.body?.id);
      if (!id) return res.status(400).json({ error: 'Missing character id' });

      const protectedIds = ['yellow', 'red', 'blue'];
      if (protectedIds.includes(id)) {
        return res.status(400).json({ error: 'Cannot delete default characters' });
      }

      const existing = await loadAllCharacters(STATIC_JSON);
      const filtered = existing.filter((c) => c.id !== id);
      if (filtered.length === existing.length) {
        return res.status(404).json({ error: 'Character not found' });
      }

      if (isKvConfigured()) await saveCharactersToRedis(filtered);
      else if (!canWriteDisk()) {
        return res.status(503).json({ error: 'Redis not configured — cannot persist on server' });
      }
      if (canWriteDisk()) writeCharactersJson(STATIC_JSON, filtered);
      return res.json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Characters API error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
