/**
 * AudioManager.js
 * Thin wrapper over the Web Audio API for low-latency one-shot playback,
 * with an HTMLAudio fallback. Handles the browser autoplay policy by
 * resuming the context on the first user gesture.
 */

export class AudioManager {
  constructor() {
    this.context = this._createContext();
    this.buffers = {};
    this.fallback = {}; // blob URLs when Web Audio is unavailable
    this.muted = false;
    this.volume = 0.8;
    this.masterGain = null;
    if (this.context) {
      this.masterGain = this.context.createGain();
      this.masterGain.connect(this.context.destination);
    }
  }

  _createContext() {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    try {
      return Ctx ? new Ctx() : null;
    } catch {
      return null;
    }
  }

  /** Registers decoded buffers (or blob URLs) produced by AssetLoader. */
  register(audioBuffers) {
    if (this.context) {
      this.buffers = audioBuffers;
    } else {
      this.fallback = audioBuffers;
    }
  }

  /** Must be called from a user gesture to satisfy autoplay policies. */
  unlock() {
    if (this.context && this.context.state === 'suspended') {
      this.context.resume();
    }
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.masterGain) {
      this.masterGain.gain.value = muted ? 0 : this.volume;
    }
  }

  setVolume(v) {
    this.volume = v;
    if (this.masterGain) {
      this.masterGain.gain.value = this.muted ? 0 : v;
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  /** Plays a registered sound effect by key. */
  play(key, volume = 1) {
    if (this.muted) return;

    if (this.context && this.buffers[key]) {
      const source = this.context.createBufferSource();
      source.buffer = this.buffers[key];
      const gain = this.context.createGain();
      gain.gain.value = volume;
      source.connect(gain).connect(this.masterGain);
      source.start(0);
      return;
    }

    // Fallback path using HTMLAudio + blob URL.
    const url = this.fallback[key];
    if (url) {
      const el = new Audio(url);
      el.volume = volume;
      el.play().catch(() => {});
    }
  }
}
