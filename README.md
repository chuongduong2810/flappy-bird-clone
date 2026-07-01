# Flappy Bird Clone

A faithful, polished 2D Flappy Bird clone built with vanilla **HTML5 Canvas** and **modern ES modules**. Uses the original retro sprites and sound effects from the [samuelcust/flappy-bird-assets](https://github.com/samuelcust/flappy-bird-assets) pack.

## Features

- **Classic one-button Flappy Bird gameplay** using **Space**, **Enter**,
  **Arrow Up**, mouse click, or touch.
- **Delta-time physics** with tuned gravity, flap impulse, capped fall speed,
  smooth rotation, animated wing flapping, and fair inset hitboxes.
- **Infinite pipe course** with object-pooled pipe pairs, scoring, medals, and
  best score persistence in `localStorage`.
- **Four difficulty modes**:
  - Easy: wider gaps, slower pipes, 1 coin per pipe
  - Normal: original-feeling baseline, 2 coins per pipe
  - Hard: tighter gaps, faster pipes, moving obstacles, 4 coins per pipe
  - Nightmare: fastest pipes, smallest gaps, stronger movement, 8 coins per pipe
- **Power-ups** that spawn in pipe gaps:
  - Shield absorbs one collision
  - Slow-mo temporarily reduces pipe speed
  - Score+ adds a bonus point on the next pipe pass
- **Coin economy and character shop** with persisted balance, buy/equip flow,
  and five characters: Yellow Bird, Red Bird, Blue Bird, Dragon, and Red Dragon.
- **Local and global leaderboards** with per-difficulty filtering. Local scores
  are stored in `localStorage`; global scores use the `/api/leaderboard`
  endpoint when Upstash Redis credentials are configured.
- **Settings menu** (gear button, top-right): sound toggle, volume slider,
  background mode, bird/character selection, difficulty, and player name.
- **Day / Night backgrounds** with a smooth cross-fade. `Auto` mode switches
  based on your local clock; Day and Night can also be forced in Settings.
- **Juice and polish**: camera shake, death flash, score pop, pipe-pass bounce,
  particle burst on score, animated Game Over panel, and mobile haptics.
- **Responsive, pixel-perfect scaling** for desktop and mobile, including
  safe-area-friendly mobile layout.
- **PWA support** with a web app manifest and service worker for installable,
  standalone play.
- **Admin tools** at `admin.html` for managing the runtime character catalog
  backed by the `/api/characters` and `/api/sprite` routes.
- **Audio** via low-latency Web Audio with HTMLAudio fallback; press **M** to
  mute globally.
- **Hidden coin cheats** for development/testing: type `cheat` on keyboard or
  tap the top-left corner seven times on mobile.

## Run locally

This project uses [Vite](https://vitejs.dev/) for development and bundling.

```bash
npm install      # install dependencies
npm run dev      # start the dev server (opens http://localhost:5173)
npm run build    # produce an optimized bundle in dist/
npm run preview  # preview the production build locally
```

The production build outputs the bundled JavaScript plus asset files in `dist/`.
The relative `base` makes it deployable to any static host or sub-path (e.g.
GitHub Pages).

> No bundler? Because everything is standard ES modules, you can also just serve
> the folder with any static server (`python -m http.server 8000`) and open
> `index.html`.

## Architecture

| Module | Responsibility |
| --- | --- |
| `Game` | State machine, rAF loop, input, scaling, juice orchestration |
| `Bird` | Player physics, wing animation, rotation, hitbox |
| `PipeManager` | Pooled pipe spawning/recycling, scoring, drawing |
| `CollisionSystem` | Stateless AABB collision tests |
| `AudioManager` | Web Audio playback + autoplay unlock + mute |
| `AssetLoader` | Preloads/decodes all sprites and audio with progress |
| `UIManager` | HUD, screens, sprite-digit score, medals |
| `Scenery` | Infinite scrolling background (with day/night cross-fade) & ground |
| `Particles` | Pooled particle burst |
| `PowerupSystem` | Collectible shield, slow-mo, and Score+ effects |
| `CoinSystem` | Persisted coin balance, ownership, purchases, and cheat balance |
| `ShopUI` | Character shop overlay with buy/equip controls |
| `Leaderboard` | Local leaderboard, saved player name, and global API client |
| `LeaderboardUI` | Trophy modal for local/global scoreboards |
| `Haptic` | Mobile vibration feedback helpers |
| `characters.js` | Runtime character catalog loading and sprite URL helpers |
| `Settings` | Persisted preferences (mute, volume, background mode, character, difficulty, player name) |
| `SettingsUI` | DOM settings panel (gear button + modal) |
| `config.js` | All tunable constants (physics, difficulty, juice, settings) |
| `api/leaderboard.js` | Upstash Redis-backed global leaderboard route |
| `api/characters.js` | Character catalog API used by the admin panel |
| `api/sprite.js` | Sprite proxy route for admin-managed character art |

Tweak gameplay difficulty and feel entirely from `src/config.js`.

## Assets

Sprites and audio © their original authors, bundled via the
[flappy-bird-assets](https://github.com/samuelcust/flappy-bird-assets) pack (see `assets/`).
