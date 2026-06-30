/**
 * SettingsUI.js
 * Builds a lightweight DOM overlay for the settings panel (gear button +
 * modal). Kept as DOM rather than canvas so it's accessible and easy to style.
 * Calls back into the Game when a preference changes.
 */

import { SETTINGS } from './config.js';

const LABELS = {
  bgMode: { auto: 'Auto', day: 'Day', night: 'Night' },
  birdColor: { random: 'Random', yellow: 'Yellow', red: 'Red', blue: 'Blue' },
};

export class SettingsUI {
  /**
   * @param {Settings} settings
   * @param {(key:string,value:any)=>void} onChange
   * @param {{onEditName?:Function}} [hooks]
   */
  constructor(settings, onChange, hooks = {}) {
    this.settings = settings;
    this.onChange = onChange;
    this.hooks = hooks;
    this._build();
  }

  _build() {
    // Gear button (top-right of the stage).
    this.gear = document.createElement('button');
    this.gear.id = 'settings-gear';
    this.gear.setAttribute('aria-label', 'Settings');
    this.gear.innerHTML = '&#9881;'; // gear glyph
    this.gear.addEventListener('click', () => this.toggle(true));

    // Modal overlay.
    this.overlay = document.createElement('div');
    this.overlay.id = 'settings-overlay';
    this.overlay.hidden = true;
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.toggle(false);
    });

    const panel = document.createElement('div');
    panel.id = 'settings-panel';

    const title = document.createElement('h2');
    title.textContent = 'Settings';
    panel.appendChild(title);

    panel.appendChild(
      this._toggleRow('Sound', !this.settings.get('muted'), (on) => {
        this.settings.set('muted', !on);
        this.onChange('muted', !on);
      })
    );

    panel.appendChild(
      this._sliderRow('Volume', this.settings.get('volume') ?? 0.8, (v) => {
        this.settings.set('volume', v);
        this.onChange('volume', v);
      })
    );

    panel.appendChild(
      this._segmentRow(
        'Background',
        SETTINGS.BG_MODES,
        this.settings.get('bgMode'),
        LABELS.bgMode,
        (val) => {
          this.settings.set('bgMode', val);
          this.onChange('bgMode', val);
        }
      )
    );

    panel.appendChild(
      this._segmentRow(
        'Bird',
        SETTINGS.BIRD_COLORS,
        this.settings.get('birdColor'),
        LABELS.birdColor,
        (val) => {
          this.settings.set('birdColor', val);
          this.onChange('birdColor', val);
        }
      )
    );

    const DIFF_LABELS = { easy: 'Easy', normal: 'Norm', hard: 'Hard', nightmare: '☠' };
    panel.appendChild(
      this._segmentRow(
        'Difficulty',
        ['easy', 'normal', 'hard', 'nightmare'],
        this.settings.get('difficulty') ?? 'normal',
        DIFF_LABELS,
        (val) => {
          this.settings.set('difficulty', val);
          this.onChange('difficulty', val);
        }
      )
    );

    // Change-name button (only meaningful if the host provided a hook).
    if (this.hooks.onEditName) {
      const nameRow = document.createElement('div');
      nameRow.className = 'settings-row';
      const span = document.createElement('span');
      span.textContent = 'Name';
      const btn = document.createElement('button');
      btn.className = 'settings-segment-single';
      btn.textContent = 'Change';
      btn.addEventListener('click', () => {
        this.toggle(false);
        this.hooks.onEditName();
      });
      nameRow.append(span, btn);
      panel.appendChild(nameRow);
    }

    const close = document.createElement('button');
    close.className = 'settings-close';
    close.textContent = 'Done';
    close.addEventListener('click', () => this.toggle(false));
    panel.appendChild(close);

    this.overlay.appendChild(panel);

    const stage = document.getElementById('stage');
    stage.appendChild(this.gear);
    stage.appendChild(this.overlay);

    // Close on Escape.
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Escape' && !this.overlay.hidden) this.toggle(false);
    });
  }

  _toggleRow(label, initialOn, onToggle) {
    const row = document.createElement('div');
    row.className = 'settings-row';
    const span = document.createElement('span');
    span.textContent = label;
    const btn = document.createElement('button');
    btn.className = 'settings-switch';
    const render = (on) => {
      btn.classList.toggle('on', on);
      btn.textContent = on ? 'On' : 'Off';
      btn.setAttribute('aria-pressed', String(on));
    };
    let on = initialOn;
    render(on);
    btn.addEventListener('click', () => {
      on = !on;
      render(on);
      onToggle(on);
    });
    row.append(span, btn);
    return row;
  }

  _segmentRow(label, options, current, labelMap, onSelect) {
    const row = document.createElement('div');
    row.className = 'settings-row';
    const span = document.createElement('span');
    span.textContent = label;
    const group = document.createElement('div');
    group.className = 'settings-segment';

    const buttons = [];
    const select = (val) => {
      buttons.forEach((b) => b.classList.toggle('active', b.dataset.val === val));
    };
    options.forEach((opt) => {
      const b = document.createElement('button');
      b.dataset.val = opt;
      b.textContent = (labelMap && labelMap[opt]) || opt;
      b.addEventListener('click', () => {
        select(opt);
        onSelect(opt);
      });
      buttons.push(b);
      group.appendChild(b);
    });
    select(current);

    row.append(span, group);
    return row;
  }

  _sliderRow(label, initial, onInput) {
    const row = document.createElement('div');
    row.className = 'settings-row';
    const span = document.createElement('span');
    span.textContent = label;
    const wrapper = document.createElement('div');
    wrapper.className = 'settings-slider-wrap';
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.className = 'settings-slider';
    slider.min = '0';
    slider.max = '1';
    slider.step = '0.05';
    slider.value = String(initial);
    slider.addEventListener('input', () => onInput(parseFloat(slider.value)));
    wrapper.appendChild(slider);
    row.append(span, wrapper);
    return row;
  }

  toggle(show) {
    this.overlay.hidden = !show;
    // Animate in via class for the CSS transition.
    if (show) requestAnimationFrame(() => this.overlay.classList.add('visible'));
    else this.overlay.classList.remove('visible');
  }
}
