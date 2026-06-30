/**
 * Settings.js
 * Persisted user preferences (mute, background mode, bird color) backed by
 * localStorage. Pure data + helpers; the DOM settings panel lives in
 * SettingsUI.js and the Game reacts to changes.
 */

import { SETTINGS, SETTINGS_KEY } from './config.js';

export class Settings {
  constructor() {
    this.values = { ...SETTINGS.DEFAULTS, ...this._load() };
  }

  _load() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  save() {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.values));
    } catch {
      /* private mode / storage disabled */
    }
  }

  get(key) {
    return this.values[key];
  }

  set(key, value) {
    this.values[key] = value;
    this.save();
  }

  /**
   * Resolves the effective background key ("backgroundDay" | "backgroundNight")
   * given the current mode. "auto" uses the local clock.
   */
  resolveBackgroundKey(now = new Date()) {
    let mode = this.values.bgMode;
    if (mode === 'auto') {
      const h = now.getHours();
      const isNight =
        SETTINGS.NIGHT_START_HOUR > SETTINGS.NIGHT_END_HOUR
          ? h >= SETTINGS.NIGHT_START_HOUR || h < SETTINGS.NIGHT_END_HOUR
          : h >= SETTINGS.NIGHT_START_HOUR && h < SETTINGS.NIGHT_END_HOUR;
      mode = isNight ? 'night' : 'day';
    }
    return mode === 'night' ? 'backgroundNight' : 'backgroundDay';
  }

  /** Resolves the bird color, picking randomly when set to "random". */
  resolveBirdColor(availableColors) {
    const c = this.values.birdColor;
    if (c === 'random') {
      return availableColors[Math.floor(Math.random() * availableColors.length)];
    }
    return availableColors.includes(c) ? c : availableColors[0];
  }
}
