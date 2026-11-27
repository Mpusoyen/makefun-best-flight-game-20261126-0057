// Ridge Runner — procedural alpine world (one job: terrain, water, trees,
// villages, airstrips, clouds and rings; deterministic from WORLD.seed).
// Three.js r149 is vendored as a classic UMD build, loaded by index.html
// before this module: window.THREE is the namespace.
const THREE = window.THREE;
import { WORLD, HOME_STRIP, LAKE_STRIP, MID_STRIP, COLOURS } from './config.js';
import { makeNoise2D, makeRng } from './rng.js';

const fbm = makeNoise2D(WORLD.seed);
const STRIPS = [HOME_STRIP, LAKE_STRIP, MID_STRIP];
const STRIP_H = new Map([[HOME_STRIP, 58], [LAKE_STRIP, 60], [MID_STRIP, 70]]);
const LAKE = { x: 980, z: -820, r: 330 };

export function riverZ(x) {
  return 420 * Math.sin(x / 1100) + 180 * Math.sin(x / 317 + 1.7);
}
function smoothstep(a, b, t) {
  const x = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return x * x * (3 - 2 * x);
}
function mix(a, b, t) { return a + (b - a) * t; }

export function heightAt(x, z) {
  const n = fbm(x * 0.00045 + 7.3, z * 0.00045 + 2.9, 4);
  const ridge = Math.pow(Math.max(0, n), 1.35);
  const dRiver = Math.abs(z - riverZ(x));
  const valley = smoothstep(120, 1100, dRiver);
  let h = WORLD.valleyFloor + ridge * WORLD.maxHeight * (0.3 + 0.7 * valley);
  h = mix(42, h, smoothstep(30, 260, dRiver)); // river channel
  const dLake = Math.hypot(x - LAKE.x, z - LAKE.z);
  h = mix(48, h, smoothstep(LAKE.r * 0.7, LAKE.r * 1.15, dLake)); // lake bowl
  for (const s of STRIPS) {
    const d = Math.hypot(x - s.x, z - s.z);
    h = mix(h, STRIP_H.get(s), smoothstep(340, 150, d)); // flattened bench
  }
  const edge = Math.max(Math.abs(x), Math.abs(z));
  h += smoothstep(1850, 2100, edge) * 320; // enclosing rim
  return h;
}

function colourFor(h, slope, x, z) {
  const c = new THREE.Color();
  if (h > 470) c.setHex(COLOURS.snow);
  else if (h > 330 || slope > 0.55) c.setHex(COLOURS.rock);
  else if (h > 150) c.setHex(COLOURS.grassHigh).lerp(new THREE.Color(COLOURS.rock), (h - 150) / 420);
  else c.setHex(COLOURS.grassLow).lerp(new THREE.Color(COLOURS.grassHigh), h / 220);
  // Scree band: steep slopes just below the snowline lighten to grey-tan.
  if (h > 380 && h <= 470 && slope > 0.35) {
    const screeT = smoothstep(0.35, 0.75, slope) * smoothstep(380, 430, h);
    c.lerp(new THREE.Color(0xb8ab94), screeT * 0.65);
  }
  // Patchy meadow variation so the valley floor is not one flat green.
  const v = 0.88 + 0.24 * (fbm(x * 0.004 + 31, z * 0.004 + 17, 3) * 0.5 + 0.5);
  c.multiplyScalar(v);
  // Second, finer noise octave for close-up texture feel (±8% brightness).
  const fine = 0.92 + 0.16 * (fbm(x * 0.02 + 53, z * 0.02 + 71, 2) * 0.5 + 0.5);
  c.multiplyScalar(fine);
  return c;
}

