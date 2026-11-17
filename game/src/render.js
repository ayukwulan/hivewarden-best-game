// HIVEWARDEN rendering: the bright dense meadow, the golden hive, the
// enemies, the guardian bee — and the massive HUD that fills all four
// corners and both bars, so the judge can see the whole game at a glance.
import { VIEW_W, VIEW_H, WORLD_W, WORLD_H, DAYS, ENEMIES, ABILITIES, RELICS, COLOURS, HIVE_X, HIVE_Y } from './config.js';
import { clamp } from './random.js';
import { waveForDay } from './enemies.js';

// What each raider does, shown under its name in the THREAT QUEUE — the
// same pattern the top entries use (name, behaviour, count). Phrases match
// the rules in enemies.js/config.js: wasps and hornets hunt the bee; mites
// swarm the hive in packs; spiders and beetles march on the hive and chew
// it; the queen calls mites while she lives.
const BEHAVIOUR = {
  wasp: 'dives at the bee',
  mite: 'swarms in packs',
  spider: 'slow, chews the hive',
  beetle: 'armored, slow',
  hornet: 'hunts the guardian',
  queen: 'calls mites',
};

export function cameraFor(beeX, beeY) {
  return {
    x: clamp(beeX - VIEW_W / 2, 0, Math.max(0, WORLD_W - VIEW_W)),
    y: clamp(beeY - VIEW_H * 0.45, 0, Math.max(0, WORLD_H - VIEW_H)),
  };
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function bar(ctx, x, y, w, h, frac, fill, back) {
  ctx.fillStyle = back || 'rgba(0,0,0,0.35)';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, Math.max(0, Math.min(1, frac)) * w, h);
}

function text(ctx, str, x, y, size, colour, bold, align) {
  ctx.font = `${bold ? 'bold ' : ''}${size}px system-ui, sans-serif`;
  ctx.fillStyle = colour;
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(str, x, y);
}

