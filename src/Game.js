/**
 * Game.js
 * The orchestrator: owns the canvas, the fixed logical viewport, the game
 * state machine (Loading -> Ready -> Playing -> Game Over), the rAF loop with
 * delta-time updates, responsive scaling, input handling and all the juice
 * (camera shake, death flash, score pop, pipe-pass bounce, particles).
 */

import {
  VIEW,
  STATE,
  GROUND,
  JUICE,
  STORAGE_KEY,
} from './config.js';
import { AssetLoader } from './AssetLoader.js';
import { AudioManager } from './AudioManager.js';
import { Bird } from './Bird.js';
import { PipeManager } from './PipeManager.js';
import { CollisionSystem } from './CollisionSystem.js';
import { UIManager } from './UIManager.js';
import { Background, Ground } from './Scenery.js';
import { ParticleSystem } from './Particles.js';
import { Settings } from './Settings.js';
import { SettingsUI } from './SettingsUI.js';
import { Leaderboard } from './Leaderboard.js';
import { LeaderboardUI } from './LeaderboardUI.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    // Crisp pixel-art scaling.
    this.ctx.imageSmoothingEnabled = false;

    this.state = STATE.LOADING;
    this.assets = new AssetLoader();
    this.audio = new AudioManager();
    this.settings = new Settings();
    this.audio.setMuted(this.settings.get('muted'));
    this.leaderboard = new Leaderboard();

    this.score = 0;
    this.best = this._loadBest();
    this.loadProgress = 0;
    this.isNewBest = false;
    this.playerName = 'PLAYER';

    // Juice state.
    this.shakeTime = 0;
    this.flashTime = 0;
    this.scorePopTime = 0;
    this.bounceTime = 0;
    this.gameoverTime = 0;

    this.lastTime = 0;
    this._boundLoop = this._loop.bind(this);

    this._setupResize();
    this._setupInput();
  }

  async start() {
    await this.assets.loadAll((p) => {
      this.loadProgress = p;
      this._drawLoading();
    }, this.audio.context);

    this.audio.register(this.assets.audioBuffers);

    // Build entities once assets exist.
    this.birdColor = this.settings.resolveBirdColor(this.assets.birdColors);
    this.bird = new Bird(this.assets, this.birdColor);
    this.pipes = new PipeManager(this.assets);
    this.ui = new UIManager(this.assets);
    const bgKey = this.settings.resolveBackgroundKey();
    this.background = new Background(this.assets.images[bgKey]);
    this.ground = new Ground(this.assets.images.base);
    this.particles = new ParticleSystem();

    // Leaderboard + name prompt UI, plus a trophy button to view the board.
    this.leaderboardUI = new LeaderboardUI(this.leaderboard);

    // DOM settings panel; reacts to preference changes live.
    this.settingsUI = new SettingsUI(
      this.settings,
      (key, value) => this._onSettingChange(key, value),
      {
        onEditName: () =>
          this.leaderboardUI.editName(this.playerName, (name) => {
            this.playerName = name;
          }),
      }
    );

    this._buildTrophyButton();

    this._enterReady();
    requestAnimationFrame((t) => {
      this.lastTime = t;
      requestAnimationFrame(this._boundLoop);
    });

    // Ask for a name on first run (returning players are remembered).
    this.leaderboardUI.requestName((name) => {
      this.playerName = name;
    });
  }

  _buildTrophyButton() {
    const btn = document.createElement('button');
    btn.id = 'leaderboard-btn';
    btn.setAttribute('aria-label', 'Leaderboard');
    btn.innerHTML = '&#127942;'; // trophy glyph
    btn.addEventListener('click', () =>
      this.leaderboardUI.showBoard(this.playerName)
    );
    document.getElementById('stage').appendChild(btn);
  }

  // ---- Settings reactions ------------------------------------------------

  _onSettingChange(key, value) {
    switch (key) {
      case 'muted':
        this.audio.setMuted(value);
        if (!value) this.audio.unlock();
        break;
      case 'bgMode': {
        // Smoothly cross-fade to the newly resolved background.
        const bgKey = this.settings.resolveBackgroundKey();
        this.background.transitionTo(this.assets.images[bgKey]);
        break;
      }
      case 'birdColor':
        // Apply immediately so the change is visible on the Ready screen.
        this.birdColor = this.settings.resolveBirdColor(this.assets.birdColors);
        this.bird.setColor(this.birdColor);
        break;
    }
  }

  // ---- State transitions -------------------------------------------------

  _enterReady() {
    this.state = STATE.READY;
    this.score = 0;
    // Re-roll random bird color and re-resolve auto background each round.
    this.birdColor = this.settings.resolveBirdColor(this.assets.birdColors);
    this.bird.setColor(this.birdColor);
    this.bird.reset();
    this.pipes.reset();
    const bgKey = this.settings.resolveBackgroundKey();
    this.background.transitionTo(this.assets.images[bgKey]);
    this.gameoverTime = 0;
    this.flashTime = 0;
    this.shakeTime = 0;
  }

  _enterPlaying() {
    this.state = STATE.PLAYING;
    this.bird.flap();
    this.audio.play('wing');
  }

  _enterGameOver() {
    this.state = STATE.GAMEOVER;
    this.bird.alive = false;
    this.gameoverTime = 0;
    this.shakeTime = JUICE.SHAKE_DURATION;
    this.flashTime = JUICE.FLASH_DURATION;
    this.audio.play('hit');
    // "die" sound shortly after the hit, like the original.
    setTimeout(() => this.audio.play('die'), 120);

    this.isNewBest = this.score > this.best;
    if (this.isNewBest) {
      this.best = this.score;
      this._saveBest();
    }
    // Record this run on the leaderboard under the current player name.
    this.leaderboard.submit(this.playerName, this.score);
  }

  // ---- Input -------------------------------------------------------------

  _setupInput() {
    // Ignore game input while any modal (settings / name / leaderboard) is open.
    const modalOpen = () =>
      (this.settingsUI && !this.settingsUI.overlay.hidden) ||
      (this.leaderboardUI &&
        (this.leaderboardUI.isNameOpen || this.leaderboardUI.isBoardOpen));

    const flap = (e) => {
      if (modalOpen()) return;
      // Avoid scrolling / double events on touch.
      if (e && e.type === 'touchstart') e.preventDefault();
      this.audio.unlock();
      this._handleAction();
    };

    window.addEventListener('keydown', (e) => {
      if (modalOpen()) return;
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'Enter') {
        e.preventDefault();
        flap(e);
      } else if (e.code === 'KeyM') {
        // Toggle mute and keep the persisted setting in sync.
        const muted = this.audio.toggleMute();
        this.settings.set('muted', muted);
      }
    });
    this.canvas.addEventListener('mousedown', flap);
    this.canvas.addEventListener('touchstart', flap, { passive: false });
  }

  _handleAction() {
    switch (this.state) {
      case STATE.READY:
        this._enterPlaying();
        break;
      case STATE.PLAYING:
        this.bird.flap();
        this.audio.play('wing');
        break;
      case STATE.GAMEOVER:
        // Require the game-over panel to finish appearing before restart.
        if (this.gameoverTime > 0.35) {
          this.audio.play('swoosh');
          this._enterReady();
        }
        break;
    }
  }

  // ---- Responsive scaling ------------------------------------------------

  _setupResize() {
    this._resize();
    window.addEventListener('resize', () => this._resize());
  }

  _resize() {
    const dpr = window.devicePixelRatio || 1;
    // Fit the logical viewport into the window while preserving aspect ratio.
    const scale = Math.min(
      window.innerWidth / VIEW.WIDTH,
      window.innerHeight / VIEW.HEIGHT
    );
    const cssW = Math.floor(VIEW.WIDTH * scale);
    const cssH = Math.floor(VIEW.HEIGHT * scale);

    this.canvas.style.width = cssW + 'px';
    this.canvas.style.height = cssH + 'px';
    this.canvas.width = Math.floor(VIEW.WIDTH * dpr);
    this.canvas.height = Math.floor(VIEW.HEIGHT * dpr);

    // Map logical coords -> device pixels.
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = false;
  }

  // ---- Main loop ---------------------------------------------------------

  _loop(now) {
    // Delta time in seconds, clamped to avoid huge jumps after tab switches.
    let dt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    if (dt > 0.05) dt = 0.05;

    this._update(dt);
    this._render(dt);

    requestAnimationFrame(this._boundLoop);
  }

  _update(dt) {
    // Timers (shared across states).
    if (this.shakeTime > 0) this.shakeTime -= dt;
    if (this.flashTime > 0) this.flashTime -= dt;
    if (this.scorePopTime > 0) this.scorePopTime -= dt;
    if (this.bounceTime > 0) this.bounceTime -= dt;
    this.particles.update(dt);

    switch (this.state) {
      case STATE.READY:
        this.background.update(dt);
        this.ground.update(dt);
        this.bird.updateIdle(dt);
        break;

      case STATE.PLAYING:
        this.background.update(dt);
        this.ground.update(dt);
        this.bird.update(dt);

        const passed = this.pipes.update(dt, this.bird.x);
        if (passed > 0) this._onScore(passed);

        // Collisions.
        if (
          CollisionSystem.hitsPipes(this.bird, this.pipes.getActivePipes()) ||
          CollisionSystem.hitsCeiling(this.bird)
        ) {
          this._enterGameOver();
        } else if (CollisionSystem.hitsGround(this.bird)) {
          // Clamp to ground then die.
          this._enterGameOver();
        }
        break;

      case STATE.GAMEOVER:
        this.gameoverTime += dt;
        // Bird keeps falling until it rests on the ground, then freezes.
        if (!CollisionSystem.hitsGround(this.bird)) {
          this.bird.updateDead(dt);
        } else {
          // Snap so the bird's bottom sits exactly on the ground line.
          const overlap = this.bird.getBounds().bottom - (VIEW.HEIGHT - GROUND.HEIGHT);
          this.bird.y -= overlap;
          this.bird.vy = 0;
        }
        break;
    }
  }

  _onScore(count) {
    this.score += count;
    this.audio.play('point');
    this.scorePopTime = JUICE.SCORE_POP_DURATION;
    this.bounceTime = JUICE.PIPE_PASS_BOUNCE;
    // Particle burst near the bird.
    this.particles.burst(this.bird.x + 10, this.bird.y);
  }

  // ---- Rendering ---------------------------------------------------------

  _render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, VIEW.WIDTH, VIEW.HEIGHT);

    // Camera shake offset.
    let sx = 0;
    let sy = 0;
    if (this.shakeTime > 0) {
      const k = (this.shakeTime / JUICE.SHAKE_DURATION) * JUICE.SHAKE_MAGNITUDE;
      sx = (Math.random() * 2 - 1) * k;
      sy = (Math.random() * 2 - 1) * k;
    }

    ctx.save();
    ctx.translate(sx, sy);

    this.background.draw(ctx);

    // A slight downward bounce when passing a pipe (applied to the world).
    let bounce = 0;
    if (this.bounceTime > 0) {
      const t = this.bounceTime / JUICE.PIPE_PASS_BOUNCE;
      bounce = Math.sin(t * Math.PI) * 2;
    }
    ctx.save();
    ctx.translate(0, bounce);
    this.pipes.draw(ctx);
    ctx.restore();

    this.ground.draw(ctx);
    this.particles.draw(ctx);
    this.bird.draw(ctx);

    // HUD per state.
    if (this.state === STATE.READY) {
      this.ui.drawReady(ctx);
    } else if (this.state === STATE.PLAYING) {
      const pop = this._scorePopScale();
      this.ui.drawLiveScore(ctx, this.score, pop);
    } else if (this.state === STATE.GAMEOVER) {
      // Keep the live score area empty; show panel instead.
      const t = Math.min(1, this.gameoverTime / JUICE.GAMEOVER_FADE_DURATION);
      this.ui.drawGameOver(ctx, {
        score: this.score,
        best: this.best,
        isNewBest: this.isNewBest,
        playerName: this.playerName,
        t,
      });
    }

    ctx.restore();

    // Death flash overlay (drawn in screen space, above everything).
    if (this.flashTime > 0) {
      ctx.save();
      ctx.globalAlpha = (this.flashTime / JUICE.FLASH_DURATION) * 0.8;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, VIEW.WIDTH, VIEW.HEIGHT);
      ctx.restore();
    }
  }

  _scorePopScale() {
    if (this.scorePopTime <= 0) return 1;
    const t = this.scorePopTime / JUICE.SCORE_POP_DURATION;
    // Ease back from the enlarged scale to 1.
    return 1 + (JUICE.SCORE_POP_SCALE - 1) * t;
  }

  _drawLoading() {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#4ec0ca';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    const w = this.canvas.width;
    const h = this.canvas.height;
    const barW = w * 0.6;
    const barH = 14;
    const x = (w - barW) / 2;
    const y = h / 2;
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillRect(x, y, barW, barH);
    ctx.fillStyle = '#fff';
    ctx.fillRect(x, y, barW * this.loadProgress, barH);
    ctx.fillStyle = '#fff';
    ctx.font = `${Math.floor(h * 0.03)}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('Loading...', w / 2, y - 20);
    // Restore transform for game rendering.
    this._resize();
  }

  // ---- Persistence -------------------------------------------------------

  _loadBest() {
    const v = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);
    return Number.isFinite(v) ? v : 0;
  }
  _saveBest() {
    try {
      localStorage.setItem(STORAGE_KEY, String(this.best));
    } catch {
      /* storage may be unavailable in private mode */
    }
  }
}
