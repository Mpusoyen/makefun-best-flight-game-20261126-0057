// Ridge Runner — the mail plane, built from primitives (one job: the aircraft mesh).
// Three.js r149 is vendored as a classic UMD build, loaded by index.html
// before this module: window.THREE is the namespace.
const THREE = window.THREE;
import { COLOURS } from './config.js';

// A high-wing bush plane in post-red and cream, with a spinning prop, fixed
// gear and a mail pod under the belly. Forward is -Z in local space.
export function buildAircraft() {
  const red = new THREE.MeshLambertMaterial({ color: COLOURS.planeRed });
  const cream = new THREE.MeshLambertMaterial({ color: COLOURS.planeCream });
  const dark = new THREE.MeshLambertMaterial({ color: 0x2b2e33 });
  const glass = new THREE.MeshLambertMaterial({ color: 0x9fd4e8, transparent: true, opacity: 0.85 });
  const plane = new THREE.Group();

  const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.55, 5.6, 12), red);
  fuselage.rotation.x = Math.PI / 2;
  fuselage.castShadow = true;
  plane.add(fuselage);

  const nose = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.62, 1.1, 12), cream);
  nose.rotation.x = Math.PI / 2;
  nose.position.z = -3.1;
  nose.castShadow = true;
  plane.add(nose);

  const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.72, 12, 10), glass);
  canopy.scale.set(1, 0.85, 1.5);
  canopy.position.set(0, 0.75, -0.9);
  plane.add(canopy);
  // Canopy frame rails: thin dark boxes hugging each side of the glass.
  for (const s of [-1, 1]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.09, 1.9), dark);
    rail.position.set(s * 0.62, 0.82, -0.9);
    rail.rotation.x = 0.08;
    plane.add(rail);
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.55, 0.09), dark);
    pillar.position.set(s * 0.58, 0.95, -1.72);
    pillar.rotation.x = -0.25;
    plane.add(pillar);
  }

  const wing = new THREE.Mesh(new THREE.BoxGeometry(11.4, 0.22, 1.9), cream);
  wing.position.set(0, 0.95, -0.4);
  wing.castShadow = true;
  plane.add(wing);
  for (const s of [-1, 1]) {
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.6, 6), dark);
    strut.position.set(s * 2.4, 0.35, -0.4);
    strut.rotation.z = s * 0.5;
    plane.add(strut);
    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 1.9), red);
    tip.position.set(s * 5.55, 0.95, -0.4);
    plane.add(tip);
  }

  const hStab = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.16, 1.1), cream);
  hStab.position.set(0, 0.25, 2.7);
  hStab.castShadow = true;
  plane.add(hStab);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.7, 1.4), red);
  fin.position.set(0, 0.9, 2.65);
  fin.castShadow = true;
  plane.add(fin);

  // Spinning prop (two blades + hub) at the nose.
  const prop = new THREE.Group();
  const bladeMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
  for (const a of [0, Math.PI]) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.28, 2.6, 0.1), bladeMat);
    blade.position.y = 0;
    const holder = new THREE.Group();
    holder.rotation.z = a;
    holder.add(blade);
    blade.position.y = 0.0;
    prop.add(holder);
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.5, 10), dark);
  hub.rotation.x = Math.PI / 2;
  prop.add(hub);
  // Spinner cone at the prop hub front, pointing forward (-Z).
  const spinner = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.7, 12), cream);
  spinner.rotation.x = -Math.PI / 2;
  spinner.position.z = -0.55;
  spinner.castShadow = true;
  prop.add(spinner);
  prop.position.z = -3.75;
  plane.add(prop);

  // Cheatline stripe: thin cream band along each fuselage side.
  for (const s of [-1, 1]) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.22, 4.6), cream);
    stripe.position.set(s * 0.78, -0.05, 0.1);
    plane.add(stripe);
  }
  // Tail fin flash: cream band across the red fin.
  const finFlash = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.32, 1.2), cream);
  finFlash.position.set(0, 1.15, 2.65);
  plane.add(finFlash);

  // Mail pod + fixed gear.
  const pod = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.7, 2.2), cream);
  pod.position.set(0, -0.95, 0.2);
  pod.castShadow = true;
  plane.add(pod);
  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.1, 6), dark);
    leg.position.set(s * 0.8, -1.15, -0.9);
    plane.add(leg);
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 12), dark);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(s * 0.8, -1.65, -0.9);
    wheel.castShadow = true;
    plane.add(wheel);
  }

  // Tail wheel: small wheel on a leg at the rear bottom.
  const tailLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.55, 6), dark);
  tailLeg.position.set(0, -0.55, 2.55);
  tailLeg.rotation.x = 0.35;
  plane.add(tailLeg);
  const tailWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.14, 10), dark);
  tailWheel.rotation.z = Math.PI / 2;
  tailWheel.position.set(0, -0.82, 2.65);
  plane.add(tailWheel);

  // Antenna mast on the canopy rear, with a wire line to the fin top.
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.045, 0.55, 6), dark);
  mast.position.set(0, 1.35, -0.15);
  plane.add(mast);
  const wireGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 1.62, -0.15),
    new THREE.Vector3(0, 1.72, 2.65),
  ]);
  const wire = new THREE.Line(wireGeo, new THREE.LineBasicMaterial({ color: 0x222222 }));
  plane.add(wire);

  // Exhaust stubs under the nose sides.
  for (const s of [-1, 1]) {
    const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.5, 8), dark);
    exhaust.rotation.x = Math.PI / 2 - 0.35;
    exhaust.position.set(s * 0.55, -0.62, -3.0);
    plane.add(exhaust);
  }
  // Pitot tube under the left wing.
  const pitot = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.7, 6), dark);
  pitot.rotation.x = Math.PI / 2;
  pitot.position.set(-3.2, 0.78, -0.9);
  plane.add(pitot);
  // Red beacon on top of the fin.
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xff2222 }));
  beacon.position.set(0, 1.82, 2.65);
  plane.add(beacon);

  // Navigation lights.
  const navL = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xff2222 }));
  navL.position.set(-5.7, 0.95, -0.4);
  const navR = navL.clone();
  navR.material = new THREE.MeshBasicMaterial({ color: 0x22ff66 });
  navR.position.x = 5.7;
  plane.add(navL); plane.add(navR);

  return { group: plane, prop };
}
