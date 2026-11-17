// The guardian bee: steering, stinging, nectar, honey, the six named
// abilities, the combo, and the relics earned at the end of each day.
import {
  BEE_SPEED, BEE_RADIUS, DASH_SPEED, DASH_DRAIN, DASH_REGEN, TURN_RATE,
  STING_RANGE, STING_DAMAGE, STING_COOLDOWN, STING_ARC, WORLD_W, WORLD_H,
  HIVE_X, HIVE_Y, HIVE_RADIUS, NECTAR_PER_FLOWER, HONEY_PER_NECTAR,
  NECTAR_SCORE, KILL_SCORE, DAY_CLEAR_SCORE, COMBO_WINDOW, SWARM_BEES,
  SWARM_LIFE, WALL_LIFE, WALL_HP, BURST_RADIUS, BURST_DAMAGE, GUARD_SECONDS,
  ENEMIES, ABILITIES,
} from './config.js';
import { clamp, turnToward, angleTo, dist } from './random.js';
import { flowersNear, nearestEnemy, addWall } from './world.js';

export function makeBee() {
  return {
    x: HIVE_X,
    y: HIVE_Y + HIVE_RADIUS + 90,
    angle: -Math.PI / 2,
    speed: BEE_SPEED,
    radius: BEE_RADIUS,
    // Economy.
    nectar: 0,
    pollen: 0,
    honey: 0,
    score: 0,
    best: 0,
    // Run state.
    combo: 0,
    comboTimer: 0,
    kills: 0,
    day: 1,
    dayTimer: 0,
    relics: [],
    dash: 100,
    stingTimer: 0,
    stingDamage: STING_DAMAGE,
    stingCooldown: STING_COOLDOWN,
    nectarMult: 1,
    dashMult: 1,
    swarmBonus: 0,
    cooldowns: { sting: 0, swarm: 0, wall: 0, burst: 0, dash: 0, guard: 0 },
    guardTimer: 0,
    won: false,
    dead: false,
  };
}

/** Apply a relic earned at the end of a day. */
export function applyRelic(bee, world, relic) {
  if (!relic) return;
  bee.relics.push(relic.name);
  if (relic.heal) {
    world.hive.maxHealth += relic.maxHive || 0;
    world.hive.health = Math.min(world.hive.maxHealth, world.hive.health + relic.heal);
  }
  if (relic.sting) bee.stingDamage += relic.sting;
  if (relic.nectar) bee.nectarMult *= relic.nectar;
  if (relic.dash) bee.dashMult *= relic.dash;
  if (relic.swarm) bee.swarmBonus += relic.swarm;
  if (relic.cooldown) bee.stingCooldown /= relic.cooldown;
}

/** A sting hit on an enemy: damage, score, combo, particles event. */
function damageEnemy(bee, enemy, damage, events, now) {
  enemy.hp -= damage;
  if (enemy.hp <= 0 && !enemy.dead) {
    enemy.dead = true;
    bee.kills += 1;
    if (now - bee.comboTimer < COMBO_WINDOW || bee.combo === 0) bee.combo += 1;
    else bee.combo = 1;
    bee.comboTimer = now;
    const mult = 1 + Math.min(bee.combo - 1, 9) * 0.25;
    const gained = Math.round(KILL_SCORE[enemy.kind] * mult);
    bee.score += gained;
    events.push({ type: 'kill', x: enemy.x, y: enemy.y, kind: enemy.kind, score: gained, combo: bee.combo });
    if (enemy.kind === 'queen') {
      bee.won = true;
      events.push({ type: 'queen-down', x: enemy.x, y: enemy.y });
    }
  } else {
    events.push({ type: 'sting-hit', x: enemy.x, y: enemy.y });
  }
}

