/**
 * CoinSystem.js
 * Manages the player's coin balance and character ownership, persisted in
 * localStorage. Free characters (price === 0) are always pre-owned.
 */

import { getFreeCharacterIds } from './characters.js';

const COINS_KEY = 'flappy_coins';
const OWNED_KEY = 'flappy_owned_chars';

export class CoinSystem {
  constructor() {
    this.balance = this._loadNum(COINS_KEY, 0);
    const freeIds = getFreeCharacterIds();
    this.owned = this._loadArr(OWNED_KEY, [...freeIds]);
    for (const id of freeIds) {
      if (!this.owned.includes(id)) this.owned.push(id);
    }
  }

  _loadNum(key, def) {
    try { const v = parseInt(localStorage.getItem(key), 10); return Number.isFinite(v) ? v : def; } catch { return def; }
  }

  _loadArr(key, def) {
    try { const v = JSON.parse(localStorage.getItem(key)); return Array.isArray(v) ? v : def; } catch { return def; }
  }

  _saveBalance() {
    try { localStorage.setItem(COINS_KEY, String(this.balance)); } catch {}
  }

  _saveOwned() {
    try { localStorage.setItem(OWNED_KEY, JSON.stringify(this.owned)); } catch {}
  }

  getBalance() { return this.balance; }

  getOwned() { return [...this.owned]; }

  isOwned(id) { return this.owned.includes(id); }

  addCoins(n) {
    this.balance += n;
    this._saveBalance();
  }

  buy(id, price) {
    if (this.isOwned(id)) return true;
    if (this.balance < price) return false;
    this.balance -= price;
    this.owned.push(id);
    this._saveBalance();
    this._saveOwned();
    return true;
  }

  cheatUnlimitedCoins() {
    this.balance = 9999;
    this._saveBalance();
  }
}
