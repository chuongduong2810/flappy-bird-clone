import { Redis } from '@upstash/redis';
import fs from 'fs';
import path from 'path';

const CHARACTERS_REDIS_KEY = 'flappy:characters';
const SPRITE_REDIS_PREFIX = 'flappy:sprite:';

export function isKvConfigured() {
  return !!(process.env.flappybase_KV_REST_API_URL && process.env.flappybase_KV_REST_API_TOKEN);
}

export function getRedis() {
  return new Redis({
    url: process.env.flappybase_KV_REST_API_URL,
    token: process.env.flappybase_KV_REST_API_TOKEN,
  });
}

export function getAdminSecret() {
  return process.env.ADMIN_SECRET || '';
}

export function isAdminAuthorized(req) {
  const secret = getAdminSecret();
  if (!secret) return false;
  const auth = req.headers?.authorization || req.headers?.Authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  return token === secret;
}

export function safeFilename(name) {
  return String(name).replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 80);
}

export function safeCharacterId(id) {
  return String(id).replace(/[^a-z0-9_]/g, '').slice(0, 32);
}

/** Read characters from Redis, or null if not stored. */
export async function readCharactersFromRedis() {
  if (!isKvConfigured()) return null;
  const redis = getRedis();
  const data = await redis.get(CHARACTERS_REDIS_KEY);
  if (!data) return null;
  if (Array.isArray(data)) return data;
  if (data.characters) return data.characters;
  return null;
}

/** Merge static JSON with Redis overrides (Redis wins for same id). */
export async function loadAllCharacters(staticPath) {
  let staticChars = [];
  try {
    const raw = fs.readFileSync(staticPath, 'utf8');
    staticChars = JSON.parse(raw).characters ?? [];
  } catch {
    /* no static file */
  }

  const dynamic = await readCharactersFromRedis();
  if (!dynamic?.length) return staticChars;

  const byId = new Map(staticChars.map((c) => [c.id, c]));
  for (const c of dynamic) byId.set(c.id, c);
  return [...byId.values()];
}

export async function saveCharactersToRedis(characters) {
  const redis = getRedis();
  await redis.set(CHARACTERS_REDIS_KEY, { characters, updatedAt: Date.now() });
}

export async function saveSpriteToRedis(filename, base64) {
  const redis = getRedis();
  await redis.set(`${SPRITE_REDIS_PREFIX}${filename}`, base64);
}

export async function readSpriteFromRedis(filename) {
  const redis = getRedis();
  return redis.get(`${SPRITE_REDIS_PREFIX}${filename}`);
}

export function writeSpriteToDisk(spritesDir, filename, base64) {
  fs.mkdirSync(spritesDir, { recursive: true });
  const buf = Buffer.from(base64, 'base64');
  fs.writeFileSync(path.join(spritesDir, filename), buf);
}

export function writeCharactersJson(jsonPath, characters) {
  fs.writeFileSync(jsonPath, JSON.stringify({ characters }, null, 2) + '\n');
}

export function validateCharacter(char) {
  const id = safeCharacterId(char?.id);
  const label = String(char?.label || '').trim().slice(0, 40);
  const price = Math.max(0, Math.min(9999, parseInt(char?.price, 10) || 0));
  const up = safeFilename(char?.up);
  const mid = safeFilename(char?.mid);
  const down = safeFilename(char?.down);
  if (!id || !label || !up || !mid || !down) return null;
  return { id, label, price, up, mid, down };
}

export function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}
