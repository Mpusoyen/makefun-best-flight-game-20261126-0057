// Ridge Runner — keyboard + mouse input (one job: read the pilot, nothing else).
// W/S or Up/Down: throttle. Arrows: pitch (Up/Down) and roll (Left/Right).
// A/D or Q/E: rudder. C camera, R restart, P pause, M mute, 1/2/3 missions.

export function createInput() {
  const keys = new Set();
  const mouse = { down: false, dx: 0, dy: 0, orbitX: 0.5, orbitY: 0.35 };
  let lastDx = 0; let lastDy = 0;

  const KEYMAP = {
    KeyW: 'throttleUp', ArrowUp: 'throttleUp',
    KeyS: 'throttleDown', ArrowDown: 'throttleDown',
    ArrowLeft: 'rollLeft', ArrowRight: 'rollRight',
    KeyA: 'yawLeft', KeyD: 'yawRight',
    KeyQ: 'yawLeft', KeyE: 'yawRight',
  };

  function onKeyDown(e) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    keys.add(e.code);
  }
  function onKeyUp(e) { keys.delete(e.code); }
  function onMouseDown(e) { mouse.down = true; lastDx = e.clientX; lastDy = e.clientY; }
  function onMouseMove(e) {
    if (!mouse.down) return;
    mouse.dx = e.clientX - lastDx; mouse.dy = e.clientY - lastDy;
    lastDx = e.clientX; lastDy = e.clientY;
    mouse.orbitX = Math.min(1, Math.max(0, mouse.orbitX + mouse.dx / 600));
    mouse.orbitY = Math.min(0.85, Math.max(0.05, mouse.orbitY - mouse.dy / 600));
  }
  function onMouseUp() { mouse.down = false; mouse.dx = 0; mouse.dy = 0; }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);

  return {
    // Continuous flight controls, -1..1 each (throttleDelta is per second).
    flight() {
      const down = (code) => keys.has(code);
      const pitch = (down('ArrowUp') ? 1 : 0) - (down('ArrowDown') ? 1 : 0);
      const roll = (down('ArrowRight') ? 1 : 0) - (down('ArrowLeft') ? 1 : 0);
      const yaw = (down('KeyD') || down('KeyE') ? 1 : 0) - (down('KeyA') || down('KeyQ') ? 1 : 0);
      const throttleDelta = (down('KeyW') ? 0.55 : 0) - (down('KeyS') ? 0.55 : 0);
      return { pitch, roll, yaw, throttleDelta };
    },
    // One-shot keys: returns true once per press.
    pressed(code) {
      if (!keys.has(code)) return false;
      keys.delete(code);
      return true;
    },
    has(code) { return keys.has(code); },
    mouse,
    consumeOrbit() {
      const o = { x: mouse.orbitX, y: mouse.orbitY };
      return o;
    },
  };
}
