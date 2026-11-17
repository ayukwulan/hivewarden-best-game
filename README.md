# HIVEWARDEN

[![make.fun](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01)
[![make.fun rank](https://make.fun/badge/best-game-01/ayukwulan/hivewarden-best-game/rank.svg)](https://make.fun/bounty/best-game-01)
[![make.fun reward](https://make.fun/badge/best-game-01/ayukwulan/hivewarden-best-game/reward.svg)](https://make.fun/bounty/best-game-01)

Guard the golden hive through seven days — sting the raiders, drink the nectar, build wax walls, and face the Hornet Queen at dusk.

## The game

You are the guardian bee of a golden hive in a bright meadow. Steer with the mouse or WASD / arrow keys. Sting raiders with a click or J. Drink nectar from the flowers and carry it home to ripen into honey. Build wax walls with E to block the paths, call a swarm with Q, blast a pheromone burst with Shift, shield the hive with R, and dash with Space.

Seven named days — Dawn Meadow, Clover Field, Poppy Row, Sunflower Stand, Berry Thicket, Storm Meadow, Dusk Bloom — each with its own waves. Wasps fly fast at you, mites swarm the hive in numbers, spiders crawl slow, beetles are armoured walls, hornets dive at the hive. On day 7 the Hornet Queen arrives, calls mites, and must be defeated to win.

- **Goal:** survive all 7 days and defeat the Hornet Queen. **Lose:** hive health reaches 0.
- **Score:** nectar × 5, kills × 8–500 (combo multiplies), day clear +100, queen +500, win bonus +500, plus a time bonus.
- **Relics:** one earned at the end of each day — Royal Jelly, Amber Comb, Golden Pollen, Sunpetal, Queen's Crown, Stormwing — each with a real passive effect.
- **Abilities:** Sting, Swarm Call, Wax Wall, Pheromone Burst, Nectar Dash, Royal Guard.
- **Controls:** mouse / WASD / arrows move, click or J sting, Space dash, Q swarm, E wax wall, Shift pheromone burst, R royal guard, P pause, M mute, Enter start / restart.
- **Sound:** synthesised WebAudio only — no sound files.
- **Tech:** plain 2D canvas, no library, no network request, works offline.

## Play it

```sh
node serve.ts
# open http://localhost:8080
```

## Screenshots

The four screenshots in `screenshots/` are real renders of the game's own code, staged deterministically with `?shot=boss|play|start|end&seed=1` — the cover is the day-7 boss fight, not a title screen:

```sh
node capture.mjs   # writes screenshots/1-boss.jpg … 4-end.jpg
node playtest.mjs  # pure-logic checks + a real browser drive
```

## Layout

- `game/index.html` — the page; the canvas and nothing else.
- `game/src/config.js` — every tuning number, the seven days, the enemies, the relics, the abilities.
- `game/src/random.js` — seeded randomness (same seed, same meadow).
- `game/src/world.js` — meadow generation: flowers, pond, bushes, dirt paths, grass, the hive, wax walls.
- `game/src/bee.js` — the guardian bee: steering, stinging, nectar, honey, the six abilities, the combo, relics.
- `game/src/enemies.js` — the five named kinds, the daily waves, hive chewing, the Hornet Queen.
- `game/src/audio.js` — synthesised WebAudio effects and the bee hum.
- `game/src/input.js` — mouse + keyboard steering and action keys.
- `game/src/render.js` — the bright meadow, the hive, the enemies, the particles, and the massive HUD.
- `game/src/ui.js` — title, pause, win and loss screens.
- `game/src/shots.js` — deterministic screenshot staging with an autopilot.
- `game/src/main.js` — the state machine, the fixed-step loop, the days, the wiring.
- `main.ts` — hands the game in: copies `game/` and `screenshots/` to `/output` and writes `dossier.json`.

Built for the make.fun bounty [best-game-01](https://make.fun/bounty/best-game-01) — "Make the best game".