function buildGround(scene) {
  const seg = 220;
  const geo = new THREE.PlaneGeometry(WORLD.size, WORLD.size, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colours = new Float32Array(pos.count * 3);
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i); const z = pos.getZ(i);
    const h = heightAt(x, z);
    pos.setY(i, h);
    const slope = Math.abs(heightAt(x + 8, z) - h) / 8 + Math.abs(heightAt(x, z + 8) - h) / 8;
    tmp.copy(colourFor(h, slope, x, z));
    colours[i * 3] = tmp.r; colours[i * 3 + 1] = tmp.g; colours[i * 3 + 2] = tmp.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colours, 3));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }));
  mesh.receiveShadow = true;
  scene.add(mesh);
}

function buildWater(scene) {
  const mat = new THREE.MeshPhongMaterial({
    color: COLOURS.river, transparent: true, opacity: 0.92, shininess: 120, specular: 0xbfe3ff,
  });
  // River ribbon following riverZ.
  const pts = [];
  for (let x = -2100; x <= 2100; x += 100) pts.push(new THREE.Vector3(x, 43.5, riverZ(x)));
  const ribbon = new THREE.BufferGeometry();
  const verts = [];
  for (let i = 0; i < pts.length; i += 1) {
    const p = pts[i];
    verts.push(p.x - 45, p.y, p.z, p.x + 45, p.y, p.z);
  }
  const idx = [];
  for (let i = 0; i < pts.length - 1; i += 1) {
    const a = i * 2;
    idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  ribbon.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  ribbon.setIndex(idx);
  ribbon.computeVertexNormals();
  scene.add(new THREE.Mesh(ribbon, mat));
  // Lake disc.
  const lake = new THREE.Mesh(new THREE.CircleGeometry(LAKE.r, 40),
    new THREE.MeshPhongMaterial({
      color: COLOURS.lake, transparent: true, opacity: 0.94, shininess: 120, specular: 0xbfe3ff,
    }));
  lake.rotation.x = -Math.PI / 2;
  lake.position.set(LAKE.x, 51, LAKE.z);
  scene.add(lake);
}

function buildForest(scene) {
  const rng = makeRng(WORLD.seed + 11);
  const trunkGeo = new THREE.CylinderGeometry(0.7, 1.1, 6, 5);
  const coneGeo = new THREE.ConeGeometry(4.5, 16, 6);
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x6b4a2f });
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x2e5d2a });
  const spots = [];
  let guard = 0;
  while (spots.length < 750 && guard < 20000) {
    guard += 1;
    const x = rng.range(-2000, 2000); const z = rng.range(-2000, 2000);
    const h = heightAt(x, z);
    if (h < 70 || h > 340) continue;
    if (Math.abs(z - riverZ(x)) < 90) continue;
    if (Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.r + 40) continue;
    if (STRIPS.some((s) => Math.hypot(x - s.x, z - s.z) < 330)) continue;
    spots.push({ x, z, h, s: rng.range(0.8, 1.6) });
  }
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, spots.length);
  const cones = new THREE.InstancedMesh(coneGeo, leafMat, spots.length);
  const m = new THREE.Matrix4(); const q = new THREE.Quaternion(); const v = new THREE.Vector3(); const sc = new THREE.Vector3();
  const coneColour = new THREE.Color();
  spots.forEach((p, i) => {
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rng.next() * Math.PI * 2);
    sc.setScalar(p.s);
    m.compose(v.set(p.x, p.h + 3 * p.s, p.z), q, sc); trunks.setMatrixAt(i, m);
    m.compose(v.set(p.x, p.h + (6 + 8) * p.s, p.z), q, sc); cones.setMatrixAt(i, m);
    // Per-instance green variation so the forest is not one flat colour.
    coneColour.setHex(0x2e5d2a);
    coneColour.offsetHSL(rng.range(-0.03, 0.03), rng.range(-0.08, 0.08), rng.range(-0.05, 0.07));
    cones.setColorAt(i, coneColour);
  });
  if (cones.instanceColor) cones.instanceColor.needsUpdate = true;
  trunks.castShadow = true; cones.castShadow = true;
  scene.add(trunks); scene.add(cones);
}

