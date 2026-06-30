/**
 * AssetLoader.js
 * Loads every image and audio file up front and reports progress so the
 * Loading state can show a progress bar. Images are decoded before use to
 * avoid first-frame hitches.
 */

import { spriteUrl } from './characters.js';

const SPRITE_BASE = 'assets/sprites/';
const AUDIO_BASE = 'assets/audio/';

const STATIC_IMAGES = {
  backgroundDay: 'background-day.png',
  backgroundNight: 'background-night.png',
  base: 'base.png',
  pipeGreen: 'pipe-green.png',
  pipeRed: 'pipe-red.png',
  message: 'message.png',
  gameover: 'gameover.png',
  ...Object.fromEntries(
    Array.from({ length: 10 }, (_, i) => [`digit${i}`, `${i}.png`])
  ),
};

const AUDIO_MANIFEST = {
  wing: 'wing',
  point: 'point',
  hit: 'hit',
  die: 'die',
  swoosh: 'swoosh',
};

function buildCharacterManifest(characters) {
  return Object.fromEntries(
    characters.flatMap((c) => [
      [`${c.id}Up`, c.up],
      [`${c.id}Mid`, c.mid],
      [`${c.id}Down`, c.down],
    ])
  );
}

export class AssetLoader {
  /**
   * @param {Array<{id:string,up:string,mid:string,down:string}>} characters
   */
  constructor(characters) {
    this.characters = characters;
    this.images = {};
    this.audioBuffers = {};
    this.birdColors = characters.map((c) => c.id);
    this._imageManifest = {
      ...STATIC_IMAGES,
      ...buildCharacterManifest(characters),
    };
  }

  /**
   * Loads everything, invoking onProgress(0..1) as items complete.
   * Returns a promise that resolves once all assets are ready.
   * @param {(progress:number)=>void} onProgress
   * @param {AudioContext|null} audioContext - used to decode sfx if available.
   */
  async loadAll(onProgress, audioContext) {
    const imageEntries = Object.entries(this._imageManifest);
    const audioEntries = Object.entries(AUDIO_MANIFEST);
    const total = imageEntries.length + audioEntries.length;
    let done = 0;
    const tick = () => onProgress && onProgress(++done / total);

    const imagePromises = imageEntries.map(async ([key, file]) => {
      this.images[key] = await this._loadImage(spriteUrl(file), file);
      tick();
    });

    const audioPromises = audioEntries.map(async ([key]) => {
      this.audioBuffers[key] = await this._loadAudio(key, audioContext);
      tick();
    });

    await Promise.all([...imagePromises, ...audioPromises]);
  }

  async _loadImage(src, filename) {
    try {
      return await this._loadImageOnce(src);
    } catch {
      // Dynamic sprites added via admin may only exist on the API route.
      const fallback = `/api/sprite?file=${encodeURIComponent(filename)}`;
      return this._loadImageOnce(fallback);
    }
  }

  _loadImageOnce(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = async () => {
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
      return await new Promise((resolve, reject) => {
        audioContext.decodeAudioData(
          arrayBuffer.slice(0),
          (buf) => resolve(buf),
          (err) => reject(err)
        );
      });
    }
    return URL.createObjectURL(new Blob([arrayBuffer]));
  }
}
