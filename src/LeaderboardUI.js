/**
 * LeaderboardUI.js
 * DOM overlays for (1) entering a player name before the first game, and
 * (2) viewing the top-scores leaderboard. Kept as DOM for accessibility and
 * easy text input.
 */

export class LeaderboardUI {
  /**
   * @param {Leaderboard} leaderboard
   */
  constructor(leaderboard) {
    this.leaderboard = leaderboard;
    this._buildNamePrompt();
    this._buildBoard();
  }

  // ---- Name prompt -------------------------------------------------------

  _buildNamePrompt() {
    this.nameOverlay = document.createElement('div');
    this.nameOverlay.className = 'lb-overlay';
    this.nameOverlay.id = 'name-overlay';
    this.nameOverlay.hidden = true;

    const panel = document.createElement('div');
    panel.className = 'lb-panel';

    const title = document.createElement('h2');
    title.textContent = 'Enter Your Name';
    panel.appendChild(title);

    const sub = document.createElement('p');
    sub.className = 'lb-sub';
    sub.textContent = 'Used to track your scores on the leaderboard.';
    panel.appendChild(sub);

    this.input = document.createElement('input');
    this.input.type = 'text';
    this.input.className = 'lb-input';
    this.input.maxLength = 12;
    this.input.placeholder = 'PLAYER';
    this.input.autocomplete = 'off';
    panel.appendChild(this.input);

    this.error = document.createElement('p');
    this.error.className = 'lb-error';
    panel.appendChild(this.error);

    const startBtn = document.createElement('button');
    startBtn.className = 'lb-button';
    startBtn.textContent = 'Start Playing';
    panel.appendChild(startBtn);

    this.nameOverlay.appendChild(panel);
    document.getElementById('stage').appendChild(this.nameOverlay);

    const submit = () => {
      const name = this._sanitize(this.input.value);
      if (!name) {
        this.error.textContent = 'Please enter at least 1 character.';
        return;
      }
      this.leaderboard.setName(name);
      this._hideName();
      if (this._onName) this._onName(name);
    };

    startBtn.addEventListener('click', submit);
    this.input.addEventListener('keydown', (e) => {
      e.stopPropagation(); // don't let Space/Enter flap the bird
      if (e.code === 'Enter') submit();
    });
  }

  _sanitize(raw) {
    return (raw || '')
      .replace(/[^\p{L}\p{N} _-]/gu, '')
      .trim()
      .slice(0, 12);
  }

  /**
   * Shows the name prompt and resolves via callback with the chosen name.
   * If a name is already stored, resolves immediately without showing UI.
   * @param {(name:string)=>void} onName
   */
  requestName(onName) {
    const saved = this.leaderboard.getSavedName();
    if (saved) {
      onName(saved);
      return;
    }
    this._onName = onName;
    this.error.textContent = '';
    this.input.value = '';
    this.nameOverlay.hidden = false;
    requestAnimationFrame(() => {
      this.nameOverlay.classList.add('visible');
      this.input.focus();
    });
  }

  /** Opens the name prompt to change an existing name. */
  editName(currentName, onName) {
    this._onName = onName;
    this.error.textContent = '';
    this.input.value = currentName || '';
    this.nameOverlay.hidden = false;
    requestAnimationFrame(() => {
      this.nameOverlay.classList.add('visible');
      this.input.focus();
      this.input.select();
    });
  }

  _hideName() {
    this.nameOverlay.classList.remove('visible');
    this.nameOverlay.hidden = true;
  }

  // ---- Leaderboard view --------------------------------------------------

