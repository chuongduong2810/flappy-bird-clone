/**
 * Scenery.js
 * Infinite-scrolling background and ground. Each draws its sprite twice and
 * wraps its offset for a seamless loop. Kept separate from gameplay so it can
 * keep animating on every screen.
 */

import { VIEW, GROUND, BACKGROUND, SETTINGS } from './config.js';

export class Background {
  constructor(image) {
    this.image = image;
    // Image we are cross-fading toward (null when no transition in progress).
    this.nextImage = null;
    this.fade = 0; // 0..1 progress toward nextImage
    this.offset = 0;
  }

  /**
   * Smoothly transitions to a new background image. No-op if already showing
   * (or already fading toward) the requested image.
   */
  transitionTo(image) {
    if (image === this.image || image === this.nextImage) return;
    this.nextImage = image;
    this.fade = 0;
  }

  update(dt, scrolling = true) {
    if (scrolling) {
      // Use the current image width for the wrap; both bg sprites share size.
      this.offset = (this.offset + BACKGROUND.SPEED * dt) % this.image.width;
    }
    if (this.nextImage) {
      this.fade += dt / SETTINGS.BG_CROSSFADE;
      if (this.fade >= 1) {
        this.image = this.nextImage;
        this.nextImage = null;
        this.fade = 0;
      }
    }
  }

  _tile(ctx, image, alpha) {
    const y = VIEW.HEIGHT - GROUND.HEIGHT - image.height;
    ctx.save();
    ctx.globalAlpha = alpha;
    for (let x = -this.offset; x < VIEW.WIDTH; x += image.width) {
      ctx.drawImage(image, x, Math.max(0, y), image.width, image.height);
    }
    ctx.restore();
  }

  draw(ctx) {
    // Current image fades out as the next fades in.
    this._tile(ctx, this.image, this.nextImage ? 1 - this.fade : 1);
    if (this.nextImage) {
      this._tile(ctx, this.nextImage, this.fade);
    }
  }
}

export class Ground {
  constructor(image) {
    this.image = image;
    this.offset = 0;
    this.width = image.width;
    this.y = VIEW.HEIGHT - GROUND.HEIGHT;
  }
  update(dt, scrolling = true) {
    if (!scrolling) return;
    this.offset = (this.offset + GROUND.SPEED * dt) % this.width;
  }
  draw(ctx) {
    for (let x = -this.offset; x < VIEW.WIDTH; x += this.width) {
      ctx.drawImage(this.image, x, this.y, this.width, GROUND.HEIGHT);
    }
  }
}
