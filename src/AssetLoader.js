/**
 * AssetLoader.js
 * Loads every image and audio file up front and reports progress so the
 * Loading state can show a progress bar. Images are decoded before use to
 * avoid first-frame hitches.
 */

const SPRITE_BASE = 'assets/sprites/';
const AUDIO_BASE = 'assets/audio/';

// Named sprites we rely on. Bird color is chosen at random per run.
const BIRD_COLORS = ['yellow', 'red', 'blue'];

const IMAGE_MANIFEST = {
  backgroundDay: 'background-day.png',
  backgroundNight: 'background-night.png',
  base: 'base.png',
  pipeGreen: 'pipe-green.png',
  pipeRed: 'pipe-red.png',
  message: 'message.png',
  gameover: 'gameover.png',
  // Digits 0-9 for the large score font.
  ...Object.fromEntries(
    Array.from({ length: 10 }, (_, i) => [`digit${i}`, `${i}.png`])
  ),
  // All bird animation frames for every color.
  ...Object.fromEntries(
    BIRD_COLORS.flatMap((c) => [
      [`${c}Up`, `${c}bird-upflap.png`],
      [`${c}Mid`, `${c}bird-midflap.png`],
      [`${c}Down`, `${c}bird-downflap.png`],
    ])
  ),
};

// Prefer .ogg, browsers without support fall back to .wav.
const AUDIO_MANIFEST = {
  wing: 'wing',
  point: 'point',
  hit: 'hit',
  die: 'die',
  swoosh: 'swoosh',
};

export class AssetLoader {
  constructor() {
    this.images = {};
    this.audioBuffers = {};
    this.birdColors = BIRD_COLORS;
  }

  /**
   * Loads everything, invoking onProgress(0..1) as items complete.
   * Returns a promise that resolves once all assets are ready.
   * @param {(progress:number)=>void} onProgress
   * @param {AudioContext|null} audioContext - used to decode sfx if available.
   */
  async loadAll(onProgress, audioContext) {
    const imageEntries = Object.entries(IMAGE_MANIFEST);
    const audioEntries = Object.entries(AUDIO_MANIFEST);
    const total = imageEntries.length + audioEntries.length;
    let done = 0;
    const tick = () => onProgress && onProgress(++done / total);

    const imagePromises = imageEntries.map(async ([key, file]) => {
      this.images[key] = await this._loadImage(SPRITE_BASE + file);
      tick();
    });

    const audioPromises = audioEntries.map(async ([key]) => {
      this.audioBuffers[key] = await this._loadAudio(key, audioContext);
      tick();
    });

    await Promise.all([...imagePromises, ...audioPromises]);
  }

  _loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = async () => {
        // Decode eagerly when supported to prevent runtime stalls.
        if (img.decode) {
          try {
            await img.decode();
          } catch {
            /* decode is best-effort */
          }
        }
        resolve(img);
      };
      img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
      img.src = src;
    });
  }

  /**
   * Loads an audio file. If a Web Audio context is provided we decode to an
   * AudioBuffer (low latency); otherwise we return an HTMLAudioElement source.
   */
  async _loadAudio(key, audioContext) {
    const tryFetch = async (ext) => {
      const res = await fetch(`${AUDIO_BASE}${key}.${ext}`);
      if (!res.ok) throw new Error(`audio ${key}.${ext} ${res.status}`);
      return res.arrayBuffer();
    };

    let arrayBuffer;
    try {
      arrayBuffer = await tryFetch('ogg');
    } catch {
      arrayBuffer = await tryFetch('wav');
    }

    if (audioContext) {
      // decodeAudioData is callback-based in older Safari; wrap defensively.
      return await new Promise((resolve, reject) => {
        audioContext.decodeAudioData(
          arrayBuffer.slice(0),
          (buf) => resolve(buf),
          (err) => reject(err)
        );
      });
    }
    // Fallback: build a blob URL for HTMLAudio playback.
    return URL.createObjectURL(new Blob([arrayBuffer]));
  }
}
