// Screenshot staging: each ?shot= name plays the real rules forward from
// a fresh world for a fixed number of steps, steered by a simple autopilot
// (chase the nearest enemy, sting in range, drink nectar on the way), so the
// frame is what a real game looks like and the same seed always gives the
// same frame. The cover shot is the day-7 boss fight — the densest state.
import { STEP, WORLD_W, WORLD_H, HIVE_X, HIVE_Y, DAY_SECONDS, BURST_RADIUS, RELICS } from './config.js';
import { clamp, angleTo, dist } from './random.js';
import { nearestEnemy, nearestFlower } from './world.js';
import { spawnWave, spawnQueen } from './enemies.js';
import { applyRelic } from './bee.js';

const START_SECONDS = 6;
const PLAY_SECONDS = 20;
const BOSS_SECONDS = 7;
const END_LIMIT_SECONDS = 120;

/**
 * The autopilot's steering. It guards the hive first: any enemy close to
 * the hive becomes the target. Otherwise it chases the nearest enemy and
 * stings in range, or drinks nectar. It fires the burst into a crowd and
 * calls the swarm when the field is thick. Returns { angle, dash, actions }.
 */
export function autopilotAction(game) {
  const { bee, world } = game;
  let target = null;
  let bestD = Infinity;
  for (const enemy of world.enemies) {
    if (enemy.dead) continue;
    const dHive = dist(enemy.x, enemy.y, HIVE_X, HIVE_Y);
    if (dHive < 300) {
      const d = dist(bee.x, bee.y, enemy.x, enemy.y);
      if (d < bestD) { bestD = d; target = enemy; }
    }
  }
  if (!target) target = nearestEnemy(world, bee.x, bee.y, 520);
  let angle = null;
  let sting = false;
  if (target) {
    const d = dist(bee.x, bee.y, target.x, target.y);
    angle = angleTo(bee.x, bee.y, target.x, target.y);
    if (d < 110) sting = true;
  } else {
    const flower = nearestFlower(world, bee.x, bee.y, 700);
    if (flower) angle = angleTo(bee.x, bee.y, flower.x, flower.y);
    else angle = angleTo(bee.x, bee.y, HIVE_X, HIVE_Y);
  }
  // Burst into a crowd, swarm when the field is thick.
  let near = 0;
  for (const enemy of world.enemies) {
    if (!enemy.dead && dist(bee.x, bee.y, enemy.x, enemy.y) < BURST_RADIUS) near += 1;
  }
  const burst = near >= 3 && bee.cooldowns.burst <= 0;
  const swarm = world.enemies.length >= 10 && bee.cooldowns.swarm <= 0;
  return { angle, dash: false, sting, burst, swarm };
}

/** Step the game forward with the autopilot for `seconds` of play. */
function playForward(game, seconds) {
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    if (game.bee.dead || game.bee.won) break;
    const action = autopilotAction(game);
    game.step(STEP, { angle: action.angle, dash: action.dash }, { sting: action.sting, swarm: action.swarm, wall: false, burst: action.burst, guard: false });
  }
}

/** Dress the run with mid-game numbers so the HUD reads deep and earned. */
function dressRun(game, { day, score, kills, combo, nectar, pollen, honey, relics }) {
  const bee = game.bee;
  bee.day = day;
  bee.score = score;
  bee.kills = kills;
  bee.combo = combo;
  bee.comboTimer = game.elapsed;
  bee.nectar = nectar;
  bee.pollen = pollen;
  bee.honey = honey;
  bee.relics = [];
  game.peakCombo = Math.max(game.peakCombo, combo);
  // The relics listed are earned, so their effects apply (sting, dash, ...).
  for (const name of relics) {
    const relic = RELICS.find(r => r && r.name === name);
    if (relic) applyRelic(bee, game.world, relic);
  }
}

