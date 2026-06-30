/**
 * Bird.js
 * The player character. Owns its position, velocity, wing-flap animation and
 * smooth rotation. Pure logic + draw; collision math lives in CollisionSystem.
 */

import { BIRD, PHYSICS, VIEW } from './config.js';

export class Bird {
  constructor(assets, color) {
    this.assets = assets;
    this.setColor(color);
    this.reset();
  }

  setColor(color) {
    // Three-frame wing cycle: up -> mid -> down -> mid.
    this.frames = [
      this.assets.images[`${color}Up`],
      this.assets.images[`${color}Mid`],
      this.assets.images[`${color}Down`],
    ];
  }

  reset() {
    this.x = BIRD.START_X;
    this.y = BIRD.START_Y;
    this.vy = 0;
    this.rotation = 0;
    this.frameIndex = 1;
    this.frameTimer = 0;
    this.frameDir = 1;
    this.bobTime = 0;
    this.alive = true;
  }

  flap() {
    this.vy = PHYSICS.FLAP_VELOCITY;
    // Snap the wing to the up frame for a snappy, responsive feel.
    this.frameIndex = 0;
  }

  /** Idle animation used on the Ready screen — gentle bob + wing flap. */
  updateIdle(dt) {
    this.bobTime += dt;
    this.y = BIRD.START_Y + Math.sin(this.bobTime * BIRD.BOB_SPEED) * BIRD.BOB_AMPLITUDE;
    this.rotation = 0;
    this._animateWing(dt);
  }

  /** Physics + animation while playing. */
  update(dt) {
    this.vy += PHYSICS.GRAVITY * dt;
    if (this.vy > PHYSICS.MAX_FALL_SPEED) this.vy = PHYSICS.MAX_FALL_SPEED;
    this.y += this.vy * dt;

    // Target tilt: nose up just after a flap, gradually nose down when falling.
    let targetRot;
    let lerp;
    if (this.vy < PHYSICS.ROTATION_FALL_THRESHOLD) {
      targetRot = PHYSICS.ROTATION_UP;
      lerp = PHYSICS.ROTATION_LERP_UP;
    } else {
      targetRot = PHYSICS.ROTATION_DOWN;
      lerp = PHYSICS.ROTATION_LERP_DOWN;
    }
    // Exponential smoothing toward the target, frame-rate independent.
    const t = 1 - Math.exp(-lerp * dt);
    this.rotation += (targetRot - this.rotation) * t;

    // Wings beat faster while ascending, slower while diving.
    this._animateWing(dt, this.vy < 0 ? 0.7 : 1.4);
  }

  _animateWing(dt, speedScale = 1) {
    this.frameTimer += dt;
    if (this.frameTimer >= BIRD.FRAME_TIME * speedScale) {
      this.frameTimer = 0;
      // Ping-pong through frames 0,1,2,1 for a natural flap.
      this.frameIndex += this.frameDir;
      if (this.frameIndex >= 2) {
        this.frameIndex = 2;
        this.frameDir = -1;
      } else if (this.frameIndex <= 0) {
        this.frameIndex = 0;
        this.frameDir = 1;
      }
    }
  }

  /** When dead the bird freezes its wing and just falls/rotates. */
  updateDead(dt) {
    this.vy += PHYSICS.GRAVITY * dt;
    if (this.vy > PHYSICS.MAX_FALL_SPEED) this.vy = PHYSICS.MAX_FALL_SPEED;
    this.y += this.vy * dt;
    const t = 1 - Math.exp(-PHYSICS.ROTATION_LERP_DOWN * dt);
    this.rotation += (PHYSICS.ROTATION_DOWN - this.rotation) * t;
    this.frameIndex = 1; // mid frame, wings still
  }

  draw(ctx) {
    const img = this.frames[this.frameIndex];
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.drawImage(img, -BIRD.WIDTH / 2, -BIRD.HEIGHT / 2, BIRD.WIDTH, BIRD.HEIGHT);
    ctx.restore();
  }

  /** Axis-aligned bounding box (slightly inset) for collision tests. */
  getBounds() {
    const inset = BIRD.HITBOX_INSET;
    return {
      left: this.x - BIRD.WIDTH / 2 + inset,
      right: this.x + BIRD.WIDTH / 2 - inset,
      top: this.y - BIRD.HEIGHT / 2 + inset,
      bottom: this.y + BIRD.HEIGHT / 2 - inset,
    };
  }
}
