/**
 * PipeManager.js
 * Spawns, recycles and draws pipe pairs using an object pool to avoid GC
 * churn. Each "pipe pair" is a single object describing the gap; the top and
 * bottom pipe sprites are derived from it at draw time.
 */

import { PIPES, VIEW, GROUND } from './config.js';

class Pipe {
  constructor() {
    this.reset();
  }
  reset() {
    this.x = 0;
    this.gapY = 0; // center of the gap
    this.active = false;
    this.scored = false;
  }
}

export class PipeManager {
  constructor(assets) {
    this.assets = assets;
    this.sprite = assets.images.pipeGreen;
    // Pre-allocate the pool.
    this.pool = Array.from({ length: PIPES.POOL_SIZE }, () => new Pipe());
    this.reset();
  }

  reset() {
    this.pool.forEach((p) => p.reset());
    // Distance until the next pipe should spawn.
    this.spawnCountdown = 0;
    this.firstSpawnDone = false;
  }

  /** Returns an inactive pipe from the pool, or null if all are in use. */
  _acquire() {
    return this.pool.find((p) => !p.active) || null;
  }

  _randomGapY() {
    const playable = VIEW.HEIGHT - GROUND.HEIGHT;
    const min = PIPES.MIN_TOP + PIPES.GAP / 2;
    const max = playable - PIPES.MARGIN_BOTTOM - PIPES.GAP / 2;
    return min + Math.random() * (max - min);
  }

  _spawn() {
    const pipe = this._acquire();
    if (!pipe) return;
    pipe.reset();
    pipe.active = true;
    pipe.x = VIEW.WIDTH + PIPES.WIDTH / 2;
    pipe.gapY = this._randomGapY();
  }

  /**
   * Advances all pipes. Returns the number of pipe pairs the bird passed this
   * frame so the Game can award points (and trigger juice).
   * @param {number} dt
   * @param {number} birdX
   */
  update(dt, birdX) {
    let passed = 0;
    const dx = PIPES.SPEED * dt;

    // Spawn cadence based on horizontal spacing.
    if (!this.firstSpawnDone) {
      this._spawn();
      this.firstSpawnDone = true;
      this.spawnCountdown = PIPES.SPACING;
    } else {
      this.spawnCountdown -= dx;
      if (this.spawnCountdown <= 0) {
        this._spawn();
        this.spawnCountdown += PIPES.SPACING;
      }
    }

    for (const p of this.pool) {
      if (!p.active) continue;
      p.x -= dx;
      // Score when the bird's x passes the pipe center.
      if (!p.scored && p.x < birdX) {
        p.scored = true;
        passed++;
      }
      // Recycle once fully off-screen on the left.
      if (p.x < -PIPES.WIDTH) {
        p.active = false;
      }
    }
    return passed;
  }

  /** Iterates active pipes (for collision testing). */
  getActivePipes() {
    return this.pool.filter((p) => p.active);
  }

  draw(ctx) {
    const w = PIPES.WIDTH;
    const h = this.sprite.height;
    const playable = VIEW.HEIGHT - GROUND.HEIGHT;
    for (const p of this.pool) {
      if (!p.active) continue;
      const left = p.x - w / 2;
      const topPipeBottom = p.gapY - PIPES.GAP / 2;
      const bottomPipeTop = p.gapY + PIPES.GAP / 2;

      // Top pipe: drawn flipped vertically, its bottom edge at topPipeBottom.
      ctx.save();
      ctx.translate(left, topPipeBottom);
      ctx.scale(1, -1);
      ctx.drawImage(this.sprite, 0, 0, w, h);
      ctx.restore();

      // Bottom pipe: top edge at bottomPipeTop.
      ctx.drawImage(this.sprite, left, bottomPipeTop, w, h);

      // Suppress unused-var lint while keeping playable handy for tweaks.
      void playable;
    }
  }
}