/** The sting: an arc in front of the bee, on click or J. */
export function sting(bee, world, events, now) {
  if (bee.cooldowns.sting > 0) return false;
  bee.cooldowns.sting = bee.stingCooldown;
  let hitAny = false;
  for (const enemy of world.enemies) {
    if (enemy.dead) continue;
    const d = dist(bee.x, bee.y, enemy.x, enemy.y);
    if (d > STING_RANGE + enemy.radius) continue;
    const to = angleTo(bee.x, bee.y, enemy.x, enemy.y);
    let diff = Math.abs(to - bee.angle);
    while (diff > Math.PI) diff = Math.abs(diff - Math.PI * 2);
    if (diff > STING_ARC) continue;
    damageEnemy(bee, enemy, bee.stingDamage, events, now);
    hitAny = true;
  }
  events.push({ type: 'sting', x: bee.x + Math.cos(bee.angle) * 30, y: bee.y + Math.sin(bee.angle) * 30, hit: hitAny });
  return hitAny;
}

/** Swarm Call (Q): helper bees fight beside the guardian for a while. */
export function swarmCall(bee, world, events) {
  if (bee.cooldowns.swarm > 0) return false;
  bee.cooldowns.swarm = ABILITIES[1].cooldown;
  const count = SWARM_BEES + bee.swarmBonus;
  for (let i = 0; i < count; i += 1) {
    const a = (i / count) * Math.PI * 2;
    world.swarm.push({
      x: bee.x + Math.cos(a) * 50,
      y: bee.y + Math.sin(a) * 50,
      angle: a,
      life: SWARM_LIFE,
      stingTimer: 0,
    });
  }
  events.push({ type: 'swarm', x: bee.x, y: bee.y, count });
  return true;
}

/** Wax Wall (E): a golden wall that blocks enemies until chewed through. */
export function buildWall(bee, world, events) {
  if (bee.cooldowns.wall > 0) return false;
  bee.cooldowns.wall = ABILITIES[2].cooldown;
  const x = bee.x + Math.cos(bee.angle) * 70;
  const y = bee.y + Math.sin(bee.angle) * 70;
  const wall = addWall(world, clamp(x, 60, WORLD_W - 60), clamp(y, 60, WORLD_H - 60), WALL_LIFE, WALL_HP);
  wall.angle = bee.angle + Math.PI / 2;
  events.push({ type: 'wall', x: wall.x, y: wall.y });
  return true;
}

/** Pheromone Burst (Shift): a radial blast that hurts everything near. */
export function pheromoneBurst(bee, world, events, now) {
  if (bee.cooldowns.burst > 0) return false;
  bee.cooldowns.burst = ABILITIES[3].cooldown;
  for (const enemy of world.enemies) {
    if (enemy.dead) continue;
    if (dist(bee.x, bee.y, enemy.x, enemy.y) < BURST_RADIUS + enemy.radius) {
      damageEnemy(bee, enemy, BURST_DAMAGE, events, now);
    }
  }
  events.push({ type: 'burst', x: bee.x, y: bee.y });
  return true;
}

/** Royal Guard (R): the hive is shielded for a while; chews bounce off. */
export function royalGuard(bee, world, events) {
  if (bee.cooldowns.guard > 0) return false;
  bee.cooldowns.guard = ABILITIES[5].cooldown;
  bee.guardTimer = GUARD_SECONDS;
  events.push({ type: 'guard', x: world.hive.x, y: world.hive.y });
  return true;
}

/** Helper bees: chase the nearest enemy and sting it. */
function updateSwarm(bee, world, dt, now, events) {
  for (const helper of world.swarm) {
    helper.life -= dt;
    helper.stingTimer -= dt;
    let target = null;
    let bestD = Infinity;
    for (const enemy of world.enemies) {
      if (enemy.dead) continue;
      const d = dist(helper.x, helper.y, enemy.x, enemy.y);
      if (d < bestD) { bestD = d; target = enemy; }
    }
    if (!target) continue;
    const to = angleTo(helper.x, helper.y, target.x, target.y);
    helper.angle += turnToward(helper.angle, to, 8 * dt);
    const speed = 300;
    helper.x += Math.cos(helper.angle) * speed * dt;
    helper.y += Math.sin(helper.angle) * speed * dt;
    helper.x = clamp(helper.x, 10, WORLD_W - 10);
    helper.y = clamp(helper.y, 10, WORLD_H - 10);
    if (bestD < 40 && helper.stingTimer <= 0) {
      helper.stingTimer = 0.5;
      damageEnemy(bee, target, 10, events, now);
    }
  }
  world.swarm = world.swarm.filter(h => h.life > 0);
}

