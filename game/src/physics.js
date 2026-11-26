// Ridge Runner — arcade flight model (one job: how the plane moves and crashes).
// Speed in knots, positions in metres, heading in radians (0 = north, -Z).
// Lift grows with speed squared; below stall speed the nose drops; on the
// ground the plane rolls, steers and needs speed plus pitch to lift off.
import { PLANE, RING_RADIUS } from './config.js';

export const KNOTS_TO_MS = 0.514444;
export const MS_TO_KNOTS = 1 / KNOTS_TO_MS;
export const M_TO_FT = 3.28084;

export function createFlightState(spawn) {
  return {
    x: spawn.x, y: spawn.y, z: spawn.z,
    heading: spawn.heading, pitch: 0, roll: 0,
    speed: 0,              // knots
    throttle: 0,
    verticalSpeed: 0,     // m/s, smoothed for the HUD
    onGround: true,
    gearDown: true,
    fuel: 100,
    fuelWarned: false,
    damage: 0,
    crashed: false,
    landed: false,
    ringsPassed: 0,
    score: 0,
    elapsed: 0,
    message: '',
    messageUntil: 0,
  };
}

// ctrl: { pitch: -1..1 (pull up positive), roll: -1..1, yaw: -1..1, throttleDelta }
export function stepFlight(s, dt, ctrl, heightAt, rings, onEvent) {
  if (s.crashed) return s;
  s.elapsed += dt;
  s.throttle = Math.min(1, Math.max(0, s.throttle + ctrl.throttleDelta * dt));
  const speedMs = s.speed * KNOTS_TO_MS;

  if (s.onGround) {
    // Rolling: throttle accelerates, brakes / drag slow down, steering works.
    const accel = (s.throttle * 9 - 1.2 - speedMs * 0.06) * dt;
    s.speed = Math.max(0, s.speed + accel * MS_TO_KNOTS);
    s.heading += ctrl.yaw * 0.5 * dt * Math.min(1, speedMs / 12 + 0.25);
    const liftOff = s.speed > PLANE.stallKnots * 0.92 && ctrl.pitch > 0.25;
    if (liftOff) {
      s.onGround = false;
      s.pitch = 0.12;
      s.airborneSince = s.elapsed;
      onEvent('takeoff');
    } else {
      s.pitch = 0; s.roll = 0;
      const nx = s.x + Math.sin(s.heading) * speedMs * dt;
      const nz = s.z - Math.cos(s.heading) * speedMs * dt;
      s.x = nx; s.z = nz;
      s.y = heightAt(s.x, s.z) + 1.7;
    }
  } else {
    // Airborne: pitch and roll answer the stick; speed follows throttle and climb.
    const targetPitch = ctrl.pitch * 0.55;
    s.pitch += (targetPitch - s.pitch) * Math.min(1, dt * 2.8);
    const targetRoll = ctrl.roll * 0.9;
    s.roll += (targetRoll - s.roll) * Math.min(1, dt * 2.6);
    s.heading += Math.sin(s.roll) * 0.55 * dt * Math.min(1, speedMs / 25);
    s.heading += ctrl.yaw * 0.12 * dt;
    const vmaxMs = PLANE.maxKnots * KNOTS_TO_MS;
    const thrust = s.throttle * 14 * Math.max(0, 1 - speedMs / vmaxMs);
    const gravityAlong = Math.sin(s.pitch) * 9.8;
    const drag = 0.012 * speedMs;
    const accelMs = thrust - drag - gravityAlong;
    s.speed = Math.max(0, s.speed + accelMs * dt * MS_TO_KNOTS);
    // Stall: below stall speed lift collapses and the nose drops.
    if (s.speed < PLANE.stallKnots) {
      s.pitch += (Math.max(s.pitch - 0.35, -0.5) - s.pitch) * Math.min(1, dt * 1.5);
    }
    const climb = Math.sin(s.pitch) * speedMs;
    const liftFactor = Math.min(1, (s.speed / PLANE.stallKnots) ** 2);
    const vs = climb * liftFactor - (1 - liftFactor) * 6;
    s.verticalSpeed = s.verticalSpeed * 0.9 + vs * 0.1;
    s.y += vs * dt;
    s.x += Math.sin(s.heading) * Math.cos(s.pitch) * speedMs * dt;
    s.z -= Math.cos(s.heading) * Math.cos(s.pitch) * speedMs * dt;
  }

  // Fuel burn scales with throttle; empty tank = dead stick.
  const burn = PLANE.fuelBurn * (0.25 + s.throttle * 0.75) * dt;
  s.fuel = Math.max(0, s.fuel - burn);
  if (s.fuel <= 0 && !s.fuelWarned) {
    s.fuelWarned = true;
    s.throttle = 0.08;
    onEvent('fuel-empty');
  }

  // Ring passes.
  if (rings && rings.length > 0 && s.ringsPassed < rings.length) {
    const ring = rings[s.ringsPassed];
    const d = Math.hypot(s.x - ring.x, s.y - ring.y, s.z - ring.z);
    if (d < RING_RADIUS) {
      s.ringsPassed += 1;
      s.score += 100;
      onEvent('ring', s.ringsPassed);
    }
  }

  // Terrain contact (skip briefly after lift-off: the wheels are still at ground level).
  const ground = heightAt(s.x, s.z);
  const clearance = s.y - ground;
  if (!s.onGround && clearance <= 1.7 && s.elapsed - (s.airborneSince || 0) > 0.8) {
    const impact = -s.verticalSpeed; // positive when descending onto the ground
    if (impact < 5 && impact > -3 && Math.abs(s.roll) < 0.45 && s.speed < 110) {
      // A landing: wheels on, roll out.
      s.onGround = true; s.landed = true; s.y = ground + 1.7;
      s.pitch = 0; s.roll = 0; s.verticalSpeed = 0;
      onEvent('landed', { vs: s.verticalSpeed });
    } else if (impact < 12 && s.speed < 130) {
      // Rough touchdown or clipping a rise while climbing: bent airframe, not a wreck.
      s.damage += PLANE.damageHardLanding;
      s.onGround = true; s.y = ground + 1.7; s.pitch = 0; s.roll = 0; s.verticalSpeed = 0;
      onEvent('hard-landing', { vs: s.verticalSpeed });
      if (s.damage >= 100) { s.crashed = true; onEvent('crash', 'hard landing'); }
    } else {
      s.crashed = true;
      onEvent('crash', 'terrain strike');
    }
  }
  if (s.y > 1500) { s.y = 1500; s.pitch = Math.min(s.pitch, 0); }
  if (Math.abs(s.x) > 2050 || Math.abs(s.z) > 2050) {
    s.crashed = true;
    onEvent('crash', 'flew out of the valley');
  }
  return s;
}

export function refuel(s) {
  s.fuel = 100;
  s.damage = Math.max(0, s.damage - 25);
}
