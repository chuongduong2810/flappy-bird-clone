/**
 * CoinSystem.js
 * Manages the player's coin balance and character ownership, persisted in
 * localStorage. Yellow/red/blue birds are always free and pre-owned.
 */

const COINS_KEY = 'flappy_coins';
const OWNED_KEY = 'flappy_owned_chars';
const FREE_IDS = ['yellow', 'red', 'blue'];

export class CoinSystem {
  constructor() {
    this.balance = this._loadNum(COINS_KEY, 0);
    this.owned = this._loadArr(OWNED_KEY, [...FREE_IDS]);
    // Guarantee free chars are always present (migration safety).
    for (const id of FREE_IDS) {
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

  /**
   * Adds coins to the balance (e.g., earned by passing pipes).
   * @param {number} n
   */
  addCoins(n) {
    this.balance += n;
    this._saveBalance();
  }

  /**
   * Attempts to buy a character. Returns true on success, false if insufficient coins.
   * @param {string} id - character id
   * @param {number} price
   */
  buy(id, price) {
    if (this.isOwned(id)) return true;
    if (this.balance < price) return false;
    this.balance -= price;
    this.owned.push(id);
    this._saveBalance();
    this._saveOwned();
    return true;
  }

  /** Admin cheat: set balance to 9999. */
  cheatUnlimitedCoins() {
    this.balance = 9999;
    this._saveBalance();
  }
}
