/**
 * CollisionSystem.js
 * Stateless collision tests between the bird and the world (pipes + ground).
 * Uses AABB checks against the bird's inset hitbox — close to the original's
 * forgiving feel.
 */

import { PIPES, VIEW, GROUND } from './config.js';

export class CollisionSystem {
  /** True if the bird's bottom has reached the ground. */
  static hitsGround(bird) {
    const bounds = bird.getBounds();
    return bounds.bottom >= VIEW.HEIGHT - GROUND.HEIGHT;
  }

  /** True if the bird hit the very top of the screen (acts as a soft ceiling). */
  static hitsCeiling(bird) {
    return bird.getBounds().top <= 0;
  }

  /** True if the bird overlaps any active pipe. */
  static hitsPipes(bird, pipes) {
    const b = bird.getBounds();
    const halfW = PIPES.WIDTH / 2;
    for (const p of pipes) {
      const pipeLeft = p.x - halfW;
      const pipeRight = p.x + halfW;
      // Quick horizontal reject.
      if (b.right < pipeLeft || b.left > pipeRight) continue;
      const gapTop = p.gapY - p.gap / 2;
      const gapBottom = p.gapY + p.gap / 2;
      // Collision if the bird is outside the vertical gap.
      if (b.top < gapTop || b.bottom > gapBottom) {
        return true;
      }
    }
    return false;
  }
}
