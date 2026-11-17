// HIVEWARDEN tuning and world constants. One place for every number the
// game balances on, so a tuning pass touches this file and nothing else.
export const VIEW_W = 1280;
export const VIEW_H = 800;
export const STEP = 1 / 60;

// The meadow is wider than the screen; the camera follows the guardian bee.
export const WORLD_W = 1760;
export const WORLD_H = 1180;

// The guardian bee. Fast enough to cross the meadow, slow enough that a
// wasp can catch it if it dawdles.
export const BEE_SPEED = 265;
export const BEE_RADIUS = 13;
export const DASH_SPEED = 520;
export const DASH_DRAIN = 45; // dash meter per second while dashing
export const DASH_REGEN = 9; // dash meter per second, idle
export const TURN_RATE = 9.0; // radians per second toward the steering target
export const STING_RANGE = 92;
export const STING_DAMAGE = 16;
export const STING_COOLDOWN = 0.32;
export const STING_ARC = 1.1; // radians either side of the facing

// The hive. Enemies that reach it chew the honeycomb; at 0 the hive falls.
export const HIVE_X = WORLD_W / 2;
export const HIVE_Y = 170;
export const HIVE_RADIUS = 74;
export const HIVE_HEALTH_MAX = 100;
export const HIVE_CHEW_DAMAGE = 4; // per chew
export const HIVE_CHEW_SECONDS = 1.1; // between chews by the same enemy

// Nectar, pollen, honey. Flowers give nectar; nectar ripens into honey.
export const NECTAR_PER_FLOWER = 3;
export const HONEY_PER_NECTAR = 2; // honey made per nectar at the hive
export const NECTAR_SCORE = 5;
export const KILL_SCORE = { wasp: 15, mite: 8, spider: 25, beetle: 40, hornet: 60, queen: 500 };
export const DAY_CLEAR_SCORE = 100;
export const WIN_BONUS = 500;
export const COMBO_WINDOW = 3.0; // seconds between kills to keep the combo

// Seven days. Each is a wave window with its own name, palette and mix;
// day 7 ends with the Hornet Queen.
export const DAY_SECONDS = 42;
export const DAYS = [
  { name: 'Dawn Meadow', sky: '#bfe8ff', grass: '#7ec850', grassDark: '#5da83c', wasps: 2, mites: 3, spiders: 0, beetles: 0, hornets: 0 },
  { name: 'Clover Field', sky: '#a8e6a3', grass: '#6fbf4a', grassDark: '#529c36', wasps: 3, mites: 5, spiders: 1, beetles: 0, hornets: 0 },
  { name: 'Poppy Row', sky: '#ffd9a0', grass: '#79c44e', grassDark: '#57a137', wasps: 4, mites: 6, spiders: 2, beetles: 1, hornets: 0 },
  { name: 'Sunflower Stand', sky: '#ffe27a', grass: '#82cc55', grassDark: '#5cab3d', wasps: 5, mites: 8, spiders: 2, beetles: 2, hornets: 1 },
  { name: 'Berry Thicket', sky: '#f7b8d8', grass: '#6cbd4e', grassDark: '#4f9a35', wasps: 6, mites: 9, spiders: 3, beetles: 2, hornets: 2 },
  { name: 'Storm Meadow', sky: '#b9c4d6', grass: '#5fae52', grassDark: '#478a3e', wasps: 7, mites: 10, spiders: 4, beetles: 3, hornets: 2 },
  { name: 'Dusk Bloom', sky: '#f7a76c', grass: '#74b84a', grassDark: '#54973a', wasps: 6, mites: 8, spiders: 3, beetles: 3, hornets: 3 },
];
export const QUEEN_HEALTH = 620;
export const QUEEN_RADIUS = 46;
export const QUEEN_SPAWN_MITES = 3; // mites she calls every few seconds

