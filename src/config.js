/**
 * config.js
 * Central place for every tunable constant. Physics values are expressed in
 * "logical pixels per second" so the game is fully delta-time driven and
 * behaves identically regardless of frame rate or display scaling.
 *
 * The original Flappy Bird ran on a 288x512 playfield; we keep that as our
 * logical resolution and scale the canvas up to fit the viewport.
 */

export const VIEW = {
  // Logical resolution of the original game. All gameplay math uses these
  // coordinates; rendering is scaled to the device.
  WIDTH: 288,
  HEIGHT: 512,
};

export const PHYSICS = {
  // Gravity pulls the bird down continuously (px/s^2).
  GRAVITY: 1300,
  // Instant upward velocity applied on a flap (px/s, negative = up).
  FLAP_VELOCITY: -380,
  // Clamp downward speed so falls stay readable.
  MAX_FALL_SPEED: 480,
  // Rotation tuning (radians). Bird tilts up on flap, noses down while falling.
  ROTATION_UP: -0.45,
  ROTATION_DOWN: Math.PI / 2,
  // How quickly the bird rotates toward its target tilt.
  ROTATION_LERP_UP: 18,
  ROTATION_LERP_DOWN: 4,
  // Velocity at which the bird starts pointing downward.
  ROTATION_FALL_THRESHOLD: 120,
};

export const PIPES = {
  // Horizontal scroll speed (px/s) — matches original feel.
  SPEED: 130,
  // Vertical gap between top and bottom pipe (px).
  GAP: 110,
  // Horizontal distance between consecutive pipe pairs (px).
  SPACING: 175,
  // Pipe sprite width (from asset pack).
  WIDTH: 52,
  // Vertical margin so gaps never spawn too close to the top or ground.
  MIN_TOP: 60,
  MARGIN_BOTTOM: 90,
  // Number of pipe pairs to keep in the pool.
  POOL_SIZE: 4,
};

export const GROUND = {
  HEIGHT: 112, // base.png height
  // Ground scrolls at the same speed as pipes for a cohesive parallax.
  SPEED: 130,
};

export const BACKGROUND = {
  // Background drifts slowly for subtle parallax.
  SPEED: 18,
};

export const BIRD = {
  START_X: 70,
  START_Y: 256,
  WIDTH: 34,
  HEIGHT: 24,
  // Wing animation: seconds per frame.
  FRAME_TIME: 0.12,
  // Idle bobbing on the Ready screen.
  BOB_AMPLITUDE: 6,
  BOB_SPEED: 4,
  // Collision hitbox is slightly smaller than the sprite for fairness.
  HITBOX_INSET: 4,
};

export const MEDALS = {
  // Score thresholds for each medal (matches original tiers).
  BRONZE: 10,
  SILVER: 20,
  GOLD: 30,
  PLATINUM: 40,
};

export const JUICE = {
  SHAKE_DURATION: 0.4,
  SHAKE_MAGNITUDE: 6,
  FLASH_DURATION: 0.18,
  SCORE_POP_DURATION: 0.25,
  SCORE_POP_SCALE: 1.4,
  PIPE_PASS_BOUNCE: 0.18,
  PARTICLE_COUNT: 8,
  GAMEOVER_FADE_DURATION: 0.5,
};

export const STATE = {
  LOADING: 'loading',
  READY: 'ready',
  PLAYING: 'playing',
  GAMEOVER: 'gameover',
};

export const STORAGE_KEY = 'flappy_best_score';
export const SETTINGS_KEY = 'flappy_settings';

export const SETTINGS = {
  // Background mode options. "auto" picks day/night based on the local clock.
  BG_MODES: ['auto', 'day', 'night'],
  // Bird color options (must match sprite color keys in AssetLoader).
  BIRD_COLORS: ['random', 'yellow', 'red', 'blue'],
  // Local hour (inclusive start, exclusive end) considered "night" for auto.
  NIGHT_START_HOUR: 19,
  NIGHT_END_HOUR: 6,
  // Cross-fade duration (seconds) when the background swaps.
  BG_CROSSFADE: 0.6,
  DEFAULTS: {
    muted: false,
    bgMode: 'auto',
    birdColor: 'random',
  },
};
