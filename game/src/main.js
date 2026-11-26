// Ridge Runner: Alpine Air Mail — boot + game loop (one job: wire everything together).
// Title -> pick a mission -> fly the rings -> land at the destination strip.
// ?shot=cover|cockpit|runway|landing freezes a staged frame for screenshots.
const THREE = window.THREE;
window.__errors = [];
window.addEventListener('error', (e) => window.__errors.push(String(e.message || e.error)));

import { WORLD, HOME_STRIP } from './config.js';
import { buildWorld, buildRings, heightAt } from './terrain.js';
import { buildAircraft } from './aircraft.js';
import { createFlightState, stepFlight, refuel, M_TO_FT } from './physics.js';
import { MISSIONS, missionById, landingScore, formatTime } from './missions.js';
import { createHud } from './hud.js';
import { drawHorizon, drawDial, drawCompass, drawVsBar } from './instruments.js';
import { createAudio } from './audio.js';
import { createInput } from './input.js';
import { stageShot } from './shots.js';

const params = new URLSearchParams(location.search);
const shotName = params.get('shot');
const shotMode = !!shotName;

const canvas = document.getElementById('scene');
const overlay = document.getElementById('overlay');
const octx = overlay.getContext('2d');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(68, 1, 0.1, 6000);
const world = buildWorld(scene);
const aircraft = buildAircraft();
scene.add(aircraft.group);

const audio = createAudio();
const input = createInput();
const hud = createHud();

let mission = MISSIONS[0];
let ringViz = buildRings(scene, mission.rings);
let state = spawnState(mission);
let screen = 'title';           // title | play | pause | over | done
let cameraMode = 'chase';       // chase | cockpit
let fuelStopDone = false;
let fuelEmptyWarned = false;
let paused = false;
let camPos = new THREE.Vector3();
let camLook = new THREE.Vector3();
let titleAngle = 0.6;

function spawnState(m) {
  return createFlightState({
    x: m.from.x, y: world.stripHeight(m.from) + 1.7, z: m.from.z, heading: m.from.heading,
  });
}

function setMission(id) {
  mission = missionById(id);
  scene.remove(ringViz.group);
  ringViz = buildRings(scene, mission.rings);
  state = spawnState(mission);
  fuelStopDone = false;
  fuelEmptyWarned = false;
  ringViz.setState(0, 0);
  hud.buildMissionList(MISSIONS, mission.id, (picked) => {
    audio.start(); audio.click();
    setMission(picked);
    startFlying();
  });
}

function startFlying() {
  audio.start();
  screen = 'play';
  hud.show(null);
  hud.toast(`${mission.name} — ${mission.brief}`, 4200);
}

function restart() {
  setMission(mission.id);
  startFlying();
}

function showOver(title, text) {
  screen = 'over';
  hud.setOver(title, text);
  hud.show('over');
}

function showDone() {
  const parts = landingScore(mission, state);
  const total = state.score + parts.total;
  state.score = total;
  screen = 'done';
  hud.setDone(
    `${mission.name} complete! Rings ${state.ringsPassed}/${mission.rings.length} · ` +
    `landing +${parts.bonus}${parts.timeBonus ? ` · time +${parts.timeBonus}` : ''}` +
    `${parts.damagePenalty ? ` · damage −${parts.damagePenalty}` : ''} · ` +
    `final score ${total} · time ${formatTime(state.elapsed)}`,
  );
  hud.show('done');
  audio.fanfare();
}

function onFlightEvent(kind, data) {
  if (kind === 'ring') {
    audio.ring();
    ringViz.setState(state.ringsPassed, state.ringsPassed);
    hud.toast(`RING ${data} OF ${mission.rings.length} — +100`, 1800);
  } else if (kind === 'takeoff') {
    hud.toast('AIRBORNE — gear up in spirit, fly the gold ring', 2200);
  } else if (kind === 'landed') {
    audio.thud();
    const dDest = Math.hypot(state.x - mission.to.x, state.z - mission.to.z);
    const dStop = mission.fuelStopStrip
      ? Math.hypot(state.x - mission.fuelStopStrip.x, state.z - mission.fuelStopStrip.z) : 1e9;
    if (mission.fuelStop && !fuelStopDone && dStop < 300) {
      refuel(state);
      fuelStopDone = true;
      hud.toast('REFUELLED AT RIDGE CROSSING — tanks full, damage patched', 3200);
    } else if (dDest < 300 && state.ringsPassed >= mission.rings.length) {
      showDone();
    } else if (dDest < 300) {
      hud.toast(`Landed at ${mission.to.name} — but ${mission.rings.length - state.ringsPassed} ring(s) still to fly`, 3200);
    } else {
      hud.toast('Down safe — throttle up (W) to take off again', 2200);
    }
  } else if (kind === 'hard-landing') {
    audio.thud();
    hud.toast(`HARD LANDING — airframe damage ${Math.round(state.damage)}%`, 2600);
  } else if (kind === 'crash') {
    audio.crash();
    showOver('MISSION FAILED', `Crashed: ${data}. Score ${state.score} · rings ${state.ringsPassed}/${mission.rings.length}. Press R to fly again.`);
  } else if (kind === 'fuel-empty') {
    if (!fuelEmptyWarned) {
      fuelEmptyWarned = true;
      hud.toast('FUEL EMPTY — dead stick! Find a strip and glide in', 4000);
    }
  }
}

