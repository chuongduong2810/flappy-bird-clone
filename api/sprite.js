import fs from 'fs';
import path from 'path';
import { safeFilename, readSpriteFromRedis, isKvConfigured } from './_lib.js';

const SPRITES_DIR = path.join(process.cwd(), 'public', 'assets', 'sprites');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const file = safeFilename(req.query?.file);
  if (!file) return res.status(400).json({ error: 'Missing file parameter' });

  try {
    const diskPath = path.join(SPRITES_DIR, file);
    if (fs.existsSync(diskPath)) {
      const buf = fs.readFileSync(diskPath);
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      return res.send(buf);
    }

    if (isKvConfigured()) {
      const base64 = await readSpriteFromRedis(file);
      if (base64) {
        const buf = Buffer.from(base64, 'base64');
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'public, max-age=3600');
        return res.send(buf);
      }
    }

    return res.status(404).json({ error: 'Sprite not found' });
  } catch (err) {
    console.error('Sprite API error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
