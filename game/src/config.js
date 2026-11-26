// Ridge Runner: Alpine Air Mail — shared tuning constants (one job: numbers, no logic).
export const WORLD = {
  seed: 20261126,
  size: 4200,          // world is size x size metres, centred on 0,0
  maxHeight: 620,      // tallest ridge, metres
  valleyFloor: 40,     // valley floor height, metres
  fogNear: 900,
  fogFar: 4200,
};

export const HOME_STRIP = { x: -1400, z: -350, heading: 1.45, name: 'Pine Hollow' };
export const LAKE_STRIP = { x: 1250, z: 150, heading: 1.5, name: 'Mirror Lake' };
export const MID_STRIP = { x: 150, z: 250, heading: 1.5, name: 'Ridge Crossing' };

export const PLANE = {
  stallKnots: 52,
  maxKnots: 168,
  cruiseKnots: 118,
  climbRate: 9,        // m/s at full throttle, level
  fuelCapacity: 100,   // litres shown as percent
  fuelBurn: 0.28,      // % per second at full throttle
  damageHardLanding: 25,
  damageTerrain: 100,
};

export const RING_RADIUS = 30;      // metres, pass radius (generous: rings are flown, not threaded)
export const RING_SCORE = 100;
export const LANDING_BONUS = 250;
export const TIME_BONUS_PER_SEC = 2;

export const COLOURS = {
  sky: 0x8ec9ee,
  fog: 0xa8c8e0,
  sun: 0xfff2cf,
  grassLow: 0x5d8a3c,
  grassHigh: 0x7fae56,
  rock: 0x8d8578,
  snow: 0xf2f5f7,
  river: 0x3f7fc4,
  lake: 0x4a90d9,
  runway: 0x3a3d42,
  ringNext: 0xffc21a,
  ringLater: 0x2f7fe0,
  ringDone: 0x37c978,
  planeRed: 0xd23c2a,
  planeCream: 0xf3ead2,
};
