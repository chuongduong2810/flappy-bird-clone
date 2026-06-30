import { Redis } from '@upstash/redis';

const KV_KEY = 'flappy:lb:v1';
const MAX_ENTRIES = 50;

function isKvConfigured() {
  return !!(process.env.flappybase_KV_REST_API_URL && process.env.flappybase_KV_REST_API_TOKEN);
}

function getRedis() {
  return new Redis({
    url: process.env.flappybase_KV_REST_API_URL,
    token: process.env.flappybase_KV_REST_API_TOKEN,
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!isKvConfigured()) {
    if (req.method === 'GET') return res.json({ entries: [], configured: false });
    return res.status(503).json({ error: 'Global leaderboard not configured' });
  }

  try {
    if (req.method === 'GET') {
      const limit = Math.min(parseInt(req.query?.limit || '20', 10), 50);
      // zrange with rev:true returns highest scores first
      const members = await getRedis().zrange(KV_KEY, 0, limit - 1, { rev: true });
      const entries = members.map((m) => {
        try { return JSON.parse(m); } catch { return null; }
      }).filter(Boolean);
      return res.json({ entries, configured: true });
    }

    if (req.method === 'POST') {
      const { name, score, difficulty } = req.body || {};
      if (!name || typeof score !== 'number' || score < 0 || score > 9999) {
        return res.status(400).json({ error: 'Invalid payload' });
      }
      const safeName = String(name).replace(/[^\p{L}\p{N} _-]/gu, '').trim().slice(0, 12);
      if (!safeName) return res.status(400).json({ error: 'Invalid name' });

      const entry = {
        name: safeName,
        score: Math.floor(score),
        difficulty: difficulty || 'normal',
        date: Date.now(),
      };
      // Use score as sorted set score; use JSON as unique member (timestamp ensures uniqueness)
      const redis = getRedis();
      await redis.zadd(KV_KEY, { score: entry.score, member: JSON.stringify(entry) });
      // Trim to MAX_ENTRIES (remove lowest scores)
      const total = await redis.zcard(KV_KEY);
      if (total > MAX_ENTRIES) {
        await redis.zremrangebyrank(KV_KEY, 0, total - MAX_ENTRIES - 1);
      }
      return res.json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Leaderboard API error:', err);
    return res.status(500).json({ error: 'Storage error' });
  }
}