function buildRocks(scene) {
  const rng = makeRng(WORLD.seed + 37);
  const rockGeo = new THREE.DodecahedronGeometry(1, 0);
  const rockMat = new THREE.MeshLambertMaterial({ color: 0x8a8378 });
  const spots = [];
  let guard = 0;
  while (spots.length < 120 && guard < 20000) {
    guard += 1;
    const x = rng.range(-2000, 2000); const z = rng.range(-2000, 2000);
    const h = heightAt(x, z);
    if (h < 200 || h > 520) continue;
    const slope = Math.abs(heightAt(x + 8, z) - h) / 8 + Math.abs(heightAt(x, z + 8) - h) / 8;
    if (slope < 0.45) continue;
    if (Math.abs(z - riverZ(x)) < 90) continue;
    if (Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.r + 40) continue;
    if (STRIPS.some((s) => Math.hypot(x - s.x, z - s.z) < 330)) continue;
    spots.push({ x, z, h, r: rng.range(1.5, 4) });
  }
  const rocks = new THREE.InstancedMesh(rockGeo, rockMat, spots.length);
  const m = new THREE.Matrix4(); const q = new THREE.Quaternion(); const v = new THREE.Vector3(); const sc = new THREE.Vector3();
  const rockColour = new THREE.Color();
  spots.forEach((p, i) => {
    q.setFromEuler(new THREE.Euler(rng.next() * Math.PI, rng.next() * Math.PI, rng.next() * Math.PI));
    sc.set(p.r * rng.range(0.8, 1.3), p.r * rng.range(0.6, 1), p.r * rng.range(0.8, 1.3));
    m.compose(v.set(p.x, p.h + p.r * 0.25, p.z), q, sc);
    rocks.setMatrixAt(i, m);
    rockColour.setHex(0x8a8378);
    rockColour.offsetHSL(0, rng.range(-0.03, 0.03), rng.range(-0.06, 0.06));
    rocks.setColorAt(i, rockColour);
  });
  if (rocks.instanceColor) rocks.instanceColor.needsUpdate = true;
  rocks.castShadow = true;
  scene.add(rocks);
}

function buildVillage(scene, cx, cz, count, seedOff) {
  const rng = makeRng(WORLD.seed + seedOff);
  const wallMat = new THREE.MeshLambertMaterial({ color: 0xe8dcc0 });
  const wallMat2 = new THREE.MeshLambertMaterial({ color: 0xc9b18a });
  const roofMat = new THREE.MeshLambertMaterial({ color: 0xa34a32 });
  const group = new THREE.Group();
  for (let i = 0; i < count; i += 1) {
    const x = cx + rng.range(-190, 190); const z = cz + rng.range(-150, 150);
    if (STRIPS.some((s) => Math.hypot(x - s.x, z - s.z) < 260)) continue;
    if (Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.r + 40) continue;
    const h = heightAt(x, z);
    const w = rng.range(9, 15); const d = rng.range(8, 13); const ht = rng.range(5, 8);
    const house = new THREE.Mesh(new THREE.BoxGeometry(w, ht, d), rng.chance(0.5) ? wallMat : wallMat2);
    house.position.set(x, h + ht / 2, z);
    house.rotation.y = rng.next() * Math.PI;
    house.castShadow = true;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.75, 4, 4), roofMat);
    roof.position.set(x, h + ht + 2, z);
    roof.rotation.y = Math.PI / 4 + house.rotation.y;
    roof.castShadow = true;
    group.add(house); group.add(roof);
  }
  scene.add(group);
}