// Enemy kinds. Each behaves differently: wasps fly fast at the bee, mites
// swarm the hive in numbers, spiders crawl slow and tanky-ish, beetles are
// armoured walls, hornets dive at the hive and sting back.
export const ENEMIES = {
  wasp: { name: 'Wasp', hp: 22, speed: 118, radius: 12, damage: 6, colour: '#f59e0b', dark: '#92400e', score: 15, huntsBee: true },
  mite: { name: 'Mite', hp: 9, speed: 88, radius: 8, damage: 3, colour: '#a16207', dark: '#713f12', score: 8, huntsBee: false },
  spider: { name: 'Spider', hp: 46, speed: 52, radius: 16, damage: 9, colour: '#7c3aed', dark: '#4c1d95', score: 25, huntsBee: false },
  beetle: { name: 'Beetle', hp: 95, speed: 38, radius: 20, damage: 12, colour: '#1f2937', dark: '#111827', score: 40, huntsBee: false },
  hornet: { name: 'Hornet', hp: 58, speed: 96, radius: 15, damage: 10, colour: '#dc2626', dark: '#7f1d1d', score: 60, huntsBee: true },
  queen: { name: 'Hornet Queen', hp: QUEEN_HEALTH, speed: 62, radius: QUEEN_RADIUS, damage: 16, colour: '#7c2d12', dark: '#431407', score: 500, huntsBee: true },
};

// Relics, one earned at the end of each day from day 2 on. Named, with a
// real passive effect the HUD can show.
export const RELICS = [
  null, // day 1: no relic yet
  { name: 'Royal Jelly', text: '+20 max hive health, heal 20', heal: 20, maxHive: 20 },
  { name: 'Amber Comb', text: 'sting +6 damage', sting: 6 },
  { name: 'Golden Pollen', text: 'nectar worth double', nectar: 2 },
  { name: 'Sunpetal', text: 'dash costs half, regen double', dash: 2 },
  { name: 'Queen\u2019s Crown', text: 'swarm calls +2 bees', swarm: 2 },
  { name: 'Stormwing', text: 'sting cooldown halved', cooldown: 2 },
];

// Abilities. Six named slots with cooldowns, shown along the bottom bar.
export const ABILITIES = [
  { key: 'CLICK', name: 'Sting', desc: 'sting in facing arc', cooldown: STING_COOLDOWN },
  { key: 'Q', name: 'Swarm Call', desc: 'summon helper bees', cooldown: 14 },
  { key: 'E', name: 'Wax Wall', desc: 'build a blocking wall', cooldown: 9 },
  { key: 'SHIFT', name: 'Pheromone Burst', desc: 'blast nearby enemies', cooldown: 11 },
  { key: 'SPACE', name: 'Nectar Dash', desc: 'speed burst', cooldown: 0 },
  { key: 'R', name: 'Royal Guard', desc: 'shield the hive 8s', cooldown: 22 },
];
export const SWARM_BEES = 3;
export const SWARM_LIFE = 12; // seconds a helper bee fights
export const WALL_LIFE = 14; // seconds a wax wall stands
export const WALL_HP = 60;
export const BURST_RADIUS = 170;
export const BURST_DAMAGE = 34;
export const GUARD_SECONDS = 8;

// Flowers. The meadow is dense with them; they are the economy.
export const FLOWER_COUNT = 64;
export const FLOWER_TYPES = [
  { name: 'Poppy', petal: '#ef4444', centre: '#7f1d1d' },
  { name: 'Sunflower', petal: '#facc15', centre: '#92400e' },
  { name: 'Clover', petal: '#a855f7', centre: '#581c87' },
  { name: 'Daisy', petal: '#f8fafc', centre: '#f59e0b' },
  { name: 'Bluebell', petal: '#60a5fa', centre: '#1e3a8a' },
  { name: 'Marigold', petal: '#fb923c', centre: '#9a3412' },
];

// Colours. Bright meadow, golden hive, glowing bee — no black background.
export const COLOURS = {
  bee: '#fbbf24',
  beeDark: '#b45309',
  beeStripe: '#1f2937',
  hive: '#f59e0b',
  hiveDark: '#92400e',
  hiveDoor: '#451a03',
  nectar: '#fde68a',
  pollen: '#fef08a',
  honey: '#f59e0b',
  text: '#1f2937',
  textLight: '#fffbeb',
  dim: '#57534e',
  panel: 'rgba(255,251,235,0.92)',
  panelDark: 'rgba(41,37,36,0.78)',
  danger: '#dc2626',
  good: '#16a34a',
  wall: '#fde68a',
  wallDark: '#d97706',
  pond: '#38bdf8',
  pondDark: '#0369a1',
};
