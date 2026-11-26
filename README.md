# Ridge Runner: Alpine Air Mail

[![rank](https://make.fun/badge/best-flight-game-20261126-0057/Mpusoyen/makefun-best-flight-game-20261126-0057/rank.svg)](https://make.fun/badge/best-flight-game-20261126-0057/Mpusoyen/makefun-best-flight-game-20261126-0057/rank.svg)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/Mpusoyen/makefun-best-flight-game-20261126-0057/reward.svg)](https://make.fun/badge/best-flight-game-20261126-0057/Mpusoyen/makefun-best-flight-game-20261126-0057/reward.svg)
[![make.fun](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/badge/best-flight-game-20261126-0057.svg)

A bush-plane courier game in a procedural alpine valley. Take off from Pine
Hollow, thread the glowing gold rings in order along the river valley, and put
the morning mail down on the destination airstrip. Three missions with
different goals: a mail run, a timed ridge dash, and a long hop with a fuel
stop at Ridge Crossing. Fuel drains as you fly, hard landings bend the
airframe, and a terrain strike ends the sortie.

## How to play

1. Pick a mission on the title screen (or press Enter for the mail run).
2. Hold **W** to spool the throttle up, then pull back (**↑**) once you are
   past 50 knots to lift off.
3. Bank with **←**/**→** to steer toward the gold ring; the next ring is
   always gold, later rings blue, flown rings green.
4. Ease the throttle back on final, flare gently, and touch down on the
   runway. Land at the destination strip after the last ring to deliver the
   mail and score the landing bonus.

The valley is fully procedural and deterministic (fixed seed): mountains, a
winding river, a lake, pine forests, two villages, three airstrips with
windsocks, drifting clouds and one sun. No network requests at runtime;
Three.js is vendored under `game/vendor/`.

## Controls

- **W** / **S** — throttle up / down
- **↑** / **↓** — pitch (pull back to climb)
- **←** / **→** — roll / bank to turn
- **A** / **D** (or **Q** / **E**) — rudder
- **C** — toggle cockpit / chase camera
- **P** — pause · **R** — restart mission · **M** — mute
- **Mouse** — drag to orbit the plane on the title screen; click the mission cards

## Screenshots

Staged deterministically with `?shot=cover|cockpit|runway|landing` (see
`game/src/shots.js`): the cover is a chase view over the valley with the next
ring ahead; the cockpit shot shows the lit instrument panel over the runway;
the runway shot is the final approach to Mirror Lake; the landing shot is the
mail-delivered moment.

## Files

- `game/index.html` — page, HUD and menus
- `game/src/main.js` — boot + game loop
- `game/src/terrain.js` — procedural world (terrain, river, lake, forest, villages, strips, clouds, rings)
- `game/src/aircraft.js` — the mail plane, built from primitives
- `game/src/physics.js` — arcade flight model (lift, stall, ground roll, landings, crashes)
- `game/src/missions.js` — the three missions, ring routes, scoring
- `game/src/hud.js` — DOM HUD and screens
- `game/src/instruments.js` — drawn artificial horizon, altimeter, airspeed dial, compass
- `game/src/audio.js` — synthesised WebAudio engine, wind, chimes
- `game/src/input.js` — keyboard + mouse
- `game/src/rng.js` — seeded RNG and value noise
- `game/src/config.js` — tuning constants
- `game/src/shots.js` — deterministic screenshot staging
- `game/vendor/three.min.js` — Three.js r149 (vendored UMD build)
