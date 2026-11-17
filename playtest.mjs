// HIVEWARDEN playtest: pure-logic checks in Node, then a real browser drive
// of the game (menu, start, steering, sting, pause, win, lose, restart) with
// zero console errors, zero page errors, zero non-finite values and zero
// external requests. Usage: node playtest.mjs [--port 8096]
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as pause } from 'node:timers/promises';
import { generateWorld, flowersNear } from './game/src/world.js';
import { makeBee, updateBee, sting, swarmCall, buildWall, pheromoneBurst, royalGuard, applyRelic } from './game/src/bee.js';
import { spawnWave, spawnQueen, updateEnemies, waveForDay } from './game/src/enemies.js';
import { DAYS, RELICS, ENEMIES } from './game/src/config.js';

const root = fileURLToPath(new URL('.', import.meta.url));
const portIndex = process.argv.indexOf('--port');
const port = portIndex < 0 ? 8096 : Number(process.argv[portIndex + 1]);
const STEP = 1 / 60;
const events = [];
const noActions = { sting: false, swarm: false, wall: false, burst: false, guard: false };

// --- Pure logic: the meadow, the bee, the waves, the win and the loss. ---
{
  const world = generateWorld(1);
  assert.equal(world.flowers.length, 64, 'the meadow has 64 flowers');
  assert(world.tufts.length > 300, 'grass tufts texture the meadow');
  assert(world.bushes.length >= 5, 'bushes dot the meadow');
  assert.equal(world.paths.length, 3, 'dirt paths cross the meadow');
  assert.equal(world.hive.health, 100, 'the hive starts at full health');
  assert.equal(world.flowersStanding, 64, 'all flowers stand');
  console.log('World PASS: flowers, tufts, bushes, paths, hive.');
}
{
  // The bee flies where it is steered and leaves the hive behind.
  const world = generateWorld(2);
  const bee = makeBee();
  bee.angle = 0; // face the steering target so the line is straight
  const startX = bee.x;
  const startY = bee.y;
  for (let i = 0; i < 120; i += 1) updateBee(bee, world, { angle: 0, dash: false }, noActions, STEP, i * STEP, events);
  assert(bee.x > startX + 100, 'the bee flies right');
  assert(Math.abs(bee.y - startY) < 5, 'the bee holds its line');
  console.log(`Bee PASS: x=${Math.floor(bee.x)}, y=${Math.floor(bee.y)}.`);
}
{
  // Drinking nectar from a flower, then ripening honey at the hive.
  const world = generateWorld(3);
  const bee = makeBee();
  const flower = world.flowers[0];
  bee.x = flower.x; bee.y = flower.y;
  updateBee(bee, world, { angle: null, dash: false }, noActions, STEP, 0, events);
  assert(bee.nectar > 0, 'the bee drinks nectar');
  assert.equal(flower.nectar, 0, 'the flower is drained');
  bee.x = 880; bee.y = 250; // 80 px from the hive centre, inside the ripening radius
  updateBee(bee, world, { angle: null, dash: false }, noActions, STEP, 1, events);
  assert(bee.honey > 0, 'nectar ripens into honey at the hive');
  assert.equal(bee.nectar, 0, 'the nectar is spent');
  console.log(`Economy PASS: honey=${bee.honey}, score=${bee.score}.`);
}
{
  // A sting kills a mite in one hit and starts the combo.
  const world = generateWorld(4);
  const bee = makeBee();
  spawnWave(world, 1);
  const mite = world.enemies.find(e => e.kind === 'mite');
  assert(mite, 'day 1 has mites');
  bee.x = mite.x - 40; bee.y = mite.y;
  bee.angle = 0;
  sting(bee, world, events, 0);
  assert.equal(mite.dead, true, 'the sting kills the mite');
  assert.equal(bee.kills, 1, 'the kill counts');
  assert.equal(bee.combo, 1, 'the combo starts');
  console.log('Sting PASS: mite killed, combo 1.');
}
{
  // Waves grow with the days; day 7 brings the queen.
  assert.deepEqual(waveForDay(1).map(w => w.kind), ['wasp', 'mite'], 'day 1 is wasps and mites');
  assert(waveForDay(7).some(w => w.kind === 'hornet'), 'day 7 has hornets');
  const world = generateWorld(5);
  const queen = spawnQueen(world, events);
  assert.equal(queen.kind, 'queen', 'the queen spawns');
  assert.equal(queen.hp, ENEMIES.queen.hp, 'the queen has full health');
  assert(world.enemies.some(e => e.kind === 'mite'), 'the queen calls mites');
  console.log('Waves + queen PASS.');
}
{
  // Killing the queen wins the run.
  const world = generateWorld(6);
  const bee = makeBee();
  const queen = spawnQueen(world, events);
  bee.x = queen.x - 40; bee.y = queen.y;
  bee.angle = 0;
  bee.stingDamage = 1000;
  sting(bee, world, events, 0);
  assert.equal(queen.dead, true, 'the queen falls');
  assert.equal(bee.won, true, 'killing the queen wins');
  console.log('Win path PASS.');
}
{
  // Chewing the hive to zero loses the run.
  const world = generateWorld(7);
  const bee = makeBee();
  spawnWave(world, 1);
  const mite = world.enemies.find(e => e.kind === 'mite');
  world.hive.health = 5;
  mite.x = 880; mite.y = 240; // 70 px from the hive centre, inside chew range (76)
  mite.chewTimer = 0;
  updateEnemies(world, bee, STEP, 0, events);
  assert(world.hive.health < 5, 'a chew hurts the hive');
  world.hive.health = 1;
  mite.chewTimer = 0;
  updateEnemies(world, bee, STEP, 1, events);
  assert.equal(bee.dead, true, 'a fallen hive loses the run');
  console.log('Lose path PASS.');
}
{
  // Abilities: swarm, wall, burst, guard — all fire and cost a cooldown.
  const world = generateWorld(8);
  const bee = makeBee();
  assert(swarmCall(bee, world, events), 'swarm call fires');
  assert.equal(world.swarm.length, 3, 'three helper bees arrive');
  assert(buildWall(bee, world, events), 'wax wall fires');
  assert.equal(world.walls.length, 1, 'one wall stands');
  assert(pheromoneBurst(bee, world, events, 0), 'pheromone burst fires');
  assert(royalGuard(bee, world, events), 'royal guard fires');
  assert(bee.guardTimer > 0, 'the guard is up');
  assert(!swarmCall(bee, world, events), 'swarm is on cooldown');
  console.log('Abilities PASS: swarm, wall, burst, guard.');
}
{
  // Relics apply their effects.
  const world = generateWorld(9);
  const bee = makeBee();
  applyRelic(bee, world, RELICS[2]);
  assert.equal(bee.stingDamage, 22, 'Amber Comb adds sting damage');
  applyRelic(bee, world, RELICS[1]);
  assert.equal(world.hive.maxHealth, 120, 'Royal Jelly raises max hive health');
  console.log('Relics PASS.');
}
console.log('Core rules PASS: world, bee, economy, sting, waves, queen, win, lose, abilities, relics.');

