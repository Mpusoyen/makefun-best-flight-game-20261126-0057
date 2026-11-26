// Ridge Runner — deterministic seeded RNG (one job: repeatable randomness).
// Mulberry32 plus the small helpers the world and missions use. Same seed =>
// same terrain, trees, villages and ring layouts, so screenshots reproduce.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeRng(seed) {
  const next = mulberry32(seed);
  return {
    next,
    range(min, max) { return min + (max - min) * next(); },
    int(min, max) { return Math.floor(min + (max - min + 1) * next()); },
    pick(list) { return list[Math.floor(next() * list.length)]; },
    chance(p) { return next() < p; },
  };
}

// Smooth 2D value noise on a fixed lattice, seeded once per world.
export function makeNoise2D(seed) {
  const rand = mulberry32(seed);
  const perm = new Uint8Array(512);
  const base = new Uint8Array(256);
  for (let i = 0; i < 256; i += 1) base[i] = i;
  for (let i = 255; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    const t = base[i]; base[i] = base[j]; base[j] = t;
  }
  for (let i = 0; i < 512; i += 1) perm[i] = base[i & 255];
  const fade = (t) => t * t * (3 - 2 * t);
  const grad = (h, x, y) => {
    switch (h & 3) {
      case 0: return x + y;
      case 1: return -x + y;
      case 2: return x - y;
      default: return -x - y;
    }
  };
  function noise(x, y) {
    const xi = Math.floor(x); const yi = Math.floor(y);
    const xf = x - xi; const yf = y - yi;
    const a = perm[(xi & 255) + perm[yi & 255]];
    const b = perm[((xi + 1) & 255) + perm[yi & 255]];
    const c = perm[(xi & 255) + perm[(yi + 1) & 255]];
    const d = perm[((xi + 1) & 255) + perm[(yi + 1) & 255]];
    const u = fade(xf); const v = fade(yf);
    const l1 = grad(a, xf, yf) + u * (grad(b, xf - 1, yf) - grad(a, xf, yf));
    const l2 = grad(c, xf, yf - 1) + u * (grad(d, xf - 1, yf - 1) - grad(c, xf, yf - 1));
    return (l1 + v * (l2 - l1)) * 0.7;
  }
  return function fbm(x, y, octaves = 4) {
    let sum = 0; let amp = 1; let freq = 1; let norm = 0;
    for (let o = 0; o < octaves; o += 1) {
      sum += amp * noise(x * freq, y * freq);
      norm += amp; amp *= 0.5; freq *= 2.03;
    }
    return sum / norm;
  };
}
