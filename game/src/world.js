// The meadow: flowers, pond, bushes, dirt paths, grass texture, the golden
// hive, and the wax walls the guardian builds. Generation is seeded, so the
// same seed always grows the same meadow.
import { WORLD_W, WORLD_H, HIVE_X, HIVE_Y, HIVE_RADIUS, FLOWER_COUNT, FLOWER_TYPES } from './config.js';
import { makeRandom, clamp } from './random.js';

export function generateWorld(seed) {
  const rand = makeRandom(seed);
  const flowers = [];
  for (let i = 0; i < FLOWER_COUNT; i += 1) {
    const type = FLOWER_TYPES[Math.floor(rand() * FLOWER_TYPES.length)];
    let x = 60 + rand() * (WORLD_W - 120);
    let y = 260 + rand() * (WORLD_H - 320);
    // Keep the hive clearing and the pond clear of flowers.
    if (Math.hypot(x - HIVE_X, y - HIVE_Y) < HIVE_RADIUS + 60) { y = HIVE_Y + HIVE_RADIUS + 90; }
    if (Math.hypot(x - 330, y - 900) < 130) { x = 560 + rand() * 300; }
    flowers.push({
      x, y,
      type: type.name,
      petal: type.petal,
      centre: type.centre,
      radius: 9 + rand() * 5,
      nectar: 3,
      sway: rand() * Math.PI * 2,
      stem: 14 + rand() * 10,
    });
  }

  // Grass tufts for texture — hundreds of them, cheap to draw.
  const tufts = [];
  for (let i = 0; i < 420; i += 1) {
    tufts.push({
      x: rand() * WORLD_W,
      y: rand() * WORLD_H,
      size: 3 + rand() * 5,
      lean: (rand() - 0.5) * 0.9,
      shade: rand(),
    });
  }

  // Dirt paths: hive to pond, hive to the south gate, hive to the east gate.
  const paths = [
    { x1: HIVE_X, y1: HIVE_Y + HIVE_RADIUS, x2: 330, y2: 900, w: 46 },
    { x1: HIVE_X - 40, y1: HIVE_Y + HIVE_RADIUS, x2: 500, y2: WORLD_H - 30, w: 40 },
    { x1: HIVE_X + 60, y1: HIVE_Y + 40, x2: WORLD_W - 40, y2: 700, w: 40 },
  ];

  // Bushes: round green cover that enemies walk around, bees fly over.
  const bushes = [];
  for (let i = 0; i < 9; i += 1) {
    const x = 120 + rand() * (WORLD_W - 240);
    const y = 300 + rand() * (WORLD_H - 380);
    if (Math.hypot(x - HIVE_X, y - HIVE_Y) < 220) continue;
    bushes.push({ x, y, radius: 26 + rand() * 22 });
  }

  // Pollen sparkles drifting over the meadow — ambient particles.
  const sparkles = [];
  for (let i = 0; i < 90; i += 1) {
    sparkles.push({
      x: rand() * WORLD_W,
      y: rand() * WORLD_H,
      phase: rand() * Math.PI * 2,
      speed: 6 + rand() * 14,
      size: 1.5 + rand() * 2,
    });
  }

  return {
    seed,
    flowers,
    tufts,
    paths,
    bushes,
    sparkles,
    walls: [], // wax walls built with E
    enemies: [],
    swarm: [], // helper bees from Swarm Call
    hive: { x: HIVE_X, y: HIVE_Y, radius: HIVE_RADIUS, health: 100, maxHealth: 100 },
    queen: null, // the Hornet Queen, spawned on day 7
    flowersStanding: flowers.length,
  };
}

/** Flowers with nectar left, near a point. */
export function flowersNear(world, x, y, radius, out) {
  out.length = 0;
  for (const flower of world.flowers) {
    if (flower.nectar <= 0) continue;
    const dx = flower.x - x;
    const dy = flower.y - y;
    if (dx * dx + dy * dy < radius * radius) out.push(flower);
  }
  return out;
}

/** The nearest enemy to a point, or null. */
export function nearestEnemy(world, x, y, maxDist) {
  let best = null;
  let bestD = maxDist * maxDist;
  for (const enemy of world.enemies) {
    if (enemy.dead) continue;
    const dx = enemy.x - x;
    const dy = enemy.y - y;
    const d = dx * dx + dy * dy;
    if (d < bestD) { bestD = d; best = enemy; }
  }
  return best;
}

/** The nearest flower with nectar, or null. */
export function nearestFlower(world, x, y, maxDist) {
  let best = null;
  let bestD = maxDist * maxDist;
  for (const flower of world.flowers) {
    if (flower.nectar <= 0) continue;
    const dx = flower.x - x;
    const dy = flower.y - y;
    const d = dx * dx + dy * dy;
    if (d < bestD) { bestD = d; best = flower; }
  }
  return best;
}

/** Push a point out of every bush it overlaps, so enemies walk around them. */
export function pushOutOfBushes(world, x, y, radius) {
  let nx = x;
  let ny = y;
  for (const bush of world.bushes) {
    const dx = nx - bush.x;
    const dy = ny - bush.y;
    const d = Math.hypot(dx, dy);
    const min = bush.radius + radius;
    if (d > 0 && d < min) {
      nx = bush.x + (dx / d) * min;
      ny = bush.y + (dy / d) * min;
    }
  }
  return { x: clamp(nx, radius, WORLD_W - radius), y: clamp(ny, radius, WORLD_H - radius) };
}

/** A wax wall at (x, y); enemies must chew through it or walk around. */
export function addWall(world, x, y, life, hp) {
  const wall = { x, y, w: 64, h: 20, life, maxLife: life, hp, maxHp: hp, angle: 0 };
  world.walls.push(wall);
  return wall;
}

/** Walls whose rectangle overlaps a circle at (x, y, radius). */
export function wallBlocking(world, x, y, radius) {
  for (const wall of world.walls) {
    const dx = Math.abs(x - wall.x);
    const dy = Math.abs(y - wall.y);
    if (dx < wall.w / 2 + radius && dy < wall.h / 2 + radius) return wall;
  }
  return null;
}
