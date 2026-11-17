// Enemies: the five named kinds, the daily waves, the hive chewing, and
// the Hornet Queen. Wasps and hornets hunt the bee; mites, spiders and
// beetles march on the hive. Wax walls block them until chewed through.
import { WORLD_W, WORLD_H, HIVE_X, HIVE_Y, HIVE_CHEW_DAMAGE, HIVE_CHEW_SECONDS, DAYS, ENEMIES, QUEEN_SPAWN_MITES } from './config.js';
import { makeRandom, clamp, angleTo, turnToward, dist } from './random.js';
import { pushOutOfBushes, wallBlocking } from './world.js';

let spawnRand = makeRandom(99);

/** Build the wave list for a day: names + counts the HUD shows. */
export function waveForDay(day) {
  const spec = DAYS[day - 1];
  const list = [];
  if (spec.wasps) list.push({ kind: 'wasp', count: spec.wasps });
  if (spec.mites) list.push({ kind: 'mite', count: spec.mites });
  if (spec.spiders) list.push({ kind: 'spider', count: spec.spiders });
  if (spec.beetles) list.push({ kind: 'beetle', count: spec.beetles });
  if (spec.hornets) list.push({ kind: 'hornet', count: spec.hornets });
  return list;
}

/** Spawn one enemy of a kind at a random edge of the meadow. */
export function spawnEnemy(world, kind) {
  const def = ENEMIES[kind];
  const edge = Math.floor(spawnRand() * 4);
  let x = 40;
  let y = 40;
  if (edge === 0) { x = 60 + spawnRand() * (WORLD_W - 120); y = WORLD_H - 40; }
  else if (edge === 1) { x = 60 + spawnRand() * (WORLD_W - 120); y = 300; }
  else if (edge === 2) { x = 40; y = 320 + spawnRand() * (WORLD_H - 360); }
  else { x = WORLD_W - 40; y = 320 + spawnRand() * (WORLD_H - 360); }
  const enemy = {
    kind,
    name: def.name,
    x, y,
    angle: angleTo(x, y, HIVE_X, HIVE_Y),
    hp: def.hp,
    maxHp: def.hp,
    speed: def.speed * (0.9 + spawnRand() * 0.2),
    radius: def.radius,
    damage: def.damage,
    colour: def.colour,
    dark: def.dark,
    huntsBee: def.huntsBee,
    chewTimer: 0,
    wobble: spawnRand() * Math.PI * 2,
    dead: false,
  };
  world.enemies.push(enemy);
  return enemy;
}

/** Spawn a whole wave (a day's list) across the meadow edges. */
export function spawnWave(world, day) {
  const spawned = [];
  for (const entry of waveForDay(day)) {
    for (let i = 0; i < entry.count; i += 1) spawned.push(spawnEnemy(world, entry.kind));
  }
  return spawned;
}

/** Spawn the Hornet Queen at the south gate with a fanfare of mites. */
export function spawnQueen(world, events) {
  const def = ENEMIES.queen;
  const queen = {
    kind: 'queen',
    name: 'Hornet Queen',
    x: WORLD_W / 2,
    y: WORLD_H - 60,
    angle: -Math.PI / 2,
    hp: def.hp,
    maxHp: def.hp,
    speed: def.speed,
    radius: def.radius,
    damage: def.damage,
    colour: def.colour,
    dark: def.dark,
    huntsBee: true,
    chewTimer: 0,
    wobble: 0,
    miteTimer: 4,
    dead: false,
  };
  world.queen = queen;
  world.enemies.push(queen);
  for (let i = 0; i < QUEEN_SPAWN_MITES; i += 1) spawnEnemy(world, 'mite');
  events.push({ type: 'queen', x: queen.x, y: queen.y });
  return queen;
}

/**
 * One fixed step for every enemy. Hunters chase the bee; the rest march on
 * the hive and chew it. Walls block the march until chewed through.
 */