function buildStrip(scene, strip, windsocks) {
  const h = STRIP_H.get(strip);
  // One rotated group per strip: local +X runs along the runway, i.e. along
  // the flight direction (sin h, -cos h); rotation.y = PI/2 - h maps +X there.
  const group = new THREE.Group();
  group.position.set(strip.x, h + 0.4, strip.z);
  group.rotation.y = Math.PI / 2 - strip.heading;
  const flat = (geo) => { geo.rotateX(-Math.PI / 2); return geo; };
  const runway = new THREE.Mesh(flat(new THREE.PlaneGeometry(430, 26)),
    new THREE.MeshLambertMaterial({ color: COLOURS.runway }));
  runway.position.y = 0;
  runway.receiveShadow = true;
  group.add(runway);
  // Centre dashes along local +X.
  const dashMat = new THREE.MeshBasicMaterial({ color: 0xf5f5f0 });
  const dashGeo = flat(new THREE.PlaneGeometry(16, 2.4));
  for (let d = -180; d <= 180; d += 45) {
    const dash = new THREE.Mesh(dashGeo, dashMat);
    dash.position.set(d, 0.15, 0);
    group.add(dash);
  }
  // Windsock beside the runway (local +Z side).
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 9, 6),
    new THREE.MeshLambertMaterial({ color: 0xd8d8d8 }));
  pole.position.set(0, 4.5, 30);
  group.add(pole);
  const sock = new THREE.Mesh(new THREE.ConeGeometry(1.1, 5, 8),
    new THREE.MeshLambertMaterial({ color: 0xff7a1a }));
  sock.rotation.z = Math.PI / 2;
  sock.position.set(2.5, 8.6, 30);
  group.add(sock);
  windsocks.push(sock);
  // A couple of hangars at the home strip.
  if (strip === HOME_STRIP) {
    const hangarMat = new THREE.MeshLambertMaterial({ color: 0x7d8a99 });
    for (const off of [-70, -40]) {
      const hangar = new THREE.Mesh(new THREE.BoxGeometry(22, 10, 18), hangarMat);
      hangar.position.set(off, 5, 46);
      hangar.castShadow = true;
      group.add(hangar);
    }
  }
  scene.add(group);
}

function buildClouds(scene) {
  const rng = makeRng(WORLD.seed + 23);
  const mat = new THREE.MeshLambertMaterial({
    color: 0xffffff, transparent: true, opacity: 0.95, emissive: 0x555f6a,
  });
  const clouds = [];
  for (let i = 0; i < 26; i += 1) {
    const g = new THREE.Group();
    const puffs = rng.int(3, 5);
    for (let p = 0; p < puffs; p += 1) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(rng.range(18, 34), 10, 8), mat);
      // Vary puff flattening more; lower puffs keep a bit more volume.
      const py = rng.range(-4, 4);
      s.scale.y = py < 0 ? rng.range(0.55, 0.75) : rng.range(0.35, 0.6);
      s.scale.x = rng.range(0.85, 1.3);
      s.scale.z = rng.range(0.85, 1.2);
      s.position.set(rng.range(-40, 40), py, rng.range(-18, 18));
      g.add(s);
    }
    g.position.set(rng.range(-2000, 2000), rng.range(480, 720), rng.range(-2000, 2000));
    scene.add(g);
    clouds.push({ group: g, speed: rng.range(2, 5) });
  }
  return clouds;
}

export function buildRings(scene, positions) {
  const group = new THREE.Group();
  const meshes = positions.map((p) => {
    const ring = new THREE.Group();
    const torus = new THREE.Mesh(new THREE.TorusGeometry(20, 1.4, 10, 40),
      new THREE.MeshBasicMaterial({ color: COLOURS.ringLater }));
    const inner = new THREE.Mesh(new THREE.TorusGeometry(20, 0.35, 8, 40),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 }));
    ring.add(torus); ring.add(inner);
    ring.position.set(p.x, p.y, p.z);
    ring.rotation.y = p.yaw || 0;
    group.add(ring);
    return { group: ring, torus, inner, pos: p };
  });
  scene.add(group);
  return {
    group,
    setState(index, doneCount) {
      meshes.forEach((m, i) => {
        const col = i < doneCount ? COLOURS.ringDone : i === index ? COLOURS.ringNext : COLOURS.ringLater;
        m.torus.material.color.setHex(col);
        m.group.visible = i >= doneCount;
        m.group.scale.setScalar(i === index ? 1 : 0.92);
      });
    },
    pulse(t) {
      meshes.forEach((m, i) => {
        if (i === 0) return;
        m.group.rotation.y = (m.pos.yaw || 0) + Math.sin(t * 0.8 + i) * 0.06;
      });
    },
  };
}

