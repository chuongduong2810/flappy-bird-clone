# Flappy Bird Clone

A faithful, polished 2D Flappy Bird clone built with vanilla **HTML5 Canvas** and **modern ES modules**. Uses the original retro sprites and sound effects from the [samuelcust/flappy-bird-assets](https://github.com/samuelcust/flappy-bird-assets) pack.

## Features

- One-button gameplay — **Space**, **mouse click**, or **touch**
- Delta-time physics tuned to match the original feel (gravity, flap, pipe speed/gap)
- Object-pooled pipes, infinite scrolling background & ground
- Animated wing flapping + smooth bird rotation (tilts up on flap, noses down while falling)
- Juice: camera shake, death flash, score pop, pipe-pass bounce, particle burst on score
- Get Ready / Playing / Game Over screens with medals, live score, and best score
- **Day / Night backgrounds** with a smooth cross-fade. `Auto` mode switches based on your local clock; or force Day/Night in Settings
- **Settings menu** (gear button, top-right): toggle sound, choose background mode, and pick the bird color (Random / Yellow / Red / Blue) — all persisted in `localStorage`
- High score persisted in `localStorage`
- Responsive, pixel-perfect scaling for desktop and mobile
- Web Audio (low latency) with HTMLAudio fallback; press **M** to mute

## Run locally

This project uses [Vite](https://vitejs.dev/) for development and bundling.

```bash
npm install      # install dependencies
npm run dev      # start the dev server (opens http://localhost:5173)
npm run build    # produce an optimized bundle in dist/
npm run preview  # preview the production build locally
```

The production build outputs a single minified JS chunk (~20 KB / ~7 KB gzipped)
plus the asset files in `dist/`. The relative `base` makes it deployable to any
static host or sub-path (e.g. GitHub Pages).

> No bundler? Because everything is standard ES modules, you can also just serve
> the folder with any static server (`python -m http.server 8000`) and open
> `index.html`.

## Deploy

The project includes `vercel.json` so Vercel builds the latest release with
`npm ci` and `npm run build`, then serves the generated `dist/` directory
alongside the serverless functions in `api/`.

For production features that persist data, configure these environment variables
in Vercel before deploying:

```bash
ADMIN_SECRET=your-secret-here
flappybase_KV_REST_API_URL=your-upstash-rest-url
flappybase_KV_REST_API_TOKEN=your-upstash-rest-token
```

The service worker uses a network-first app shell strategy and bypasses runtime
API/catalog caching so returning PWA users receive the latest deployed game
instead of an older cached build.

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
| `Settings` | Persisted preferences (mute, background mode, bird color) |
| `SettingsUI` | DOM settings panel (gear button + modal) |
| `config.js` | All tunable constants (physics, difficulty, juice, settings) |

Tweak gameplay difficulty and feel entirely from `src/config.js`.

## Assets

Sprites and audio © their original authors, bundled via the
[flappy-bird-assets](https://github.com/samuelcust/flappy-bird-assets) pack (see `assets/`).