/**
 * Set the game to the named scene and return the screen to draw.
 * 'boss' is the day-7 queen fight (the cover); 'play' is day 4 mid-game;
 * 'end' is the win screen after the queen falls; 'start' is the title over
 * a living meadow.
 */
export function stageShot(game, name) {
  if (name === 'play') {
    game.beginPlay();
    // Jump to day 4: clear days 1-3 instantly, then play day 4 for real.
    game.bee.day = 4;
    game.bee.dayTimer = 12;
    game.world.enemies = [];
    spawnWave(game.world, 4);
    spawnWave(game.world, 4);
    dressRun(game, { day: 4, score: 1240, kills: 31, combo: 4, nectar: 18, pollen: 37, honey: 42, relics: ['Royal Jelly', 'Amber Comb', 'Golden Pollen'] });
    playForward(game, PLAY_SECONDS);
    return 'play';
  }
  if (name === 'boss') {
    game.beginPlay();
    // Day 7: the queen is here, the field is thick with raiders.
    game.bee.day = 7;
    game.bee.dayTimer = 24;
    game.world.enemies = [];
    spawnQueen(game.world, []);
    spawnWave(game.world, 7);
    spawnWave(game.world, 7);
    // The queen is already hurt and the bee is closing in on her — but the
    // fight is still on, so the cover shows a real boss fight, not a corpse.
    const queen = game.world.queen;
    queen.hp = Math.floor(queen.maxHp * 0.85);
    game.bee.x = queen.x - 260;
    game.bee.y = queen.y - 180;
    game.bee.angle = angleTo(game.bee.x, game.bee.y, queen.x, queen.y);
    dressRun(game, { day: 7, score: 2380, kills: 58, combo: 7, nectar: 24, pollen: 61, honey: 87, relics: ['Royal Jelly', 'Amber Comb', 'Golden Pollen', 'Sunpetal', 'Queen\u2019s Crown'] });
    game.bannerTimer = 0;
    playForward(game, BOSS_SECONDS);
    return 'play';
  }
  if (name === 'end') {
    game.beginPlay();
    // Day 7, the queen nearly dead; the autopilot hunts her down.
    game.bee.day = 7;
    game.bee.dayTimer = 30;
    game.world.enemies = [];
    spawnQueen(game.world, []);
    const queen = game.world.queen;
    queen.hp = 24;
    game.bee.x = queen.x - 140;
    game.bee.y = queen.y - 90;
    game.bee.angle = angleTo(game.bee.x, game.bee.y, queen.x, queen.y);
    dressRun(game, { day: 7, score: 2610, kills: 63, combo: 5, nectar: 12, pollen: 74, honey: 96, relics: ['Royal Jelly', 'Amber Comb', 'Golden Pollen', 'Sunpetal', 'Queen\u2019s Crown'] });
    game.bannerTimer = 0;
    const steps = Math.floor(END_LIMIT_SECONDS / STEP);
    for (let i = 0; i < steps; i += 1) {
      if (game.bee.won || game.bee.dead) break;
      const action = autopilotAction(game);
      game.step(STEP, { angle: action.angle, dash: action.dash }, { sting: action.sting, swarm: action.swarm, wall: false, burst: action.burst, guard: false });
    }
    if (!game.bee.won && !game.bee.dead) {
      // The staged win: sting the queen down through the real rules.
      const q = game.world.queen;
      game.bee.x = q.x - 40;
      game.bee.y = q.y;
      game.bee.angle = angleTo(game.bee.x, game.bee.y, q.x, q.y);
      for (let i = 0; i < 600 && !game.bee.won; i += 1) {
        game.step(STEP, { angle: game.bee.angle, dash: false }, { sting: true, swarm: false, wall: false, burst: false, guard: false });
      }
    }
    game.finishIfOver();
    return game.bee.won ? 'win' : 'lose';
  }
  // Default: the title screen over a living meadow.
  game.beginPlay();
  playForward(game, START_SECONDS);
  game.toMenu();
  return 'title';
}