export function updateEnemies(world, bee, dt, now, events) {
  const hive = world.hive;
  for (const enemy of world.enemies) {
    if (enemy.dead) continue;
    enemy.chewTimer -= dt;
    enemy.wobble += dt * 3;

    // The queen calls mites while she lives.
    if (enemy.kind === 'queen') {
      enemy.miteTimer -= dt;
      if (enemy.miteTimer <= 0) {
        enemy.miteTimer = 6;
        for (let i = 0; i < QUEEN_SPAWN_MITES; i += 1) spawnEnemy(world, 'mite');
        events.push({ type: 'queen-call', x: enemy.x, y: enemy.y });
      }
    }

    // Pick the target: hunters go for the bee, the rest for the hive.
    const hunt = enemy.huntsBee && dist(enemy.x, enemy.y, bee.x, bee.y) < 420;
    const tx = hunt ? bee.x : HIVE_X;
    const ty = hunt ? bee.y : HIVE_Y;
    const to = angleTo(enemy.x, enemy.y, tx, ty);
    const wobble = enemy.kind === 'mite' ? Math.sin(enemy.wobble) * 0.5 : 0;
    enemy.angle += turnToward(enemy.angle, to + wobble, 3.2 * dt);

    const dTarget = dist(enemy.x, enemy.y, tx, ty);
    const stopAt = hunt ? bee.radius + enemy.radius + 4 : hive.radius + enemy.radius - 6;
    if (dTarget > stopAt) {
      // A wax wall in the way: stop and chew it.
      const nx = enemy.x + Math.cos(enemy.angle) * enemy.speed * dt;
      const ny = enemy.y + Math.sin(enemy.angle) * enemy.speed * dt;
      const wall = wallBlocking(world, nx, ny, enemy.radius);
      if (wall) {
        if (enemy.chewTimer <= 0) {
          enemy.chewTimer = HIVE_CHEW_SECONDS;
          wall.hp -= enemy.damage;
          events.push({ type: 'wall-chew', x: wall.x, y: wall.y });
          if (wall.hp <= 0) {
            world.walls = world.walls.filter(w => w !== wall);
            events.push({ type: 'wall-down', x: wall.x, y: wall.y });
          }
        }
      } else {
        enemy.x = nx;
        enemy.y = ny;
        const pushed = pushOutOfBushes(world, enemy.x, enemy.y, enemy.radius);
        enemy.x = pushed.x;
        enemy.y = pushed.y;
        enemy.x = clamp(enemy.x, enemy.radius, WORLD_W - enemy.radius);
        enemy.y = clamp(enemy.y, enemy.radius, WORLD_H - enemy.radius);
      }
    } else if (!hunt) {
      // At the hive: chew the honeycomb, unless the Royal Guard is up.
      if (bee.guardTimer > 0) {
        events.push({ type: 'guard-block', x: enemy.x, y: enemy.y });
      } else if (enemy.chewTimer <= 0) {
        enemy.chewTimer = HIVE_CHEW_SECONDS;
        hive.health -= HIVE_CHEW_DAMAGE;
        events.push({ type: 'hive-chew', x: enemy.x, y: enemy.y, damage: HIVE_CHEW_DAMAGE });
        if (hive.health <= 0) {
          hive.health = 0;
          bee.dead = true;
          events.push({ type: 'hive-down', x: HIVE_X, y: HIVE_Y });
        }
      }
    } else {
      // A hunter touching the bee stings it — the bee has no health of its
      // own, so a sting knocks it back and scatters its nectar instead.
      if (enemy.chewTimer <= 0) {
        enemy.chewTimer = 1.4;
        const lost = Math.min(bee.nectar, 3);
        bee.nectar -= lost;
        bee.combo = 0;
        const away = angleTo(bee.x, bee.y, enemy.x, enemy.y) + Math.PI;
        bee.x = clamp(bee.x + Math.cos(away) * 60, bee.radius, WORLD_W - bee.radius);
        bee.y = clamp(bee.y + Math.sin(away) * 60, bee.radius, WORLD_H - bee.radius);
        events.push({ type: 'bee-stung', x: bee.x, y: bee.y, lost });
      }
    }
  }
  world.enemies = world.enemies.filter(e => !e.dead);
}