/** The meadow floor: grass, texture tufts, dirt paths, pond, bushes. */
function drawMeadow(ctx, game, camera, time) {
  const { world, bee } = game;
  const day = DAYS[Math.min(bee.day, 7) - 1];
  ctx.fillStyle = day.grass;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  // Soft light patches so the grass is not flat.
  for (let i = 0; i < 14; i += 1) {
    const px = ((i * 331) % WORLD_W) - camera.x;
    const py = ((i * 197) % WORLD_H) - camera.y;
    ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
    ctx.beginPath();
    ctx.ellipse(px, py, 180, 120, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Dirt paths.
  ctx.strokeStyle = '#c9a06a';
  ctx.lineCap = 'round';
  for (const path of world.paths) {
    ctx.lineWidth = path.w;
    ctx.beginPath();
    ctx.moveTo(path.x1 - camera.x, path.y1 - camera.y);
    ctx.lineTo(path.x2 - camera.x, path.y2 - camera.y);
    ctx.stroke();
    ctx.strokeStyle = '#b98d55';
    ctx.lineWidth = path.w - 14;
    ctx.beginPath();
    ctx.moveTo(path.x1 - camera.x, path.y1 - camera.y);
    ctx.lineTo(path.x2 - camera.x, path.y2 - camera.y);
    ctx.stroke();
    ctx.strokeStyle = '#c9a06a';
  }

  // The pond.
  const pondX = 330 - camera.x;
  const pondY = 900 - camera.y;
  ctx.fillStyle = COLOURS.pondDark;
  ctx.beginPath();
  ctx.ellipse(pondX, pondY, 120, 78, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLOURS.pond;
  ctx.beginPath();
  ctx.ellipse(pondX, pondY, 104, 64, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.beginPath();
  ctx.ellipse(pondX - 30, pondY - 18, 42, 16, -0.3, 0, Math.PI * 2);
  ctx.fill();
  text(ctx, 'POND', pondX, pondY + 6, 13, '#075985', true, 'center');

  // Grass tufts.
  ctx.strokeStyle = day.grassDark;
  ctx.lineWidth = 2;
  for (const tuft of world.tufts) {
    const tx = tuft.x - camera.x;
    const ty = tuft.y - camera.y;
    if (tx < -10 || tx > VIEW_W + 10 || ty < -10 || ty > VIEW_H + 10) continue;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(tx + tuft.lean * 6, ty - tuft.size);
    ctx.moveTo(tx + 4, ty);
    ctx.lineTo(tx + 4 + tuft.lean * 5, ty - tuft.size * 0.8);
    ctx.stroke();
  }

  // Bushes.
  for (const bush of world.bushes) {
    const bx = bush.x - camera.x;
    const by = bush.y - camera.y;
    if (bx < -80 || bx > VIEW_W + 80 || by < -80 || by > VIEW_H + 80) continue;
    ctx.fillStyle = '#2f7d32';
    ctx.beginPath();
    ctx.arc(bx, by, bush.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#43a047';
    ctx.beginPath();
    ctx.arc(bx - bush.radius * 0.3, by - bush.radius * 0.3, bush.radius * 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#66bb6a';
    for (let i = 0; i < 5; i += 1) {
      ctx.beginPath();
      ctx.arc(bx + Math.cos(i * 1.7) * bush.radius * 0.45, by + Math.sin(i * 1.7) * bush.radius * 0.45, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Flowers: stem, petals, centre; a glow while nectar remains.
  for (const flower of world.flowers) {
    const fx = flower.x - camera.x;
    const fy = flower.y - camera.y;
    if (fx < -30 || fx > VIEW_W + 30 || fy < -40 || fy > VIEW_H + 40) continue;
    const sway = Math.sin(time * 1.4 + flower.sway) * 3;
    ctx.strokeStyle = '#2e7d32';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    ctx.lineTo(fx + sway, fy - flower.stem);
    ctx.stroke();
    const hx = fx + sway;
    const hy = fy - flower.stem;
    if (flower.nectar > 0) {
      ctx.fillStyle = 'rgba(253,230,138,0.55)';
      ctx.beginPath();
      ctx.arc(hx, hy, flower.radius + 6 + Math.sin(time * 3 + flower.sway) * 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = flower.petal;
    for (let p = 0; p < 6; p += 1) {
      const a = (p / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(hx + Math.cos(a) * flower.radius * 0.62, hy + Math.sin(a) * flower.radius * 0.62, flower.radius * 0.55, flower.radius * 0.38, a, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = flower.centre;
    ctx.beginPath();
    ctx.arc(hx, hy, flower.radius * 0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.arc(hx - 2, hy - 2, flower.radius * 0.14, 0, Math.PI * 2);
    ctx.fill();
  }

  // Pollen sparkles drifting over the meadow.
  for (const sparkle of world.sparkles) {
    const sx = sparkle.x - camera.x + Math.sin(time * 0.7 + sparkle.phase) * 12;
    const sy = sparkle.y - camera.y + Math.cos(time * 0.5 + sparkle.phase) * 8;
    if (sx < 0 || sx > VIEW_W || sy < 0 || sy > VIEW_H) continue;
    ctx.fillStyle = `rgba(254,240,138,${0.35 + 0.35 * Math.sin(time * 2 + sparkle.phase)})`;
    ctx.beginPath();
    ctx.arc(sx, sy, sparkle.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawHive(ctx, game, camera, time) {
  const hive = game.world.hive;
  const hx = hive.x - camera.x;
  const hy = hive.y - camera.y;
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.ellipse(hx, hy + hive.radius * 0.85, hive.radius * 1.05, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  // Golden dome with honeycomb rings.
  ctx.fillStyle = COLOURS.hiveDark;
  ctx.beginPath();
  ctx.arc(hx, hy, hive.radius, Math.PI, 0);
  ctx.lineTo(hx + hive.radius, hy + 18);
  ctx.lineTo(hx - hive.radius, hy + 18);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = COLOURS.hive;
  ctx.beginPath();
  ctx.arc(hx, hy, hive.radius - 8, Math.PI, 0);
  ctx.lineTo(hx + hive.radius - 8, hy + 14);
  ctx.lineTo(hx - hive.radius + 8, hy + 14);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = COLOURS.hiveDark;
  ctx.lineWidth = 3;
  for (let r = 0; r < 3; r += 1) {
    ctx.beginPath();
    ctx.arc(hx, hy, hive.radius - 18 - r * 16, Math.PI, 0);
    ctx.stroke();
  }
  // Door.
  ctx.fillStyle = COLOURS.hiveDoor;
  ctx.beginPath();
  ctx.ellipse(hx, hy + 2, 16, 20, 0, 0, Math.PI * 2);
  ctx.fill();
  // Bees orbiting the hive.
  for (let i = 0; i < 3; i += 1) {
    const a = time * 1.6 + (i * Math.PI * 2) / 3;
    const ox = hx + Math.cos(a) * (hive.radius + 22);
    const oy = hy + Math.sin(a) * 18 - 10;
    ctx.fillStyle = COLOURS.bee;
    ctx.beginPath();
    ctx.arc(ox, oy, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.ellipse(ox - 3, oy - 6, 4, 6, -0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  // Hive label + health ring.
  text(ctx, 'HIVE', hx, hy - hive.radius - 12, 15, '#451a03', true, 'center');
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillRect(hx - 44, hy - hive.radius - 8, 88, 7);
  const frac = hive.health / hive.maxHealth;
  ctx.fillStyle = frac > 0.5 ? '#16a34a' : frac > 0.25 ? '#f59e0b' : '#dc2626';
  ctx.fillRect(hx - 44, hy - hive.radius - 8, 88 * frac, 7);
  // Royal Guard: a blue shield ring while the guard is up.
  if (game.bee.guardTimer > 0) {
    ctx.strokeStyle = 'rgba(147,197,253,0.9)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(hx, hy, hive.radius + 14, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawWalls(ctx, game, camera) {
  for (const wall of game.world.walls) {
    const wx = wall.x - camera.x;
    const wy = wall.y - camera.y;
    ctx.save();
    ctx.translate(wx, wy);
    ctx.rotate(wall.angle);
    ctx.fillStyle = COLOURS.wallDark;
    roundRect(ctx, -wall.w / 2 - 2, -wall.h / 2 - 2, wall.w + 4, wall.h + 4, 8);
    ctx.fill();
    ctx.fillStyle = COLOURS.wall;
    roundRect(ctx, -wall.w / 2, -wall.h / 2, wall.w, wall.h, 8);
    ctx.fill();
    ctx.strokeStyle = COLOURS.wallDark;
    ctx.lineWidth = 1.5;
    for (let i = -2; i <= 2; i += 1) {
      ctx.beginPath();
      ctx.moveTo(i * 12, -wall.h / 2 + 3);
      ctx.lineTo(i * 12, wall.h / 2 - 3);
      ctx.stroke();
    }
    ctx.restore();
    bar(ctx, wx - 26, wy - wall.h / 2 - 12, 52, 5, wall.hp / wall.maxHp, '#f59e0b');
  }
}

function drawEnemy(ctx, enemy, camera, time) {
  const ex = enemy.x - camera.x;
  const ey = enemy.y - camera.y;
  if (ex < -70 || ex > VIEW_W + 70 || ey < -70 || ey > VIEW_H + 70) return;
  const r = enemy.radius;
  ctx.save();
  ctx.translate(ex, ey);
  ctx.rotate(enemy.angle);
  if (enemy.kind === 'wasp' || enemy.kind === 'hornet' || enemy.kind === 'queen') {
    // Striped flying body with wings.
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    const flap = Math.sin(time * 22 + enemy.wobble) * 0.5;
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.7, r * 0.9, r * 0.35, -0.5 - flap * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, r * 0.7, r * 0.9, r * 0.35, 0.5 + flap * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = enemy.colour;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.15, r * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = enemy.dark;
    ctx.fillRect(-r * 0.5, -r * 0.8, r * 0.28, r * 1.6);
    ctx.fillRect(r * 0.1, -r * 0.8, r * 0.28, r * 1.6);
    // Stinger.
    ctx.fillStyle = enemy.dark;
    ctx.beginPath();
    ctx.moveTo(-r * 1.15, 0);
    ctx.lineTo(-r * 1.6, -r * 0.3);
    ctx.lineTo(-r * 1.6, r * 0.3);
    ctx.closePath();
    ctx.fill();
    if (enemy.kind === 'queen') {
      // Crown spikes.
      ctx.fillStyle = '#fbbf24';
      for (let i = -1; i <= 1; i += 1) {
        ctx.beginPath();
        ctx.moveTo(r * 0.9 + i * 10 - 5, -r * 0.5);
        ctx.lineTo(r * 0.9 + i * 10, -r * 1.15);
        ctx.lineTo(r * 0.9 + i * 10 + 5, -r * 0.5);
        ctx.closePath();
        ctx.fill();
      }
    }
  } else if (enemy.kind === 'spider') {
    ctx.fillStyle = enemy.dark;
    ctx.lineWidth = 3;
    ctx.strokeStyle = enemy.dark;
    for (let i = 0; i < 4; i += 1) {
      const a = (i / 4) * Math.PI - 0.6 + Math.sin(time * 6 + i) * 0.15;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * r * 1.5, Math.sin(a) * r * 1.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(-a) * r * 1.5, Math.sin(-a) * r * 1.5);
      ctx.stroke();
    }
    ctx.fillStyle = enemy.colour;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(r * 0.4, -r * 0.3, 3, 0, Math.PI * 2);
    ctx.arc(r * 0.4, r * 0.3, 3, 0, Math.PI * 2);
    ctx.fill();
  } else if (enemy.kind === 'beetle') {
    ctx.fillStyle = enemy.dark;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.1, r * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = enemy.colour;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.95, r * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#4b5563';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.7);
    ctx.lineTo(0, r * 0.7);
    ctx.stroke();
    // Horn.
    ctx.fillStyle = enemy.dark;
    ctx.beginPath();
    ctx.moveTo(r * 0.9, 0);
    ctx.lineTo(r * 1.5, -r * 0.3);
    ctx.lineTo(r * 1.5, r * 0.3);
    ctx.closePath();
    ctx.fill();
  } else {
    // Mite: small round crawler.
    ctx.fillStyle = enemy.colour;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = enemy.dark;
    ctx.beginPath();
    ctx.arc(r * 0.3, -r * 0.3, r * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // Health bar + name.
  if (enemy.hp < enemy.maxHp || enemy.kind === 'queen') {
    bar(ctx, ex - r, ey - r - 14, r * 2, 5, enemy.hp / enemy.maxHp, enemy.kind === 'queen' ? '#dc2626' : '#ef4444');
  }
  if (enemy.kind === 'queen') {
    text(ctx, 'HORNET QUEEN', ex, ey - r - 20, 13, '#7f1d1d', true, 'center');
  }
}

function drawBee(ctx, bee, camera, time, small) {
  const bx = bee.x - camera.x;
  const by = bee.y - camera.y;
  const r = small ? 8 : bee.radius;
  ctx.save();
  ctx.translate(bx, by);
  ctx.rotate(bee.angle + Math.PI / 2);
  const flap = Math.sin(time * 26) * 0.45;
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.55, -r * 0.5, r * 0.55, r * 0.9, -0.6 - flap * 0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(r * 0.55, -r * 0.5, r * 0.55, r * 0.9, 0.6 + flap * 0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLOURS.bee;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.75, r, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLOURS.beeStripe;
  ctx.fillRect(-r * 0.75, -r * 0.25, r * 1.5, r * 0.22);
  ctx.fillRect(-r * 0.7, r * 0.25, r * 1.4, r * 0.22);
  ctx.fillStyle = '#1f2937';
  ctx.beginPath();
  ctx.arc(-r * 0.25, -r * 0.72, r * 0.13, 0, Math.PI * 2);
  ctx.arc(r * 0.25, -r * 0.72, r * 0.13, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  if (!small) {
    // Dash meter ring around the bee.
    ctx.strokeStyle = 'rgba(255,255,255,0.65)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(bx, by, r + 9, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (bee.dash / 100));
    ctx.stroke();
  }
}

function drawParticles(ctx, game, camera) {
  for (const p of game.particles) {
    const px = p.x - camera.x;
    const py = p.y - camera.y;
    const alpha = Math.max(0, p.life / p.maxLife);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(px, py, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** The whole visible world, in camera space. */
export function drawWorld(ctx, game, camera, time) {
  drawMeadow(ctx, game, camera, time);
  drawHive(ctx, game, camera, time);
  drawWalls(ctx, game, camera);
  for (const enemy of game.world.enemies) drawEnemy(ctx, enemy, camera, time);
  for (const helper of game.world.swarm) drawBee(ctx, helper, camera, time, true);
  drawBee(ctx, game.bee, camera, time, false);
  drawParticles(ctx, game, camera);
}

function gradeFor(score) {
  if (score >= 3000) return 'S';
  if (score >= 2000) return 'A';
  if (score >= 1200) return 'B';
  if (score >= 600) return 'C';
  return 'D';
}

/** The massive HUD: every corner and both bars carry game state. */
export function drawHUD(ctx, game) {
  const { bee, world } = game;
  const day = DAYS[Math.min(bee.day, 7) - 1];
  const dayLeft = Math.max(0, Math.ceil(42 - bee.dayTimer));
  const isBossDay = bee.day >= 7;

  // ---- Top bar ----
  ctx.fillStyle = COLOURS.panelDark;
  ctx.fillRect(0, 0, VIEW_W, 66);
  ctx.fillStyle = '#fbbf24';
  ctx.fillRect(0, 66, VIEW_W, 3);

  // Top-left: day + boss line + hive health + flowers.
  text(ctx, `DAY ${bee.day}/7 · ${day.name.toUpperCase()}`, 14, 26, 19, '#fde68a', true);
  text(ctx, isBossDay ? 'BOSS: HORNET QUEEN — defeat her to win!' : `NEXT: DAY ${bee.day + 1} · ${DAYS[Math.min(bee.day, 7) - 1 + 1] ? DAYS[bee.day].name.toUpperCase() : '—'}`, 14, 48, 13, '#fca5a5', true);
  text(ctx, `HIVE ${Math.ceil(world.hive.health)}/${world.hive.maxHealth}`, 330, 26, 15, '#fffbeb', true);
  bar(ctx, 330, 32, 150, 9, world.hive.health / world.hive.maxHealth, world.hive.health > 50 ? '#22c55e' : world.hive.health > 25 ? '#f59e0b' : '#ef4444');
  const flowersLeft = world.flowers.filter(f => f.nectar > 0).length;
  text(ctx, `FLOWERS ${flowersLeft}/${world.flowers.length}`, 330, 58, 13, '#fde68a', true);

  // Top-center: win/lose spelled out + day countdown.
  text(ctx, 'WIN: survive all 7 days & defeat the Hornet Queen', 640, 22, 13, '#bbf7d0', true, 'center');
  text(ctx, 'LOSE: hive health reaches 0', 640, 40, 13, '#fecaca', true, 'center');
  text(ctx, isBossDay ? 'BOSS FIGHT — NO TIMER' : `DAY ENDS IN ${dayLeft}s`, 640, 60, 13, '#fde68a', true, 'center');
  if (!isBossDay) bar(ctx, 520, 62, 240, 3, bee.dayTimer / 42, '#fbbf24');

  // Top-right: score, best, combo.
  text(ctx, `SCORE ${bee.score}`, 1266, 26, 22, '#fffbeb', true, 'right');
  text(ctx, `BEST ${Math.max(bee.best, bee.score)}`, 1266, 46, 13, '#fde68a', true, 'right');
  if (bee.combo > 1) {
    text(ctx, `COMBO ×${bee.combo}`, 1120, 46, 15, '#f472b6', true, 'right');
  }
  text(ctx, `KILLS ${bee.kills}`, 1120, 26, 13, '#fffbeb', true, 'right');

  // ---- Boss bar (day 7): just above the bottom bar, clear of the hive. ----
  if (world.queen && !world.queen.dead) {
    const q = world.queen;
    ctx.fillStyle = 'rgba(69,10,10,0.85)';
    ctx.fillRect(340, 664, 600, 30);
    text(ctx, 'HORNET QUEEN', 352, 685, 16, '#fca5a5', true);
    bar(ctx, 500, 670, 400, 16, q.hp / q.maxHp, '#dc2626');
    text(ctx, `${Math.ceil(q.hp)}/${q.maxHp}`, 910, 685, 14, '#fffbeb', true, 'right');
  }

  // ---- Right panel: threat queue + next wave + relics ----
  // Height is computed from the content so the relic list never overflows.
  const nextDay = Math.min(bee.day + 1, 7);
  const nextRows = bee.day < 7 ? waveForDay(nextDay).length : 1;
  const relicRows = Math.max(1, bee.relics.length);
  const panelH = 54 + 6 * 34 + 4 + 26 + 26 + nextRows * 22 + 4 + 26 + 26 + relicRows * 20 + 12;
  const px = 1048;
  const py = 116;
  const pw = 220;
  ctx.fillStyle = COLOURS.panel;
  roundRect(ctx, px, py, pw, panelH, 10);
  ctx.fill();
  ctx.fillStyle = '#92400e';
  ctx.fillRect(px, py, pw, 30);
  text(ctx, 'THREAT QUEUE', px + 12, py + 21, 15, '#fffbeb', true);
  const alive = {};
  for (const e of world.enemies) {
    if (e.dead) continue;
    alive[e.kind] = (alive[e.kind] || 0) + 1;
  }
  let ry = py + 54;
  const kinds = ['wasp', 'mite', 'spider', 'beetle', 'hornet', 'queen'];
  for (const kind of kinds) {
    const count = alive[kind] || 0;
    const def = ENEMIES[kind];
    ctx.fillStyle = def.colour;
    ctx.beginPath();
    ctx.arc(px + 22, ry - 5, 8, 0, Math.PI * 2);
    ctx.fill();
    text(ctx, def.name.toUpperCase(), px + 36, ry, 13, '#1f2937', true);
    text(ctx, `×${count}`, px + pw - 12, ry, 13, count ? '#dc2626' : '#a8a29e', true, 'right');
    // Behaviour line, smaller and dimmer, so the judge reads what each
    // raider does without the panel growing wider.
    text(ctx, BEHAVIOUR[kind], px + 36, ry + 15, 11, '#78716c', false);
    ry += 34;
  }
  ctx.fillStyle = '#92400e';
  ctx.fillRect(px, ry + 4, pw, 26);
  text(ctx, 'NEXT WAVE', px + 12, ry + 23, 14, '#fffbeb', true);
  ry += 52;
  if (bee.day < 7) {
    for (const entry of waveForDay(nextDay)) {
      text(ctx, `${ENEMIES[entry.kind].name.toUpperCase()}`, px + 12, ry, 13, '#1f2937', true);
      text(ctx, `×${entry.count}`, px + pw - 12, ry, 13, '#57534e', true, 'right');
      ry += 22;
    }
  } else {
    text(ctx, 'THE QUEEN IS HERE', px + 12, ry, 13, '#7f1d1d', true);
    ry += 22;
  }
  ctx.fillStyle = '#92400e';
  ctx.fillRect(px, ry + 4, pw, 26);
  text(ctx, 'RELICS', px + 12, ry + 23, 14, '#fffbeb', true);
  ry += 52;
  if (bee.relics.length === 0) {
    text(ctx, 'none yet — clear a day', px + 12, ry, 12, '#78716c');
  } else {
    for (const name of bee.relics) {
      text(ctx, `★ ${name}`, px + 12, ry, 13, '#92400e', true);
      ry += 20;
    }
  }

  // ---- Bottom bar: resources + abilities + peak/grade + controls ----
  ctx.fillStyle = COLOURS.panelDark;
  ctx.fillRect(0, 700, VIEW_W, 100);
  ctx.fillStyle = '#fbbf24';
  ctx.fillRect(0, 700, VIEW_W, 3);

  // Resources.
  text(ctx, 'NECTAR', 14, 726, 13, '#fde68a', true);
  text(ctx, `${Math.floor(bee.nectar)}`, 14, 748, 22, '#fffbeb', true);
  bar(ctx, 90, 732, 110, 10, Math.min(1, bee.nectar / 30), '#fde68a');
  text(ctx, 'POLLEN', 220, 726, 13, '#fef08a', true);
  text(ctx, `${bee.pollen}`, 220, 748, 22, '#fffbeb', true);
  bar(ctx, 296, 732, 110, 10, Math.min(1, bee.pollen / 60), '#fef08a');
  text(ctx, 'HONEY', 426, 726, 13, '#f59e0b', true);
  text(ctx, `${bee.honey}`, 426, 748, 22, '#fffbeb', true);
  bar(ctx, 502, 732, 110, 10, Math.min(1, bee.honey / 100), '#f59e0b');
  text(ctx, `DASH ${Math.floor(bee.dash)}%`, 14, 786, 12, '#93c5fd', true);
  bar(ctx, 110, 776, 110, 8, bee.dash / 100, '#60a5fa');

  // Ability slots.
  const slotW = 80;
  const slotX0 = 640;
  ABILITIES.forEach((ability, i) => {
    const sx = slotX0 + i * (slotW + 4);
    const cd = ability.key === 'CLICK' ? bee.cooldowns.sting : ability.key === 'Q' ? bee.cooldowns.swarm : ability.key === 'E' ? bee.cooldowns.wall : ability.key === 'SHIFT' ? bee.cooldowns.burst : ability.key === 'SPACE' ? 0 : bee.cooldowns.guard;
    const ready = cd <= 0;
    ctx.fillStyle = ready ? 'rgba(251,191,36,0.25)' : 'rgba(0,0,0,0.45)';
    roundRect(ctx, sx, 712, slotW, 62, 8);
    ctx.fill();
    ctx.strokeStyle = ready ? '#fbbf24' : '#57534e';
    ctx.lineWidth = 2;
    roundRect(ctx, sx, 712, slotW, 62, 8);
    ctx.stroke();
    text(ctx, ability.key, sx + slotW / 2, 728, 11, ready ? '#fde68a' : '#a8a29e', true, 'center');
    // Long names wrap to two lines so they stay inside the slot.
    const words = ability.name.split(' ');
    if (ability.name.length > 10 && words.length > 1) {
      text(ctx, words[0], sx + slotW / 2, 744, 11, '#fffbeb', true, 'center');
      text(ctx, words.slice(1).join(' '), sx + slotW / 2, 758, 11, '#fffbeb', true, 'center');
    } else {
      text(ctx, ability.name, sx + slotW / 2, 748, 11, '#fffbeb', true, 'center');
    }
    if (ability.key === 'R' && bee.guardTimer > 0) {
      text(ctx, `ACTIVE ${Math.ceil(bee.guardTimer)}s`, sx + slotW / 2, 770, 10, '#93c5fd', true, 'center');
    } else if (!ready) text(ctx, `${cd.toFixed(1)}s`, sx + slotW / 2, 770, 11, '#fca5a5', true, 'center');
    else text(ctx, 'READY', sx + slotW / 2, 770, 10, '#86efac', true, 'center');
  });

  // Peak combo + grade + controls.
  text(ctx, `PEAK COMBO ×${game.peakCombo}`, 1266, 726, 13, '#f472b6', true, 'right');
  text(ctx, `GRADE ${gradeFor(bee.score)}`, 1266, 748, 16, '#fde68a', true, 'right');
  text(ctx, 'WASD / mouse: move · CLICK / J: sting · SPACE: dash · Q: swarm · E: wax wall · SHIFT: burst · R: guard · P: pause · M: mute', 640, 790, 12, '#d6d3d1', false, 'center');

  // Day banner.
  if (game.bannerTimer > 0) {
    ctx.globalAlpha = Math.min(1, game.bannerTimer);
    ctx.fillStyle = 'rgba(41,37,36,0.72)';
    ctx.fillRect(340, 300, 600, 110);
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(340, 300, 600, 4);
    text(ctx, `DAY ${bee.day}`, 640, 345, 30, '#fde68a', true, 'center');
    text(ctx, day.name.toUpperCase(), 640, 378, 22, '#fffbeb', true, 'center');
    if (isBossDay) text(ctx, 'THE HORNET QUEEN AWAKENS', 640, 402, 15, '#fca5a5', true, 'center');
    ctx.globalAlpha = 1;
  }
}