  _buildBoard() {
    this.boardOverlay = document.createElement('div');
    this.boardOverlay.className = 'lb-overlay';
    this.boardOverlay.id = 'board-overlay';
    this.boardOverlay.hidden = true;
    this.boardOverlay.addEventListener('click', (e) => {
      if (e.target === this.boardOverlay) this.hideBoard();
    });

    const panel = document.createElement('div');
    panel.className = 'lb-panel';

    const title = document.createElement('h2');
    title.textContent = 'Leaderboard';
    panel.appendChild(title);

    // Row 1: Local | Global
    const sourceTabs = document.createElement('div');
    sourceTabs.className = 'lb-tabs';
    this._tabLocal = document.createElement('button');
    this._tabLocal.className = 'lb-tab active';
    this._tabLocal.textContent = 'Local';
    this._tabGlobal = document.createElement('button');
    this._tabGlobal.className = 'lb-tab';
    this._tabGlobal.textContent = 'Global';
    sourceTabs.append(this._tabLocal, this._tabGlobal);
    panel.appendChild(sourceTabs);

    // Row 2: difficulty filters
    const DIFF_FILTERS = [
      { key: 'all',       label: 'All' },
      { key: 'easy',      label: 'Easy' },
      { key: 'normal',    label: 'Normal' },
      { key: 'hard',      label: 'Hard' },
      { key: 'nightmare', label: '☠' },
    ];
    const diffTabs = document.createElement('div');
    diffTabs.className = 'lb-tabs lb-diff-tabs';
    this._diffBtns = {};
    DIFF_FILTERS.forEach(({ key, label }) => {
      const btn = document.createElement('button');
      btn.className = 'lb-tab lb-diff-tab';
      btn.textContent = label;
      btn.dataset.diff = key;
      diffTabs.appendChild(btn);
      this._diffBtns[key] = btn;
    });
    panel.appendChild(diffTabs);

    this.list = document.createElement('ol');
    this.list.className = 'lb-list';
    panel.appendChild(this.list);

    const close = document.createElement('button');
    close.className = 'lb-button';
    close.textContent = 'Close';
    close.addEventListener('click', () => this.hideBoard());
    panel.appendChild(close);

    this.boardOverlay.appendChild(panel);
    document.getElementById('stage').appendChild(this.boardOverlay);

    // Source tab clicks
    this._tabLocal.addEventListener('click', () => {
      this._tabLocal.classList.add('active');
      this._tabGlobal.classList.remove('active');
      this._isGlobal = false;
      this._refresh();
    });
    this._tabGlobal.addEventListener('click', () => {
      this._tabGlobal.classList.add('active');
      this._tabLocal.classList.remove('active');
      this._isGlobal = true;
      this._refresh();
    });

    // Difficulty filter clicks
    diffTabs.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-diff]');
      if (!btn) return;
      this._activeDiff = btn.dataset.diff;
      this._updateDiffTabs();
      this._refresh();
    });
  }

  _updateDiffTabs() {
    Object.entries(this._diffBtns).forEach(([key, btn]) => {
      btn.classList.toggle('active', key === this._activeDiff);
    });
  }

  showBoard(highlightName, currentDifficulty = 'normal') {
    this._highlightName = highlightName;
    this._activeDiff = currentDifficulty;
    this._isGlobal = false;
    this._tabLocal.classList.add('active');
    this._tabGlobal.classList.remove('active');
    this._updateDiffTabs();
    this._refresh();
    this.boardOverlay.hidden = false;
    requestAnimationFrame(() => this.boardOverlay.classList.add('visible'));
  }

  _refresh() {
    if (this._isGlobal) {
      this._renderGlobal();
    } else {
      this._renderLocal();
    }
  }

  _renderLocal() {
    const top = this.leaderboard.getTop(this._activeDiff);
    this.list.innerHTML = '';
    if (top.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'lb-empty';
      empty.textContent = 'No scores yet — play a round!';
      this.list.appendChild(empty);
    } else {
      top.forEach((entry, i) => {
        const li = this._makeEntry(i + 1, entry.name, entry.score, entry.name === this._highlightName);
        this.list.appendChild(li);
      });
    }
  }

  async _renderGlobal() {
    this.list.innerHTML = '';
    const loading = document.createElement('li');
    loading.className = 'lb-empty';
    loading.textContent = 'Loading...';
    this.list.appendChild(loading);

    const diff = this._activeDiff === 'all' ? null : this._activeDiff;
    const { entries, configured } = await this.leaderboard.fetchGlobal(20, diff);
    this.list.innerHTML = '';

    if (!configured) {
      const msg = document.createElement('li');
      msg.className = 'lb-empty';
      msg.textContent = 'Global board not set up yet.';
      this.list.appendChild(msg);
      return;
    }
    if (entries.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'lb-empty';
      empty.textContent = 'No scores for this mode yet!';
      this.list.appendChild(empty);
      return;
    }
    entries.forEach((entry, i) => {
      const showBadge = this._activeDiff === 'all';
      const li = this._makeEntry(i + 1, entry.name, entry.score, entry.name === this._highlightName, showBadge ? entry.difficulty : null);
      this.list.appendChild(li);
    });
  }

  _makeEntry(rank, name, score, isMe, difficulty) {
    const li = document.createElement('li');
    li.className = 'lb-entry';
    if (isMe) li.classList.add('me');
    const rankEl = document.createElement('span');
    rankEl.className = 'lb-rank';
    rankEl.textContent = String(rank);
    const nameEl = document.createElement('span');
    nameEl.className = 'lb-name';
    nameEl.textContent = name;
    const scoreEl = document.createElement('span');
    scoreEl.className = 'lb-score';
    scoreEl.textContent = String(score);
    li.append(rankEl, nameEl, scoreEl);
    if (difficulty && difficulty !== 'normal') {
      const badge = document.createElement('span');
      badge.className = 'lb-diff-badge';
      badge.textContent = difficulty === 'nightmare' ? '☠' : difficulty[0].toUpperCase();
      li.appendChild(badge);
    }
    return li;
  }

  hideBoard() {
    this.boardOverlay.classList.remove('visible');
    this.boardOverlay.hidden = true;
  }

  get isNameOpen() {
    return !this.nameOverlay.hidden;
  }
  get isBoardOpen() {
    return !this.boardOverlay.hidden;
  }
}