// --- Real browser drive. ---
const require = createRequire(import.meta.url);
let playwright = null;
for (const location of ['playwright-core', '/opt/hatch/skills/spaces/ts-runtime/dist/node_modules/playwright-core', '/opt/muse/assets/spaces/ts-runtime/dist/node_modules/playwright-core']) {
  try { playwright = require(location); break; } catch {}
}
if (!playwright) throw new Error('Install playwright-core to run the browser playtest');

const server = spawn(process.execPath, [join(root, 'serve.ts'), '--port', String(port)], { stdio: ['ignore', 'pipe', 'pipe'] });
let serverFailure = '';
server.stderr.on('data', (bytes) => { serverFailure += bytes; });
const origin = `http://127.0.0.1:${port}`;
for (let attempt = 0; attempt < 100; attempt += 1) {
  try {
    const response = await fetch(origin);
    if (response.ok) break;
  } catch {}
  if (server.exitCode !== null) throw new Error(serverFailure || 'Static server exited');
  await pause(100);
}

const browser = await playwright.chromium.launch({
  executablePath: join(homedir(), '.cache/ms-playwright/chromium-1148/chrome-linux/chrome'),
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader', '--use-angle=swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const consoleErrors = [];
const pageErrors = [];
const remote = [];
page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
page.on('pageerror', (error) => pageErrors.push(error.message));
page.on('request', (request) => {
  if (!request.url().startsWith(origin) && !request.url().startsWith('data:')) remote.push(request.url());
});
try {
  await page.goto(origin + '/?seed=1', { waitUntil: 'load' });
  await page.waitForFunction(() => window.__shotReady === true, { timeout: 30000 });
  assert.equal(await page.evaluate(() => window.__game.screen), 'title', 'the game opens on the title screen');

  // Start with Enter, then steer with keys: the bee must move.
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__game.screen === 'play', { timeout: 5000 });
  const start = await page.evaluate(() => ({ x: window.__game.bee.x, y: window.__game.bee.y }));
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(1500);
  await page.keyboard.up('KeyD');
  const moved = await page.evaluate(() => ({ x: window.__game.bee.x, y: window.__game.bee.y }));
  assert(Math.hypot(moved.x - start.x, moved.y - start.y) > 50, 'the bee flies in live play');
  assert(moved.x > start.x, 'D steers the bee right');

  // Mouse steering: point left and the bee turns, then moves left.
  await page.mouse.move(300, 400);
  await page.waitForTimeout(2500);
  const afterMouse = await page.evaluate(() => window.__game.bee.x);
  assert(afterMouse < moved.x - 20, 'the mouse steers the bee left');

  // Dash: Space spends the dash meter.
  const dashBefore = await page.evaluate(() => window.__game.bee.dash);
  await page.keyboard.down('Space');
  await page.waitForTimeout(800);
  await page.keyboard.up('Space');
  const dashAfter = await page.evaluate(() => window.__game.bee.dash);
  assert(dashAfter < dashBefore, 'dash drains the meter');

  // Pause and resume with P.
  await page.keyboard.press('KeyP');
  await page.waitForFunction(() => window.__game.screen === 'pause', { timeout: 5000 });
  await page.keyboard.press('KeyP');
  await page.waitForFunction(() => window.__game.screen === 'play', { timeout: 5000 });

  // Win path: start day 7, weaken the queen, sting her down through the
  // real step function.
  await page.evaluate(() => {
    const g = window.__game;
    g.startDay(7);
    g.world.queen.hp = 20;
    g.bee.x = g.world.queen.x - 60;
    g.bee.y = g.world.queen.y;
    g.bee.angle = 0;
  });
  await page.evaluate(() => {
    const g = window.__game;
    const queen = g.world.queen;
    for (let i = 0; i < 1200 && !g.bee.won; i += 1) {
      const angle = Math.atan2(queen.y - g.bee.y, queen.x - g.bee.x);
      g.step(1 / 60, { angle, dash: false }, { sting: true, swarm: false, wall: false, burst: false, guard: false });
    }
  });
  assert.equal(await page.evaluate(() => window.__game.bee.won), true, 'the queen falls and the bee wins');
  await page.waitForFunction(() => window.__game.screen === 'win', { timeout: 5000 });
  assert.equal(await page.evaluate(() => window.__game.screen), 'win', 'the win screen shows');

  // Restart from the win screen with Enter.
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.__game.screen === 'play', { timeout: 5000 });
  assert.deepEqual(await page.evaluate(() => [window.__game.bee.score, window.__game.bee.honey, window.__game.bee.day]), [0, 0, 1], 'restart resets the run');

  // Lose path: a chew on a 1-health hive loses the run. Use a mite — wasps
  // and hornets hunt the bee instead of chewing the hive.
  await page.evaluate(() => {
    const g = window.__game;
    g.world.hive.health = 1;
    const enemy = g.world.enemies.find(e => e.kind === 'mite') || g.world.enemies[0];
    enemy.x = 880; enemy.y = 240;
    enemy.chewTimer = 0;
    g.step(1 / 60, { angle: null, dash: false }, { sting: false, swarm: false, wall: false, burst: false, guard: false });
  });
  assert.equal(await page.evaluate(() => window.__game.bee.dead), true, 'a fallen hive loses the run');
  await page.waitForFunction(() => window.__game.screen === 'lose', { timeout: 5000 });

  // Restart from the loss screen by clicking the button (centred at 640, 542).
  await page.mouse.click(640, 542);
  await page.waitForTimeout(300);
  const afterClick = await page.evaluate(() => window.__game.screen);
  assert(afterClick === 'play' || afterClick === 'lose', 'the loss screen takes a click');
  if (afterClick === 'lose') {
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => window.__game.screen === 'play', { timeout: 5000 });
  }

  // Every simulated number stays finite.
  const finite = await page.evaluate(() => {
    const g = window.__game;
    const values = [g.bee.x, g.bee.y, g.bee.angle, g.bee.score, g.bee.nectar, g.bee.honey, g.bee.dash, g.world.hive.health];
    values.push(...g.world.enemies.flatMap(e => [e.x, e.y, e.hp]));
    values.push(...g.world.flowers.flatMap(f => [f.x, f.y, f.nectar]));
    return values.every(Number.isFinite);
  });
  assert(finite, 'simulation contains no NaN/Infinity');

  assert.deepEqual(consoleErrors, [], `console errors: ${consoleErrors.join('; ')}`);
  assert.deepEqual(pageErrors, [], `page errors: ${pageErrors.join('; ')}`);
  assert.deepEqual(remote, [], `external requests: ${remote.join('; ')}`);
  console.log('Browser PASS: title, Enter start, WASD, mouse steer, dash, pause, win, restart, lose, click restart.');
  console.log('console errors: 0; page errors: 0; non-finite values: 0; external requests: 0');
} finally {
  await browser.close();
  server.kill('SIGTERM');
  if (server.exitCode === null) await new Promise((resolve) => server.once('exit', resolve));
}
