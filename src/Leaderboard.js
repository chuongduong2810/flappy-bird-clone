/**
 * Leaderboard.js
 * A simple local leaderboard persisted in localStorage. Stores the top N
 * scores with player names and timestamps, sorted descending by score.
 * Also remembers the last-used player name so returning players skip the
 * name prompt.
 */

const LEADERBOARD_KEY = 'flappy_leaderboard';
const NAME_KEY = 'flappy_player_name';
const MAX_ENTRIES = 10;

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
  submit(name, score) {
    if (!name || score <= 0) return null;
    const entry = { name, score, date: Date.now() };
    this.entries.push(entry);
    this.entries.sort((a, b) => b.score - a.score || a.date - b.date);
    this.entries = this.entries.slice(0, MAX_ENTRIES);
    this._save();
    const idx = this.entries.indexOf(entry);
    return idx === -1 ? null : idx + 1;
  }

  /** Top entries (already sorted). */
  getTop(limit = MAX_ENTRIES) {
    return this.entries.slice(0, limit);
  }

  clear() {
    this.entries = [];
    this._save();
  }
}
