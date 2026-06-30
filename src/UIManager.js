/**
 * UIManager.js
 * Renders all HUD / screen overlays using the sprite-sheet digits and the
 * original message / gameover graphics. Also draws the medal and best score
 * on the Game Over panel, plus the animated score pop while playing.
 */

import { VIEW, GROUND, MEDALS, JUICE } from './config.js';

export class UIManager {
  constructor(assets) {
    this.assets = assets;
    this.digits = Array.from({ length: 10 }, (_, i) => assets.images[`digit${i}`]);
  }

  /** Width of a number rendered with the big sprite digits. */
  _digitsWidth(num) {
    const str = String(num);
    let w = 0;
    for (const ch of str) w += this.digits[+ch].width;
    return w;
  }

  /** Draws a number centered horizontally at (cx, y), optional scale. */
  drawNumber(ctx, num, cx, y, scale = 1) {
    const str = String(num);
    const totalW = this._digitsWidth(num) * scale;
    let x = cx - totalW / 2;
    ctx.save();
    for (const ch of str) {
      const img = this.digits[+ch];
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.drawImage(img, x, y - h / 2, w, h);
      x += w;
    }
    ctx.restore();
  }

  /** Live score near the top while playing, with a pop scale animation. */
  drawLiveScore(ctx, score, popScale) {
    this.drawNumber(ctx, score, VIEW.WIDTH / 2, 70, popScale);
  }

  /** "Get Ready" message sprite, centered. */
  drawReady(ctx) {
    const img = this.assets.images.message;
    const x = (VIEW.WIDTH - img.width) / 2;
    const y = (VIEW.HEIGHT - GROUND.HEIGHT - img.height) / 2 - 10;
    ctx.drawImage(img, x, y);
  }

  /**
   * Game Over panel with fade/slide-in, medal, final score and best score.
   * @param {object} info
   * @param {number} info.score      final score this run
   * @param {number} info.best       best score
   * @param {boolean} info.isNewBest whether this run set a new best
   * @param {string}  info.playerName player name for the leaderboard
   * @param {number}  info.t          normalized 0..1 fade progress
   */
  drawGameOver(ctx, info) {
    const { score, best, isNewBest, playerName, t } = info;
    const ease = 1 - Math.pow(1 - t, 3); // easeOutCubic
    ctx.save();
    ctx.globalAlpha = ease;

    const go = this.assets.images.gameover;
    const goX = (VIEW.WIDTH - go.width) / 2;
    const goY = 80 - (1 - ease) * 20;
    ctx.drawImage(go, goX, goY);

    // Score panel (drawn procedurally to keep things crisp at any scale).
    const panelW = 238;
    const panelH = 132;
    const panelX = (VIEW.WIDTH - panelW) / 2;
    const panelY = 150 + (1 - ease) * 30;
    this._drawPanel(ctx, panelX, panelY, panelW, panelH);

    // Player name centered at the top of the panel.
    if (playerName) {
      this._drawLabel(ctx, playerName.toUpperCase(), panelX + panelW / 2, panelY + 16, {
        size: 11,
        color: '#5a5340',
        align: 'center',
      });
    }

    // Medal slot on the left with a label below it.
    const medal = this._medalFor(score);
    const medalCx = panelX + 44;
    const medalCy = panelY + 70;
    this._drawMedalSlot(ctx, medalCx, medalCy);
    if (medal) {
      this._drawMedal(ctx, medal, medalCx, medalCy);
      this._drawLabel(ctx, medal.name, medalCx, medalCy + 34, {
        size: 9,
        color: '#7a6f4a',
        align: 'center',
      });
    }

    // Right column: SCORE + BEST with labels and right-aligned digits.
    const rightX = panelX + panelW - 22;
    this._drawLabel(ctx, 'SCORE', rightX, panelY + 40, {
      size: 10,
      color: '#e07a2b',
      align: 'right',
    });
    this._drawSmallNumber(ctx, score, rightX, panelY + 58, 0.55);

    this._drawLabel(ctx, 'BEST', rightX, panelY + 90, {
      size: 10,
      color: '#e07a2b',
      align: 'right',
    });
    this._drawSmallNumber(ctx, best, rightX, panelY + 108, 0.55);

    ctx.restore();

    // "NEW BEST!" badge, pulsing, drawn above the panel.
    if (isNewBest) {
      const pulse = 1 + Math.sin(performance.now() / 180) * 0.06;
      ctx.save();
      ctx.globalAlpha = ease;
      ctx.translate(panelX + panelW - 40, panelY + 78);
      ctx.scale(pulse, pulse);
      this._drawBadge(ctx, 'NEW!');
      ctx.restore();
    }

    // Restart hint at the bottom, gently blinking.
    const blink = 0.55 + Math.sin(performance.now() / 320) * 0.45;
    ctx.save();
    ctx.globalAlpha = ease * blink;
    this._drawLabel(ctx, 'TAP TO RESTART', VIEW.WIDTH / 2, panelY + panelH + 26, {
      size: 11,
      color: '#ffffff',
      align: 'center',
      shadow: true,
    });
    ctx.restore();
  }

