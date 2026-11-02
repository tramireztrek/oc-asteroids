# AGENTS.md

## Project overview

Clone of the classic **Asteroids** arcade game, built with plain HTML5 Canvas and vanilla JavaScript. No frameworks, no bundler, no dependencies. UI text is in Spanish.

## Files

- `index.html` — single page with a fixed 800x600 `<canvas id="canvas">`; loads `game.js`
- `game.js` — ALL game logic (single-file, ES6+, `'use strict'`, no modules)
- `favicon.svg` — page icon

## Running

Open `index.html` directly in a browser (double click), or:

```bash
npx serve .
```

Then visit `http://localhost:3000`. No build step, no test suite, no linter configured.

## Architecture / conventions

- Global constants `W = 800`, `H = 600` define canvas dimensions; `ctx` is the global 2D context used for all drawing.
- Entities are ES6 classes (`Bullet`, `Asteroid`, `Ship`, `Particle`) with `update(dt)` / `draw()` methods and a `dead` flag for filtering.
- Game state kept in module-level globals (`ship`, `bullets`, `asteroids`, `particles`, `score`, `lives`, `level`); `state` is `'playing' | 'dead' | 'gameover'`.
- Main loop: `requestAnimationFrame` → `update(dt)` → `draw()`, dt clamped to 0.05s.
- Keyboard input: `keys` (held) and `justPressed`/`pressed(code)` (edge-triggered) via `e.code`.
- Space is toroidal: all movement goes through `wrap(v, max)`.
- Asteroid sizes 1/2/3 (small/medium/large) with lookup tables `RADII`, `SPEEDS`, `POINTS` at the top of the file.
- Section headers use `// ── Title ───...` comment dividers; code/comments in Spanish.
- Modal overlays (GAME OVER) are drawn in-canvas, not DOM.

## Controls (for reference when editing gameplay)

Arrows rotate/thrust, Space shoots. Large→2 medium, medium→2 small. 3 lives, respawn invincibility with blink.