// --- buttons ---
document.getElementById('btn-fly').addEventListener('click', () => { audio.start(); audio.click(); startFlying(); });
document.getElementById('btn-resume').addEventListener('click', () => { screen = 'play'; hud.show(null); });
document.getElementById('btn-restart').addEventListener('click', () => { audio.click(); restart(); });
document.getElementById('btn-again').addEventListener('click', () => { audio.click(); restart(); });
document.getElementById('btn-menu').addEventListener('click', () => { setMission(mission.id); screen = 'title'; hud.show('title'); });
document.getElementById('btn-menu2').addEventListener('click', () => { setMission(mission.id); screen = 'title'; hud.show('title'); });

function resize() {
  const w = window.innerWidth; const h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  overlay.width = w * dpr; overlay.height = h * dpr;
  overlay.style.width = `${w}px`; overlay.style.height = `${h}px`;
  octx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resize);
resize();

function syncAircraft() {
  aircraft.group.position.set(state.x, state.y, state.z);
  aircraft.group.rotation.order = 'YXZ';
  aircraft.group.rotation.set(state.pitch, -state.heading, -state.roll);
  aircraft.prop.rotation.z += (2 + state.throttle * 42) * 0.016;
}

function updateCamera(dt) {
  const fwd = new THREE.Vector3(Math.sin(state.heading), 0, -Math.cos(state.heading));
  if (screen === 'title') {
    const orbit = input.consumeOrbit();
    titleAngle += 0.0004;
    const a = titleAngle + orbit.x * Math.PI * 2;
    const r = 26;
    const target = new THREE.Vector3(
      state.x + Math.cos(a) * r, state.y + 4 + orbit.y * 16, state.z + Math.sin(a) * r);
    camPos.lerp(target, 1 - Math.exp(-dt * 3));
    camera.position.copy(camPos);
    camera.lookAt(state.x, state.y + 1, state.z);
    return;
  }
  if (cameraMode === 'cockpit') {
    const eye = aircraft.group.localToWorld(new THREE.Vector3(0, 1.55, -1.1));
    const look = aircraft.group.localToWorld(new THREE.Vector3(0, 0.1, -60));
    camera.position.lerp(eye, 1 - Math.exp(-dt * 18));
    camLook.lerp(look, 1 - Math.exp(-dt * 18));
    camera.lookAt(camLook);
    return;
  }
  const desired = new THREE.Vector3(
    state.x - fwd.x * 15, state.y + 5.2, state.z - fwd.z * 15);
  camPos.lerp(desired, 1 - Math.exp(-dt * 4.5));
  camera.position.copy(camPos);
  const lookTarget = new THREE.Vector3(state.x + fwd.x * 26, state.y + 1, state.z + fwd.z * 26);
  camLook.lerp(lookTarget, 1 - Math.exp(-dt * 6));
  camera.lookAt(camLook);
}

