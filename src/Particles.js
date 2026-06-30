/**
 * Particles.js
 * Tiny pooled particle system used for the subtle burst when scoring.
 * Pixel-art friendly: simple square sparks with gravity and fade.
 */

import { JUICE } from './config.js';

class Particle {
  constructor() {
    this.active = false;
  }
  spawn(x, y) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 40 + Math.random() * 80;
    this.x = x;
    this.y = y;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed - 30;
    this.life = 0.5 + Math.random() * 0.3;
    this.maxLife = this.life;
    this.size = 2 + Math.random() * 2;
    this.active = true;
  }
  update(dt) {
    if (!this.active) return;
    this.vy += 240 * dt; // gravity
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
    if (this.life <= 0) this.active = false;
  }
}

export class ParticleSystem {
  constructor(poolSize = 48) {
    this.pool = Array.from({ length: poolSize }, () => new Particle());
  }
  burst(x, y, count = JUICE.PARTICLE_COUNT, color = '#fff3a0') {
    this.color = color;
    let spawned = 0;
    for (const p of this.pool) {
      if (spawned >= count) break;
      if (!p.active) {
        p.spawn(x, y);
        spawned++;
      }
    }
  }
  update(dt) {
    for (const p of this.pool) p.update(dt);
  }
  draw(ctx) {
    ctx.save();
    for (const p of this.pool) {
      if (!p.active) continue;
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = this.color || '#fff3a0';
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.restore();
  }
}
