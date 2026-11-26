// Ridge Runner — missions (one job: what each sortie asks for and how it scores).
import { HOME_STRIP, LAKE_STRIP, MID_STRIP, LANDING_BONUS, TIME_BONUS_PER_SEC } from './config.js';
import { heightAt, riverZ } from './terrain.js';

// Rings sit above the terrain, chained from the departure strip toward the
// destination, so every leg reads as a route through the valley. The route
// follows the river valley (the flyable corridor) instead of cutting straight
// across the ridges, and every ring clears the ground below it by 80 m.
function routePoints(from, to) {
  return [
    { x: from.x, z: from.z },
    { x: -800, z: riverZ(-800) },
    { x: -200, z: riverZ(-200) },
    { x: 400, z: riverZ(400) },
    { x: 900, z: riverZ(900) },
    { x: to.x, z: to.z },
  ];
}

function pointAlong(points, t) {
  const segs = [];
  let total = 0;
  for (let i = 0; i < points.length - 1; i += 1) {
    const len = Math.hypot(points[i + 1].x - points[i].x, points[i + 1].z - points[i].z);
    segs.push(len); total += len;
  }
  let dist = t * total;
  for (let i = 0; i < segs.length; i += 1) {
    if (dist <= segs[i] || i === segs.length - 1) {
      const f = Math.min(1, dist / segs[i]);
      const a = points[i]; const b = points[i + 1];
      return {
        x: a.x + (b.x - a.x) * f, z: a.z + (b.z - a.z) * f,
        dx: b.x - a.x, dz: b.z - a.z,
      };
    }
    dist -= segs[i];
  }
  const last = points[points.length - 1];
  return { x: last.x, z: last.z, dx: 1, dz: 0 };
}

function ringChain(from, to, count, heights) {
  const points = routePoints(from, to);
  const rings = [];
  for (let i = 0; i < count; i += 1) {
    const t = (i + 1) / (count + 1);
    const p = pointAlong(points, t);
    const yaw = Math.atan2(p.dx, p.dz);
    // Rings must clear the ridge they sit over: at least 80 m above the ground.
    const y = Math.max(heights[i], heightAt(p.x, p.z) + 80);
    rings.push({ x: p.x, z: p.z, y, yaw });
  }
  return rings;
}

export const MISSIONS = [
  {
    id: 'mail-run',
    name: 'First Mail Run',
    brief: 'Carry the morning mail from Pine Hollow to Mirror Lake. Fly the gold rings in order, then land on the lake strip.',
    from: HOME_STRIP,
    to: LAKE_STRIP,
    timeLimit: 0,
    fuelStop: false,
    rings: ringChain(HOME_STRIP, LAKE_STRIP, 5, [190, 260, 320, 300, 220]),
  },
  {
    id: 'ridge-dash',
    name: 'Ridge Dash — Timed',
    brief: 'Seven rings over the ridge, against the clock. Finish inside 4:00 and every second left is worth points.',
    from: HOME_STRIP,
    to: LAKE_STRIP,
    timeLimit: 240,
    fuelStop: false,
    rings: ringChain(HOME_STRIP, LAKE_STRIP, 7, [200, 300, 420, 380, 460, 340, 230]),
  },
  {
    id: 'fuel-hop',
    name: 'Fuel-Stop Hop',
    brief: 'A long hop with a fuel stop at Ridge Crossing. Land there to refuel, then finish the run to Mirror Lake.',
    from: HOME_STRIP,
    to: LAKE_STRIP,
    timeLimit: 0,
    fuelStop: true,
    fuelStopStrip: MID_STRIP,
    rings: ringChain(HOME_STRIP, LAKE_STRIP, 8, [190, 260, 330, 380, 420, 360, 300, 230]),
  },
];

export function missionById(id) {
  return MISSIONS.find((m) => m.id === id) || MISSIONS[0];
}

// Distance from the plane to the current objective (ring or destination strip).
export function objectiveTarget(mission, ringsPassed) {
  if (ringsPassed < mission.rings.length) return mission.rings[ringsPassed];
  return { x: mission.to.x, z: mission.to.z, y: 80, strip: mission.to };
}

export function landingScore(mission, state) {
  let bonus = LANDING_BONUS;
  let timeBonus = 0;
  if (mission.timeLimit > 0) {
    timeBonus = Math.max(0, Math.round((mission.timeLimit - state.elapsed) * TIME_BONUS_PER_SEC));
  }
  const damagePenalty = Math.round(state.damage);
  return { bonus, timeBonus, damagePenalty, total: bonus + timeBonus - damagePenalty };
}

export function formatTime(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