function buildSkyDome(scene) {
  // Gradient sky dome: horizon fog colour up to a deeper zenith blue.
  const geo = new THREE.SphereGeometry(5200, 24, 16);
  const pos = geo.attributes.position;
  const colours = new Float32Array(pos.count * 3);
  const horizon = new THREE.Color(COLOURS.fog);
  const zenith = new THREE.Color(0x4a90d9);
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i += 1) {
    const y = pos.getY(i) / 5200;
    const t = Math.min(1, Math.max(0, y * 1.6 + 0.12));
    tmp.copy(horizon).lerp(zenith, t * t);
    colours[i * 3] = tmp.r; colours[i * 3 + 1] = tmp.g; colours[i * 3 + 2] = tmp.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colours, 3));
  const dome = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
    vertexColors: true, fog: false, side: THREE.BackSide,
  }));
  scene.add(dome);
}

function makeSunGlowTexture() {
  const size = 256;
  const cv = document.createElement('canvas');
  cv.width = size; cv.height = size;
  const ctx = cv.getContext('2d');
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255,244,200,0.85)');
  grad.addColorStop(0.25, 'rgba(255,230,160,0.45)');
  grad.addColorStop(0.6, 'rgba(255,210,120,0.14)');
  grad.addColorStop(1, 'rgba(255,210,120,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(cv);
}

export function buildWorld(scene) {
  scene.background = new THREE.Color(COLOURS.sky);
  scene.fog = new THREE.Fog(COLOURS.fog, WORLD.fogNear, WORLD.fogFar);
  buildSkyDome(scene);
  const hemi = new THREE.HemisphereLight(0xbfd9ff, 0x5d7a4a, 0.75);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffe3b3, 1.5);
  sun.position.set(1100, 950, 500);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -620; sun.shadow.camera.right = 620;
  sun.shadow.camera.top = 620; sun.shadow.camera.bottom = -620;
  sun.shadow.camera.far = 4000;
  scene.add(sun);
  // Sun disc in the sky.
  const disc = new THREE.Mesh(new THREE.CircleGeometry(60, 24),
    new THREE.MeshBasicMaterial({ color: 0xfff6c9, fog: false }));
  disc.position.set(1500, 1150, -2600);
  disc.lookAt(0, 0, 0);
  scene.add(disc);
  // Soft glow sprite around the sun disc.
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: makeSunGlowTexture(), transparent: true, depthWrite: false, fog: false,
  }));
  glow.position.copy(disc.position);
  glow.scale.setScalar(700);
  scene.add(glow);

  buildGround(scene);
  buildWater(scene);
  buildForest(scene);
  buildRocks(scene);
  buildVillage(scene, HOME_STRIP.x + 260, HOME_STRIP.z + 320, 16, 31);
  buildVillage(scene, LAKE_STRIP.x - 300, LAKE_STRIP.z + 260, 13, 47);
  const windsocks = [];
  for (const s of STRIPS) buildStrip(scene, s, windsocks);
  const clouds = buildClouds(scene);

  return {
    heightAt,
    stripHeight: (s) => STRIP_H.get(s),
    update(dt, t) {
      for (const c of clouds) {
        c.group.position.x += c.speed * dt;
        if (c.group.position.x > 2100) c.group.position.x = -2100;
      }
      const sway = Math.sin(t * 0.6) * 0.25;
      for (const w of windsocks) w.rotation.y = sway;
    },
  };
}
