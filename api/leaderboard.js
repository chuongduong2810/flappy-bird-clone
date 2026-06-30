import { Redis } from '@upstash/redis';

const VALID_DIFFS = ['easy', 'normal', 'hard', 'nightmare'];
const MAX_ENTRIES = 50;

// One sorted set per difficulty mode for clean per-mode boards.
function kvKey(difficulty) {
  const d = VALID_DIFFS.includes(difficulty) ? difficulty : 'normal';
  return `flappy:lb:v2:${d}`;
}

function isKvConfigured() {
  return !!(process.env.flappybase_KV_REST_API_URL && process.env.flappybase_KV_REST_API_TOKEN);
}

function getRedis() {
  return new Redis({
    url: process.env.flappybase_KV_REST_API_URL,
    token: process.env.flappybase_KV_REST_API_TOKEN,
  });
}

function parseMember(m) {
  if (m && typeof m === 'object') return m;
  try { return JSON.parse(String(m)); } catch { return null; }
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
      const diff = req.query?.difficulty || null;
      const redis = getRedis();

      let entries;
      if (!diff || diff === 'all') {
        // Merge all difficulty boards, re-sort, return top N.
        const results = await Promise.all(
          VALID_DIFFS.map((d) => redis.zrange(kvKey(d), 0, MAX_ENTRIES - 1, { rev: true }))
        );
        entries = results.flat().map(parseMember).filter(Boolean);
        entries.sort((a, b) => b.score - a.score);
        entries = entries.slice(0, limit);
      } else {
        const raw = await redis.zrange(kvKey(diff), 0, limit - 1, { rev: true });
        entries = raw.map(parseMember).filter(Boolean);
      }

      return res.json({ entries, configured: true });
    }

    if (req.method === 'POST') {
      const { name, score, difficulty } = req.body || {};
      const numScore = Number(score);
      if (!name || !Number.isFinite(numScore) || numScore < 0 || numScore > 9999) {
        return res.status(400).json({ error: 'Invalid payload' });
      }
      const safeName = String(name).replace(/[^\p{L}\p{N} _-]/gu, '').trim().slice(0, 12);
      if (!safeName) return res.status(400).json({ error: 'Invalid name' });

      const diff = VALID_DIFFS.includes(difficulty) ? difficulty : 'normal';
      const entry = { name: safeName, score: Math.floor(numScore), difficulty: diff, date: Date.now() };
      const key = kvKey(diff);
      const redis = getRedis();
      await redis.zadd(key, { score: entry.score, member: JSON.stringify(entry) });
      const total = await redis.zcard(key);
      if (total > MAX_ENTRIES) {
        await redis.zremrangebyrank(key, 0, total - MAX_ENTRIES - 1);
      }
      return res.json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Leaderboard API error:', err);
    return res.status(500).json({ error: 'Storage error' });
  }
}
