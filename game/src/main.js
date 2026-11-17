// HIVEWARDEN: the game owns the state machine (title, play, pause, win,
// lose), the fixed-step loop, the seven days, the waves, the queen, the
// particles, and the wiring between input, rules, audio and rendering. The
// rules themselves live in bee.js, world.js and enemies.js.
import { VIEW_W, VIEW_H, STEP, DAY_SECONDS, DAYS, RELICS, COLOURS, WIN_BONUS } from './config.js';
import { generateWorld } from './world.js';
import { makeBee, updateBee, applyRelic, endDay } from './bee.js';
import { spawnWave, spawnQueen, updateEnemies } from './enemies.js';
import { ensureAudio, playEvent, toggleMute } from './audio.js';
import { makeInput, steeringAngle, isDashing, consumePress, consumeActions, mousePoint } from './input.js';
import { drawWorld, drawHUD, cameraFor } from './render.js';
import { drawTitle, drawPause, drawWin, drawLose, hitButton } from './ui.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = VIEW_W;
canvas.height = VIEW_H;

const params = new URLSearchParams(window.location.search);
const seedParam = Number(params.get('seed'));
const seed = Number.isFinite(seedParam) && seedParam > 0 ? Math.floor(seedParam) : (Date.now() % 2147483647);
const shotName = params.get('shot');

/** A burst of glowing particles at a world point. */
function spawnParticles(game, x, y, color, count, speed) {
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const v = speed * (0.4 + Math.random() * 0.8);
    game.particles.push({
      x, y,
      vx: Math.cos(angle) * v,
      vy: Math.sin(angle) * v - 20,
      life: 0.7 + Math.random() * 0.5,
      maxLife: 1.2,
      size: 2 + Math.random() * 3.5,
      color,
    });
  }
}

function updateParticles(game, dt) {
  for (const p of game.particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 40 * dt;
    p.life -= dt;
  }
  game.particles = game.particles.filter(p => p.life > 0);
}

class Game {
  constructor() {
    this.best = Number(window.localStorage?.getItem('hivewarden-best') || 0);
    this.reset();
    this.screen = 'title';
    this.time = 0;
    this.elapsed = 0;
    this.particles = [];
    this.buttons = [];
    this.peakCombo = 0;
    this.bannerTimer = 0;
    this.shotMode = shotName !== null;
  }

  reset() {
    this.world = generateWorld(seed);
    this.bee = makeBee();
    this.bee.best = this.best;
    this.particles = [];
    this.elapsed = 0;
    this.peakCombo = 0;
    this.bannerTimer = 0;
    this.daySpawned = false;
    this.queenSpawned = false;
  }

  beginPlay() {
    this.reset();
    this.screen = 'play';
    this.startDay(1);
  }

  startDay(day) {
    this.bee.day = day;
    this.bee.dayTimer = 0;
    this.bannerTimer = 2.6;
    this.daySpawned = true;
    spawnWave(this.world, day);
    if (day === 7 && !this.queenSpawned) {
      this.queenSpawned = true;
      spawnQueen(this.world, this.events || []);
    }
  }

  toMenu() {
    this.screen = 'title';
  }

  /** After a step, move to the win/lose screen when the run is done. */
  finishIfOver() {
    if (this.bee.won && this.screen === 'play') {
      this.screen = 'win';
      const total = this.bee.score + WIN_BONUS + Math.max(0, 600 - Math.floor(this.elapsed)) * 2;
      if (total > this.best) {
        this.best = total;
        this.bee.best = total;
        try { window.localStorage?.setItem('hivewarden-best', String(total)); } catch {}
      }
    } else if (this.bee.dead && this.screen === 'play') {
      this.screen = 'lose';
    }
  }

  /** Advance the day clock: end of day, relic, next day or the queen. */
  advanceDay(events) {
    const bee = this.bee;
    if (bee.day < 7 && bee.dayTimer >= DAY_SECONDS) {
      // The day is cleared when its timer ends and the field is mostly
      // clear; stragglers are swept away by the dawn.
      if (this.world.enemies.length > 14) return;
      this.world.enemies = this.world.enemies.filter(e => e.kind === 'queen');
      endDay(bee, this.world, events);
      const relic = RELICS[bee.day - 1];
      if (relic) applyRelic(bee, this.world, relic);
      events.push({ type: 'day-clear' });
      this.startDay(bee.day);
    }
  }

