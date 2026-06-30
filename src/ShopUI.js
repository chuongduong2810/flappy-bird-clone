/**
 * ShopUI.js
 * DOM overlay for the character shop. Players browse characters, buy with coins,
 * and equip their selection. Driven by CoinSystem and Settings.
 */

import { getCharacters, spriteUrl } from './characters.js';

export class ShopUI {
  /**
   * @param {CoinSystem} coinSystem
   * @param {Settings} settings
   * @param {(charId:string)=>void} onCharacterChange - called when a character is equipped
   */
  constructor(coinSystem, settings, onCharacterChange) {
    this.coins = coinSystem;
    this.settings = settings;
    this.onCharacterChange = onCharacterChange;
    this._build();
  }

  _build() {
    this.btn = document.createElement('button');
    this.btn.id = 'shop-btn';
    this.btn.setAttribute('aria-label', 'Character Shop');
    this._updateBtnLabel();
    this.btn.addEventListener('click', () => this.open());
    document.getElementById('stage').appendChild(this.btn);

    this.overlay = document.createElement('div');
    this.overlay.id = 'shop-overlay';
    this.overlay.hidden = true;
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close();
    });

    const panel = document.createElement('div');
    panel.id = 'shop-panel';

    const title = document.createElement('h2');
    title.textContent = 'Characters';
    panel.appendChild(title);

    this.balanceEl = document.createElement('div');
    this.balanceEl.className = 'shop-balance';
    panel.appendChild(this.balanceEl);

    this.grid = document.createElement('div');
    this.grid.className = 'shop-grid';
    panel.appendChild(this.grid);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'lb-button';
    closeBtn.textContent = 'Close';
    closeBtn.addEventListener('click', () => this.close());
    panel.appendChild(closeBtn);

    this.overlay.appendChild(panel);
    document.getElementById('stage').appendChild(this.overlay);

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Escape' && !this.overlay.hidden) this.close();
    });
  }

  _updateBtnLabel() {
    this.btn.textContent = `🪙 ${this.coins.getBalance()}`;
  }

  open() {
    this._render();
    this.overlay.hidden = false;
    requestAnimationFrame(() => this.overlay.classList.add('visible'));
  }

  close() {
    this.overlay.classList.remove('visible');
    this.overlay.hidden = true;
  }

  refresh() {
    this._updateBtnLabel();
    if (!this.overlay.hidden) this._render();
  }

  _render() {
    const characters = getCharacters();
    const equipped = this.settings.get('birdColor') ?? 'yellow';
    this.balanceEl.textContent = `🪙 ${this.coins.getBalance()} coins`;
    this.grid.innerHTML = '';

    for (const char of characters) {
      const owned = this.coins.isOwned(char.id);
      const isEquipped = equipped === char.id;

      const card = document.createElement('div');
      card.className = 'shop-card';
      if (isEquipped) card.classList.add('equipped');

      const img = document.createElement('img');
      img.src = spriteUrl(char.mid);
      img.className = 'shop-sprite';
      img.alt = char.label;
      img.onerror = () => {
        img.src = `/api/sprite?file=${encodeURIComponent(char.mid)}`;
      };
      card.appendChild(img);

      const name = document.createElement('div');
      name.className = 'shop-name';
      name.textContent = char.label;
      card.appendChild(name);

      const actionBtn = document.createElement('button');
      actionBtn.className = 'shop-action-btn';

      if (isEquipped) {
        actionBtn.textContent = 'Equipped';
        actionBtn.disabled = true;
        actionBtn.classList.add('active');
      } else if (owned) {
        actionBtn.textContent = 'Equip';
        actionBtn.addEventListener('click', () => {
          this.settings.set('birdColor', char.id);
          this.onCharacterChange(char.id);
          this._render();
        });
      } else {
        actionBtn.textContent = `Buy 🪙${char.price}`;
        if (this.coins.getBalance() < char.price) {
          actionBtn.disabled = true;
          actionBtn.classList.add('locked');
        }
        actionBtn.addEventListener('click', () => {
          if (this.coins.buy(char.id, char.price)) {
            this._updateBtnLabel();
            this._render();
          }
        });
      }
      card.appendChild(actionBtn);
      this.grid.appendChild(card);
    }
  }

  get isOpen() { return !this.overlay.hidden; }
}
