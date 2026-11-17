// Seeded randomness for HIVEWARDEN: the same seed grows the same meadow,
// so a screenshot staged with seed=1 always shows the same flowers, pond
// and bushes. Mulberry32 — small, fast, deterministic.
export function makeRandom(seed) {
  let state = (seed >>> 0) || 1;
  return function random() {
    state |= 0;
    state = (state + 0x6D2B79F5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function dist(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

export function angleTo(x1, y1, x2, y2) {
  return Math.atan2(y2 - y1, x2 - x1);
}

/** Shortest signed turn from `from` toward `to`, in radians. */
export function turnToward(from, to, maxTurn) {
  let diff = to - from;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  if (diff > maxTurn) return maxTurn;
  if (diff < -maxTurn) return -maxTurn;
  return diff;
}
