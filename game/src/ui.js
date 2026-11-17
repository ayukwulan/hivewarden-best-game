// HIVEWARDEN screens: the title over the living meadow, pause, the win
// screen when the hive is saved, and the loss screen when it falls.
import { VIEW_W, VIEW_H, DAYS, WIN_BONUS } from './config.js';

export function drawButton(ctx, x, y, w, h, label, hot) {
  ctx.fillStyle = hot ? '#f59e0b' : '#b45309';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 12);
  ctx.fill();
  ctx.strokeStyle = '#fde68a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 12);
  ctx.stroke();
  ctx.font = 'bold 24px system-ui, sans-serif';
  ctx.fillStyle = '#fffbeb';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + w / 2, y + h / 2 + 1);
  ctx.textBaseline = 'alphabetic';
  return { x, y, w, h, label };
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(41,37,36,0.82)';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 16);
  ctx.fill();
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 16);
  ctx.stroke();
}

function centred(ctx, str, y, size, colour, bold) {
  ctx.font = `${bold ? 'bold ' : ''}${size}px system-ui, sans-serif`;
  ctx.fillStyle = colour;
  ctx.textAlign = 'center';
  ctx.fillText(str, VIEW_W / 2, y);
  ctx.textAlign = 'left';
}

/** The title: big name, the hook, win/lose, the seven days, the button. */
export function drawTitle(ctx, best) {
  // A translucent band so the title reads over the living meadow.
  ctx.fillStyle = 'rgba(41,37,36,0.55)';
  ctx.fillRect(0, 130, VIEW_W, 340);
  centred(ctx, '🐝 HIVEWARDEN', 200, 64, '#fde68a', true);
  centred(ctx, 'Guard the golden hive through seven days — sting the raiders, drink the nectar,', 252, 20, '#fffbeb', false);
  centred(ctx, 'build wax walls, and face the Hornet Queen at dusk.', 280, 20, '#fffbeb', false);
  centred(ctx, 'WIN: survive all 7 days & defeat the Hornet Queen', 322, 19, '#bbf7d0', true);
  centred(ctx, 'LOSE: hive health reaches 0', 348, 19, '#fecaca', true);
  const days = DAYS.map((d, i) => `${i + 1} ${d.name}`).join('  ·  ');
  centred(ctx, days, 388, 16, '#fde68a', false);
  if (best > 0) centred(ctx, `BEST SCORE ${best}`, 420, 17, '#fbbf24', true);
  centred(ctx, 'WASD / mouse: move · CLICK / J: sting · SPACE: dash · Q: swarm · E: wall · SHIFT: burst · R: guard', 446, 15, '#d6d3d1', false);
  const button = drawButton(ctx, VIEW_W / 2 - 150, 500, 300, 64, '▶  GUARD THE HIVE', true);
  return { buttons: [button] };
}

export function drawPause(ctx) {
  panel(ctx, VIEW_W / 2 - 220, 280, 440, 220);
  centred(ctx, 'PAUSED', 340, 40, '#fde68a', true);
  centred(ctx, 'The meadow waits for its warden.', 378, 18, '#fffbeb', false);
  const resume = drawButton(ctx, VIEW_W / 2 - 170, 410, 160, 56, 'RESUME', true);
  const restart = drawButton(ctx, VIEW_W / 2 + 10, 410, 160, 56, 'RESTART', false);
  return { buttons: [resume, restart] };
}

export function drawWin(ctx, game) {
  const { bee } = game;
  const timeBonus = Math.max(0, 600 - Math.floor(game.elapsed)) * 2;
  const total = bee.score + WIN_BONUS + timeBonus;
  panel(ctx, VIEW_W / 2 - 300, 170, 600, 420);
  centred(ctx, '🌻 THE HIVE IS SAVED!', 240, 42, '#fde68a', true);
  centred(ctx, 'The Hornet Queen is defeated. The meadow blooms again.', 282, 19, '#fffbeb', false);
  centred(ctx, `SCORE  ${bee.score}`, 330, 26, '#fffbeb', true);
  centred(ctx, `WIN BONUS  +${WIN_BONUS}`, 362, 20, '#fde68a', false);
  centred(ctx, `TIME BONUS  +${timeBonus}`, 390, 20, '#bbf7d0', false);
  centred(ctx, `TOTAL  ${total}`, 424, 30, '#fbbf24', true);
  centred(ctx, `HONEY ${bee.honey}  ·  NECTAR ${Math.floor(bee.nectar)}  ·  POLLEN ${bee.pollen}  ·  KILLS ${bee.kills}  ·  PEAK COMBO ×${game.peakCombo}`, 458, 16, '#d6d3d1', false);
  const relics = bee.relics.length ? bee.relics.join('  ·  ') : 'no relics this run';
  centred(ctx, `RELICS: ${relics}`, 486, 15, '#fde68a', false);
  const button = drawButton(ctx, VIEW_W / 2 - 150, 510, 300, 64, '↻  PLAY AGAIN', true);
  return { buttons: [button] };
}

export function drawLose(ctx, game) {
  const { bee, world } = game;
  panel(ctx, VIEW_W / 2 - 300, 170, 600, 420);
  centred(ctx, '🥀 THE HIVE HAS FALLEN', 240, 42, '#fca5a5', true);
  centred(ctx, `The raiders chewed through the honeycomb on day ${bee.day} — ${DAYS[Math.min(bee.day, 7) - 1].name}.`, 282, 19, '#fffbeb', false);
  centred(ctx, `SCORE  ${bee.score}`, 336, 26, '#fffbeb', true);
  centred(ctx, `HONEY ${bee.honey}  ·  KILLS ${bee.kills}  ·  DAYS HELD ${bee.day - 1}/7  ·  PEAK COMBO ×${game.peakCombo}`, 380, 16, '#d6d3d1', false);
  centred(ctx, 'Tip: build wax walls (E) on the paths, and call the swarm (Q) when mites pile up.', 420, 16, '#fde68a', false);
  centred(ctx, `Hive health: ${Math.ceil(world.hive.health)}/${world.hive.maxHealth}`, 452, 16, '#fecaca', false);
  const button = drawButton(ctx, VIEW_W / 2 - 150, 510, 300, 64, '↻  GUARD AGAIN', true);
  return { buttons: [button] };
}

/** Which button (by label) contains the point, or null. */
export function hitButton(buttons, x, y) {
  for (const button of buttons || []) {
    if (x >= button.x && x <= button.x + button.w && y >= button.y && y <= button.y + button.h) return button.label;
  }
  return null;
}
