// Mouse + keyboard input for HIVEWARDEN. The bee steers toward the mouse
// when the pointer is down or moving, and WASD / arrows steer directly.
// Click stings; Space dashes; Q swarm, E wall, Shift burst, R guard.
import { VIEW_W, VIEW_H } from './config.js';
import { angleTo } from './random.js';

export function makeInput(canvas) {
  const input = {
    keys: new Set(),
    pressed: new Set(),
    mouseX: VIEW_W / 2,
    mouseY: VIEW_H / 2,
    mouseDown: false,
    mouseSeen: false,
    canvas,
  };
  window.addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
    if (!event.repeat) input.pressed.add(event.code);
    input.keys.add(event.code);
  });
  window.addEventListener('keyup', (event) => {
    input.keys.delete(event.code);
  });
  canvas.addEventListener('pointermove', (event) => {
    const rect = canvas.getBoundingClientRect();
    input.mouseX = ((event.clientX - rect.left) / rect.width) * VIEW_W;
    input.mouseY = ((event.clientY - rect.top) / rect.height) * VIEW_H;
    input.mouseSeen = true;
  });
  canvas.addEventListener('pointerdown', (event) => {
    const rect = canvas.getBoundingClientRect();
    input.mouseX = ((event.clientX - rect.left) / rect.width) * VIEW_W;
    input.mouseY = ((event.clientY - rect.top) / rect.height) * VIEW_H;
    input.mouseDown = true;
    input.mouseSeen = true;
    if (event.button === 0) input.pressed.add('MouseSting');
  });
  window.addEventListener('pointerup', () => {
    input.mouseDown = false;
  });
  window.addEventListener('blur', () => {
    input.keys.clear();
    input.mouseDown = false;
  });
  return input;
}

/** True once for a key pressed since the last check (edge-triggered). */
export function consumePress(input, code) {
  if (!input.pressed.has(code)) return false;
  input.pressed.delete(code);
  return true;
}

function keyAngle(input) {
  let dx = 0;
  let dy = 0;
  if (input.keys.has('KeyA') || input.keys.has('ArrowLeft')) dx -= 1;
  if (input.keys.has('KeyD') || input.keys.has('ArrowRight')) dx += 1;
  if (input.keys.has('KeyW') || input.keys.has('ArrowUp')) dy -= 1;
  if (input.keys.has('KeyS') || input.keys.has('ArrowDown')) dy += 1;
  if (dx === 0 && dy === 0) return null;
  return Math.atan2(dy, dx);
}

/**
 * The bee's steering angle: keyboard wins while a direction key is held;
 * otherwise the mouse position (in world coordinates) steers it.
 */
export function steeringAngle(input, bee, camera, nowMs) {
  const key = keyAngle(input);
  if (key !== null) return key;
  if (input.mouseSeen) {
    const wx = input.mouseX + camera.x;
    const wy = input.mouseY + camera.y;
    const d = Math.hypot(wx - bee.x, wy - bee.y);
    if (d > 24) return angleTo(bee.x, bee.y, wx, wy);
  }
  return null;
}

export function isDashing(input) {
  return input.keys.has('Space');
}

export function mousePoint(input) {
  return { x: input.mouseX, y: input.mouseY };
}

/** Edge-triggered action keys, consumed by the game step. */
export function consumeActions(input) {
  const actions = {
    sting: consumePress(input, 'MouseSting') || consumePress(input, 'KeyJ'),
    swarm: consumePress(input, 'KeyQ'),
    wall: consumePress(input, 'KeyE'),
    burst: consumePress(input, 'ShiftLeft') || consumePress(input, 'ShiftRight'),
    guard: consumePress(input, 'KeyR'),
  };
  return actions;
}
