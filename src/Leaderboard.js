/**
 * Leaderboard.js
 * A simple local leaderboard persisted in localStorage. Stores the top N
 * scores with player names and timestamps, sorted descending by score.
 * Also remembers the last-used player name so returning players skip the
 * name prompt.
 */

const LEADERBOARD_KEY = 'flappy_leaderboard';
const NAME_KEY = 'flappy_player_name';
const MAX_ENTRIES = 40; // 10 per difficulty mode

export class Leaderboard {
  constructor() {
    this.entries = this._load();
  }

  _load() {
    try {
      const raw = localStorage.getItem(LEADERBOARD_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  _save() {
    try {
      localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(this.entries));
    } catch {
      /* storage unavailable */
    }
  }

  /** Returns the stored player name, or '' if none set yet. */
  getSavedName() {
    try {
      return localStorage.getItem(NAME_KEY) || '';
    } catch {
      return '';
    }
  }

  /** Persists the player name for future sessions. */
  setName(name) {
    try {
      localStorage.setItem(NAME_KEY, name);
    } catch {
      /* storage unavailable */
    }
  }

  /**
   * Adds a score for a player, keeping only the top MAX_ENTRIES.
   * Returns the 1-based rank of this entry, or null if it didn't make the list.
   */
  submit(name, score, difficulty = 'normal') {
    if (!name || score <= 0) return null;
    const entry = { name, score, difficulty, date: Date.now() };
    this.entries.push(entry);
    this.entries.sort((a, b) => b.score - a.score || a.date - b.date);
    this.entries = this.entries.slice(0, MAX_ENTRIES);
    this._save();
    // Return rank within the same difficulty.
    const diffEntries = this.getTop(difficulty);
    const rank = diffEntries.findIndex((e) => e.date === entry.date && e.name === entry.name);
    return rank === -1 ? null : rank + 1;
  }

  /** Asynchronously submit score to the global leaderboard API. Non-blocking. */
  submitGlobal(name, score, difficulty = 'normal') {
    if (!name || score <= 0) return;
    fetch('/api/leaderboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, score, difficulty }),
    }).catch(() => {}); // fire and forget
  }

  /** Fetch top entries from the global leaderboard API. Returns a promise. */
  async fetchGlobal(limit = 20, difficulty = null) {
    try {
      const params = new URLSearchParams({ limit: String(limit) });
      if (difficulty) params.set('difficulty', difficulty);
      const res = await fetch(`/api/leaderboard?${params}`);
      if (!res.ok) return { entries: [], configured: false };
      return await res.json();
    } catch {
      return { entries: [], configured: false };
    }
  }

  /**
   * Top entries filtered by difficulty, sorted descending.
   * Pass null/'all' to get the overall top across all modes.
   */
  getTop(difficulty = null, limit = 10) {
    const entries = (difficulty && difficulty !== 'all')
      ? this.entries.filter((e) => (e.difficulty || 'normal') === difficulty)
      : this.entries;
    return entries.slice(0, limit);
  }

  clear() {
    this.entries = [];
    this._save();
  }
}
