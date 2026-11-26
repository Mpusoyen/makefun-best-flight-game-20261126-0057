// Ridge Runner — screenshot staging (one job: fixed deterministic poses per ?shot=).
// Each shot sets the exact flight state, camera and HUD values, then the main
// loop renders it frozen, so the same query always gives the same frame.
// NOTE: always use api.state (setMission replaces the state object).
import { HOME_STRIP, LAKE_STRIP } from './config.js';

function placeBeforeRing(api, index, backMetres) {
  const state = api.state; const mission = api.mission;
  const ring = mission.rings[index];
  const prev = index > 0 ? mission.rings[index - 1] : { x: mission.from.x, z: mission.from.z };
  const dx = ring.x - prev.x; const dz = ring.z - prev.z;
  const len = Math.hypot(dx, dz) || 1;
  const ux = dx / len; const uz = dz / len;
  state.x = ring.x - ux * backMetres;
  state.z = ring.z - uz * backMetres;
  state.y = ring.y;
  state.heading = Math.atan2(ux, -uz);
  state.pitch = 0.02; state.roll = 0.05;
  state.onGround = false;
}

function placeOnStrip(api, strip, rollingSpeed) {
  const state = api.state;
  state.x = strip.x; state.z = strip.z;
  state.heading = strip.heading;
  state.pitch = 0; state.roll = 0;
  state.onGround = true;
  state.speed = rollingSpeed;
}

function say(api, text) {
  api.state.message = text;
  api.state.messageUntil = 1e15;
}

export function stageShot(name, api) {
  if (name === 'cockpit') {
    api.setMission('mail-run');
    api.setCamera('cockpit');
    placeOnStrip(api, HOME_STRIP, 0);
    api.state.y = api.stripHeight(HOME_STRIP) + 1.7;
    api.state.throttle = 0.45; api.state.fuel = 96; api.state.speed = 0;
    api.state.ringsPassed = 0; api.state.score = 0; api.state.elapsed = 12;
    say(api, 'PINE HOLLOW — throttle up (W) and pull back to take off');
    return;
  }
  if (name === 'runway') {
    api.setMission('mail-run');
    api.setCamera('chase');
    // Final approach to Mirror Lake, all rings flown.
    const strip = LAKE_STRIP;
    const dx = Math.sin(strip.heading); const dz = -Math.cos(strip.heading);
    const s = api.state;
    s.x = strip.x - dx * 280; s.z = strip.z - dz * 280;
    s.y = api.stripHeight(strip) + 55;
    s.heading = strip.heading; s.pitch = -0.07; s.roll = 0;
    s.onGround = false; s.speed = 82; s.throttle = 0.32;
    s.fuel = 61; s.ringsPassed = 5; s.score = 500; s.elapsed = 312;
    say(api, 'FINAL — Mirror Lake runway ahead, ease the throttle back');
    return;
  }
  if (name === 'landing') {
    api.setMission('mail-run');
    api.setCamera('chase');
    placeOnStrip(api, LAKE_STRIP, 14);
    const s = api.state;
    s.y = api.stripHeight(LAKE_STRIP) + 1.7;
    s.throttle = 0.1; s.fuel = 54; s.speed = 14;
    s.ringsPassed = 5; s.score = 750; s.elapsed = 348;
    say(api, '✉ MAIL DELIVERED — Mirror Lake · +250 landing bonus');
    return;
  }
  // Default: cover — chase view over the valley, gold ring ahead.
  api.setMission('mail-run');
  api.setCamera('chase');
  placeBeforeRing(api, 2, 130);
  const s = api.state;
  s.speed = 112; s.throttle = 0.75; s.fuel = 78;
  s.ringsPassed = 2; s.score = 200; s.elapsed = 95;
  say(api, 'RING 3 OF 5 — fly through the gold ring');
}