function drawInstruments() {
  const w = window.innerWidth; const h = window.innerHeight;
  octx.clearRect(0, 0, w, h);
  if (screen === 'title') return;
  const hdgDeg = ((state.heading * 180) / Math.PI % 360 + 360) % 360;
  drawCompass(octx, w, hdgDeg);
  drawVsBar(octx, w, h, state.verticalSpeed);
  const altFt = Math.max(0, (state.y - 40) * M_TO_FT);
  if (cameraMode === 'cockpit') {
    // Full instrument panel across the bottom.
    octx.fillStyle = 'rgba(18,22,28,0.94)';
    octx.fillRect(0, h - 168, w, 168);
    octx.fillStyle = '#2a3138';
    octx.fillRect(0, h - 168, w, 4);
    const cy = h - 84;
    const cx = w / 2;
    drawHorizon(octx, cx - 210, cy, 62, state.pitch, state.roll);
    drawDial(octx, cx, cy, 62, 'ALT', altFt, 0, 6000, 'ft', 1000);
    drawDial(octx, cx + 210, cy, 62, 'SPD', state.speed, 0, 180, 'kt', 30);
    // Throttle + fuel on the panel.
    octx.fillStyle = '#9fb2c4'; octx.font = 'bold 12px monospace'; octx.textAlign = 'left';
    octx.fillText(`THR ${Math.round(state.throttle * 100)}%`, 24, h - 140);
    octx.fillStyle = '#222'; octx.fillRect(24, h - 128, 150, 12);
    octx.fillStyle = '#ffc21a'; octx.fillRect(24, h - 128, 150 * state.throttle, 12);
    octx.fillStyle = '#9fb2c4';
    octx.fillText(`FUEL ${Math.round(state.fuel)}%`, 24, h - 92);
    octx.fillStyle = '#222'; octx.fillRect(24, h - 80, 150, 12);
    octx.fillStyle = state.fuel < 25 ? '#ff5a4a' : '#37c978';
    octx.fillRect(24, h - 80, 150 * state.fuel / 100, 12);
    octx.fillStyle = '#9fb2c4';
    octx.fillText(`DMG ${Math.round(state.damage)}%`, 24, h - 44);
    octx.fillStyle = '#222'; octx.fillRect(24, h - 32, 150, 12);
    octx.fillStyle = '#ff5a4a'; octx.fillRect(24, h - 32, 150 * state.damage / 100, 12);
  } else {
    // Chase view: compact cluster, bottom right.
    const cx = w - 250; const cy = h - 92;
    octx.fillStyle = 'rgba(10,16,22,0.55)';
    octx.beginPath(); octx.roundRect(cx - 215, cy - 78, 420, 156, 12); octx.fill();
    drawHorizon(octx, cx - 130, cy, 52, state.pitch, state.roll);
    drawDial(octx, cx, cy, 52, 'ALT', altFt, 0, 6000, 'ft', 1000);
    drawDial(octx, cx + 130, cy, 52, 'SPD', state.speed, 0, 180, 'kt', 30);
  }
}

// --- shot staging ---
if (shotMode) {
  const api = {
    state, mission,
    setMission(id) {
      mission = missionById(id);
      scene.remove(ringViz.group);
      ringViz = buildRings(scene, mission.rings);
      state = spawnState(mission);
      api.state = state; api.mission = mission;
      ringViz.setState(state.ringsPassed, state.ringsPassed);
    },
    setCamera(mode) { cameraMode = mode; },
    stripHeight: (s) => world.stripHeight(s),
  };
  stageShot(shotName, api);
  state = api.state; mission = api.mission;
  ringViz.setState(state.ringsPassed, state.ringsPassed);
  screen = 'play';
  hud.show(null);
  // Snap the camera onto the staged pose.
  camPos.set(state.x - Math.sin(state.heading) * 15, state.y + 5.2, state.z + Math.cos(state.heading) * 15);
  camLook.set(state.x + Math.sin(state.heading) * 26, state.y + 1, state.z - Math.cos(state.heading) * 26);
  if (cameraMode === 'cockpit') {
    syncAircraft();
    const eye = aircraft.group.localToWorld(new THREE.Vector3(0, 1.55, -1.1));
    const look = aircraft.group.localToWorld(new THREE.Vector3(0, 0.1, -60));
    camPos.copy(eye); camLook.copy(look);
    camera.position.copy(eye); camera.lookAt(look);
  }
  document.title = `Ridge Runner — shot ${shotName}`;
  window.__shotReady = true;
} else {
  hud.buildMissionList(MISSIONS, mission.id, (picked) => {
    audio.start(); audio.click();
    setMission(picked);
    startFlying();
  });
  hud.show('title');
}

let last = performance.now();
let elapsed = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
  last = now;
  elapsed += dt;

  if (!shotMode) {
    if (input.pressed('KeyC')) cameraMode = cameraMode === 'chase' ? 'cockpit' : 'chase';
    if (input.pressed('KeyM')) hud.toast(audio.toggleMute() ? 'SOUND OFF (M)' : 'SOUND ON (M)', 1200);
    if (input.pressed('KeyR') && screen !== 'title') restart();
    if (input.pressed('KeyP') && (screen === 'play' || screen === 'pause')) {
      screen = screen === 'play' ? 'pause' : 'play';
      hud.show(screen === 'pause' ? 'pause' : null);
    }
    if (screen === 'title' && (input.pressed('Enter') || input.pressed('Space'))) startFlying();
    if (screen === 'play') {
      stepFlight(state, dt, input.flight(), heightAt, mission.rings, onFlightEvent);
      audio.setEngine(state.throttle, state.speed, !state.onGround);
      if (mission.timeLimit > 0 && state.elapsed > mission.timeLimit && !state.crashed) {
        state.crashed = true;
        onFlightEvent('crash', 'out of time');
      }
    }
    if (screen === 'play' || screen === 'pause' || screen === 'over' || screen === 'done') {
      hud.update(state, mission, cameraMode);
    }
  } else {
    hud.update(state, mission, cameraMode);
  }

  world.update(dt, elapsed);
  ringViz.pulse(elapsed);
  syncAircraft();
  updateCamera(shotMode ? 1 : dt);
  drawInstruments();
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);
window.__game = { get state() { return state; }, get mission() { return mission; }, restart, setMission };
