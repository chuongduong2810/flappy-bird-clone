/**
 * characters.js
 * Loads the character catalog at runtime from the API (production) or
 * characters.json (static fallback). Keeps a module-level cache so ShopUI
 * and other consumers can read synchronously after the initial load.
 */

import { ALL_CHARACTERS } from './config.js';

const CHARACTERS_API = '/api/characters';
const CHARACTERS_JSON = 'characters.json';

/** @type {Array<{id:string,label:string,price:number,up:string,mid:string,down:string}>} */
let _cache = [];

export function getCharacters() {
  return _cache;
}

export function getFreeCharacterIds() {
  return _cache.filter((c) => c.price === 0).map((c) => c.id);
}

export function getCharacterById(id) {
  return _cache.find((c) => c.id === id);
}

/**
 * Fetches the catalog and populates the module cache.
 * @returns {Promise<typeof _cache>}
 */
export async function loadCharacters() {
  try {
    const res = await fetch(CHARACTERS_API, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.characters) && data.characters.length) {
        _cache = data.characters;
        return _cache;
      }
    }
  } catch {
    /* API unavailable — fall through to static JSON */
  }

  const res = await fetch(CHARACTERS_JSON, { cache: 'no-store' });
  if (res.ok) {
    const data = await res.json();
    _cache = data.characters ?? [];
  } else {
    _cache = [];
  }

  // Final safety net: never start with an empty catalog.
  if (!_cache.length) {
    _cache = ALL_CHARACTERS.slice();
  }
  return _cache;
}

/** Resolve the URL for a sprite file (static or API-served). */
export function spriteUrl(filename) {
  return `assets/sprites/${filename}`;
}
