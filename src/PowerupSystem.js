import { POWERUP } from './config.js';

export class PowerupSystem {
  constructor() {
    this.effect = null; // { type: string, timeLeft: number|Infinity }
  }

  reset() {
    this.effect = null;
  }

  update(dt) {
    if (!this.effect || this.effect.timeLeft === Infinity) return;
    this.effect.timeLeft -= dt;
    if (this.effect.timeLeft <= 0) this.effect = null;
  }

  /** Check if bird overlaps any uncollected powerup on active pipes. Returns type string or null. */
  checkCollect(birdBounds, pipes) {
    const bx = (birdBounds.left + birdBounds.right) / 2;
    const by = (birdBounds.top + birdBounds.bottom) / 2;
    for (const pipe of pipes) {
      if (!pipe.hasPowerup || pipe.powerupCollected) continue;
      const dx = Math.abs(bx - pipe.x);
      const dy = Math.abs(by - pipe.gapY);
      if (dx < POWERUP.RADIUS * 2.2 && dy < POWERUP.RADIUS * 2.2) {
        pipe.powerupCollected = true;
        this._apply(pipe.powerupType);
        return pipe.powerupType;
      }
    }
    return null;
  }

  _apply(type) {
    if (type === 'slowmo') {
      this.effect = { type, timeLeft: POWERUP.SLOWMO_DURATION };
    } else {
      // shield and scoreplus persist until consumed
      this.effect = { type, timeLeft: Infinity };
    }
  }

  getSpeedMult() {
    return (this.effect && this.effect.type === 'slowmo') ? POWERUP.SLOWMO_FACTOR : 1;
  }

  consumeShield() {
    if (this.effect && this.effect.type === 'shield') {
      this.effect = null;
      return true;
    }
    return false;
  }

  consumeScorePlus() {
    if (this.effect && this.effect.type === 'scoreplus') {
      this.effect = null;
      return 1;
    }
    return 0;
  }

  drawHUD(ctx) {
    if (!this.effect) return;
    const { type, timeLeft } = this.effect;
    const colors = {
      shield: POWERUP.SHIELD_COLOR,
      slowmo: POWERUP.SLOWMO_COLOR,
      scoreplus: POWERUP.SCOREPLUS_COLOR,
    };
    const labels = { shield: 'SHIELD', slowmo: 'SLOW', scoreplus: 'x2' };
    const color = colors[type] || '#fff';
    const label = labels[type] || type;

    ctx.save();
    // Background pill
    const pw = 70, ph = 20, px = 8, py = 8;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(px, py, pw, ph, 5) : ctx.rect(px, py, pw, ph);
    ctx.fill();
    // Progress fill for timed effects
    if (timeLeft !== Infinity) {
      const pct = Math.max(0, timeLeft / POWERUP.SLOWMO_DURATION);
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.4;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(px, py, pw * pct, ph, 5) : ctx.rect(px, py, pw * pct, ph);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    // Label
    ctx.fillStyle = color;
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, px + pw / 2, py + ph / 2);
    ctx.restore();
  }
}