/** One fixed step of the guardian bee. `steer` is { angle, dash, sting }. */
export function updateBee(bee, world, steer, actions, dt, now, events) {
  // Cooldowns tick down.
  for (const key of Object.keys(bee.cooldowns)) {
    if (bee.cooldowns[key] > 0) bee.cooldowns[key] -= dt;
  }
  if (bee.guardTimer > 0) bee.guardTimer -= dt;

  // Steering: turn toward the target angle, then fly forward.
  if (steer.angle !== null && steer.angle !== undefined) {
    bee.angle += turnToward(bee.angle, steer.angle, TURN_RATE * dt);
  }
  const dashing = steer.dash && bee.dash > 0;
  if (dashing) bee.dash = Math.max(0, bee.dash - DASH_DRAIN * bee.dashMult * dt);
  else bee.dash = Math.min(100, bee.dash + DASH_REGEN * bee.dashMult * dt);
  const speed = dashing ? DASH_SPEED : BEE_SPEED;
  bee.x += Math.cos(bee.angle) * speed * dt;
  bee.y += Math.sin(bee.angle) * speed * dt;
  bee.x = clamp(bee.x, BEE_RADIUS, WORLD_W - BEE_RADIUS);
  bee.y = clamp(bee.y, BEE_RADIUS, WORLD_H - BEE_RADIUS);

  // Nectar: flying over a flower drinks it.
  const near = [];
  flowersNear(world, bee.x, bee.y, BEE_RADIUS + 16, near);
  for (const flower of near) {
    if (flower.nectar <= 0) continue;
    const got = Math.min(NECTAR_PER_FLOWER, flower.nectar) * bee.nectarMult;
    flower.nectar -= Math.min(NECTAR_PER_FLOWER, flower.nectar);
    bee.nectar += got;
    bee.pollen += 1;
    bee.score += NECTAR_SCORE;
    events.push({ type: 'nectar', x: flower.x, y: flower.y, amount: got });
  }

  // Honey: carrying nectar to the hive ripens it into honey.
  const dHive = dist(bee.x, bee.y, HIVE_X, HIVE_Y);
  if (dHive < HIVE_RADIUS + 30 && bee.nectar > 0) {
    const made = Math.floor(bee.nectar) * HONEY_PER_NECTAR;
    bee.honey += made;
    bee.score += made * 2;
    events.push({ type: 'honey', x: HIVE_X, y: HIVE_Y - 40, amount: made });
    bee.nectar = 0;
  }

  // Actions from the player.
  if (actions.sting) sting(bee, world, events, now);
  if (actions.swarm) swarmCall(bee, world, events);
  if (actions.wall) buildWall(bee, world, events);
  if (actions.burst) pheromoneBurst(bee, world, events, now);
  if (actions.guard) royalGuard(bee, world, events);

  updateSwarm(bee, world, dt, now, events);

  // Combo decays.
  if (now - bee.comboTimer > COMBO_WINDOW) bee.combo = 0;

  // Day clock: when the day ends, the next day begins (or the queen comes).
  bee.dayTimer += dt;
}

/** End-of-day bookkeeping: score, relic, and the next day's waves. */
export function endDay(bee, world, events) {
  bee.score += DAY_CLEAR_SCORE;
  const relic = { day: bee.day, name: '' };
  // Relics are applied by the caller from RELICS[day]; this reports it.
  events.push({ type: 'day-clear', day: bee.day, score: DAY_CLEAR_SCORE });
  bee.day += 1;
  bee.dayTimer = 0;
  return relic;
}