  /** Draws crisp pixel-style text using the canvas font with a soft outline. */
  _drawLabel(ctx, text, x, y, opts = {}) {
    const {
      size = 12,
      color = '#fff',
      align = 'left',
      shadow = false,
    } = opts;
    ctx.save();
    ctx.font = `${size}px "Press Start 2P", monospace`;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    if (shadow) {
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.strokeText(text, x, y);
    }
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  /** Small pill badge (e.g. "NEW!"). */
  _drawBadge(ctx, text) {
    ctx.save();
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const w = ctx.measureText(text).width + 12;
    const h = 16;
    ctx.fillStyle = '#e84d3c';
    this._roundRect(ctx, -w / 2, -h / 2, w, h, 4);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillText(text, 0, 1);
    ctx.restore();
  }

  /** Empty circular medal slot so the layout reads even with no medal. */
  _drawMedalSlot(ctx, cx, cy) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, 24, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(90,83,64,0.35)';
    ctx.stroke();
    ctx.restore();
  }

  _drawPanel(ctx, x, y, w, h) {
    ctx.save();
    ctx.fillStyle = '#ded895';
    ctx.strokeStyle = '#5a5340';
    ctx.lineWidth = 2;
    this._roundRect(ctx, x, y, w, h, 6);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  _medalFor(score) {
    if (score >= MEDALS.PLATINUM)
      return { name: 'PLATINUM', color: '#e5e4e2', glow: '#ffffff' };
    if (score >= MEDALS.GOLD)
      return { name: 'GOLD', color: '#ffd700', glow: '#fff6b0' };
    if (score >= MEDALS.SILVER)
      return { name: 'SILVER', color: '#c0c0c0', glow: '#f0f0f0' };
    if (score >= MEDALS.BRONZE)
      return { name: 'BRONZE', color: '#cd7f32', glow: '#e6a65c' };
    return null;
  }

  /** Draws a medal centered at (cx, cy). */
  _drawMedal(ctx, medal, cx, cy) {
    const r = 22;
    ctx.save();
    // Outer ring
    const grad = ctx.createRadialGradient(cx - 6, cy - 6, 4, cx, cy, r);
    grad.addColorStop(0, medal.glow);
    grad.addColorStop(1, medal.color);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Inner star highlight
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.arc(cx - 5, cy - 5, r * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /** Smaller digits for the panel, right-aligned at (rightX, cy). */
  _drawSmallNumber(ctx, num, rightX, cy, scale = 0.6) {
    const str = String(num);
    let totalW = 0;
    for (const ch of str) totalW += this.digits[+ch].width * scale;
    let x = rightX - totalW;
    for (const ch of str) {
      const img = this.digits[+ch];
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.drawImage(img, x, cy - h / 2, w, h);
      x += w;
    }
  }
}