  /** One fixed step of live play. */
  step(dt, steer, actions) {
    if (this.screen !== 'play') return;
    this.time += dt;
    this.elapsed += dt;
    if (this.bannerTimer > 0) this.bannerTimer -= dt;
    const events = [];
    this.events = events;
    updateBee(this.bee, this.world, steer, actions, dt, this.elapsed, events);
    updateEnemies(this.world, this.bee, dt, this.elapsed, events);
    this.peakCombo = Math.max(this.peakCombo, this.bee.combo);
    for (const event of events) {
      playEvent(event);
      if (event.type === 'nectar') spawnParticles(this, event.x, event.y, COLOURS.nectar, 6, 70);
      if (event.type === 'honey') spawnParticles(this, event.x, event.y, COLOURS.honey, 10, 90);
      if (event.type === 'sting') spawnParticles(this, event.x, event.y, '#fef08a', 4, 120);
      if (event.type === 'kill') spawnParticles(this, event.x, event.y, '#f472b6', 12, 140);
      if (event.type === 'sting-hit') spawnParticles(this, event.x, event.y, '#fca5a5', 5, 100);
      if (event.type === 'burst') spawnParticles(this, event.x, event.y, '#c084fc', 26, 200);
      if (event.type === 'swarm') spawnParticles(this, event.x, event.y, COLOURS.bee, 10, 100);
      if (event.type === 'wall') spawnParticles(this, event.x, event.y, COLOURS.wall, 8, 80);
      if (event.type === 'hive-chew') spawnParticles(this, event.x, event.y, '#dc2626', 6, 90);
      if (event.type === 'bee-stung') spawnParticles(this, event.x, event.y, '#f59e0b', 8, 110);
      if (event.type === 'queen') spawnParticles(this, event.x, event.y, '#7c2d12', 30, 160);
      if (event.type === 'queen-down') spawnParticles(this, event.x, event.y, '#fbbf24', 60, 240);
      if (event.type === 'hive-down') spawnParticles(this, event.x, event.y, '#78716c', 24, 100);
    }
    // Trickle-spawn reinforcements mid-day so the field never empties.
    if (this.bee.day < 7 && this.world.enemies.length < 3 && this.bee.dayTimer < DAY_SECONDS - 6) {
      spawnWave(this.world, this.bee.day);
    }
    this.advanceDay(events);
    updateParticles(this, dt);
    this.finishIfOver();
  }

  /** Draw the current screen. */
  draw() {
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    const camera = cameraFor(this.bee.x, this.bee.y);
    if (this.screen === 'title') {
      // A young bee works the meadow behind the title.
      drawWorld(ctx, this, camera, this.time);
      const drawn = drawTitle(ctx, this.best);
      this.buttons = drawn.buttons;
      return;
    }
    drawWorld(ctx, this, camera, this.time);
    if (this.screen === 'play' || this.screen === 'pause') {
      drawHUD(ctx, this);
    }
    if (this.screen === 'pause') {
      const drawn = drawPause(ctx);
      this.buttons = drawn.buttons;
    } else if (this.screen === 'win') {
      const drawn = drawWin(ctx, this);
      this.buttons = drawn.buttons;
    } else if (this.screen === 'lose') {
      const drawn = drawLose(ctx, this);
      this.buttons = drawn.buttons;
    } else {
      this.buttons = [];
    }
  }
}

const game = new Game();
const input = makeInput(canvas);
window.__game = game;

let last = performance.now();
let accumulator = 0;

function frame(now) {
  const frameDt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (game.screen === 'play') {
    accumulator += frameDt;
    while (accumulator >= STEP) {
      const angle = steeringAngle(input, game.bee, cameraFor(game.bee.x, game.bee.y), now);
      const actions = consumeActions(input);
      game.step(STEP, { angle, dash: isDashing(input) }, actions);
      accumulator -= STEP;
      if (game.screen !== 'play') { accumulator = 0; break; }
    }
  } else {
    game.time += frameDt;
  }

  // Keys: Enter starts or restarts, P pauses, M mutes.
  if (consumePress(input, 'Enter')) {
    if (game.screen === 'title' || game.screen === 'win' || game.screen === 'lose') {
      ensureAudio();
      playEvent({ type: 'click' });
      game.beginPlay();
    } else if (game.screen === 'pause') {
      game.screen = 'play';
    }
  }
  if (consumePress(input, 'KeyP') || consumePress(input, 'Escape')) {
    if (game.screen === 'play') game.screen = 'pause';
    else if (game.screen === 'pause') game.screen = 'play';
  }
  if (consumePress(input, 'KeyM')) {
    toggleMute();
  }

  game.draw();
  requestAnimationFrame(frame);
}

// Clicks: buttons first, then anywhere on the title/win/lose screens.
// A click on the field during play stings (handled by input's MouseSting).
canvas.addEventListener('pointerdown', () => {
  ensureAudio();
  const point = mousePoint(input);
  const label = hitButton(game.buttons, point.x, point.y);
  if (label) {
    playEvent({ type: 'click' });
    if (game.screen === 'title') game.beginPlay();
    else if (game.screen === 'pause') {
      if (label.includes('RESUME')) game.screen = 'play';
      else game.beginPlay();
    } else if (game.screen === 'win' || game.screen === 'lose') game.beginPlay();
    return;
  }
  if (game.screen === 'title' || game.screen === 'win' || game.screen === 'lose') {
    game.beginPlay();
  }
});

// Shot mode (?shot=boss|play|start|end): stage one deterministic frame,
// draw it, and tell the capture script the frame is ready.
if (shotName) {
  const screen = stageShot(game, shotName);
  game.screen = screen === 'title' ? 'title' : screen;
  if (screen === 'win' || screen === 'lose') game.finishIfOver();
  game.draw();
  window.__shotReady = true;
} else {
  window.__shotReady = false;
  requestAnimationFrame(frame);
  // The live game is ready once the first frame draws.
  requestAnimationFrame(() => { window.__shotReady = true; });
}

// Keep the page from scrolling on touch; the canvas takes the pointer.
document.addEventListener('touchmove', (event) => event.preventDefault(), { passive: false });
