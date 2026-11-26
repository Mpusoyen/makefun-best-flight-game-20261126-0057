// Ridge Runner — HUD and menus (one job: every DOM readout, banner and screen).
import { formatTime } from './missions.js';
import { M_TO_FT } from './physics.js';

function el(id) { return document.getElementById(id); }

export function createHud() {
  const refs = {
    alt: el('hud-alt'), speed: el('hud-speed'), hdg: el('hud-hdg'),
    throttle: el('hud-throttle'), fuelBar: el('hud-fuel-bar'), fuelText: el('hud-fuel'),
    damageBar: el('hud-damage-bar'), objective: el('hud-objective'),
    rings: el('hud-rings'), score: el('hud-score'), timer: el('hud-timer'),
    banner: el('hud-banner'), toast: el('hud-toast'),
    title: el('screen-title'), pause: el('screen-pause'),
    over: el('screen-over'), overTitle: el('over-title'), overText: el('over-text'),
    done: el('screen-done'), doneText: el('done-text'),
    missionName: el('title-mission'), missionList: el('mission-list'),
  };
  let toastUntil = 0;

  return {
    refs,
    show(screen) {
      for (const key of ['title', 'pause', 'over', 'done']) {
        if (refs[key]) refs[key].classList.toggle('hidden', key !== screen);
      }
      if (refs.title && screen === 'title') refs.title.classList.remove('hidden');
    },
    update(state, mission, cameraMode) {
      const altFt = Math.max(0, Math.round((state.y - 40) * M_TO_FT));
      refs.alt.textContent = `${altFt.toLocaleString('en-US')} ft`;
      refs.speed.textContent = `${Math.round(state.speed)} kt`;
      const hdg = Math.round(((state.heading * 180) / Math.PI) % 360 + 360) % 360;
      refs.hdg.textContent = `${String(hdg).padStart(3, '0')}°`;
      refs.throttle.textContent = `${Math.round(state.throttle * 100)}%`;
      refs.fuelBar.style.width = `${state.fuel}%`;
      refs.fuelBar.classList.toggle('low', state.fuel < 25);
      refs.fuelText.textContent = `FUEL ${Math.round(state.fuel)}%`;
      refs.damageBar.style.width = `${state.damage}%`;
      refs.rings.textContent = `RINGS ${state.ringsPassed}/${mission.rings.length}`;
      refs.score.textContent = `SCORE ${state.score}`;
      refs.timer.textContent = mission.timeLimit > 0
        ? `⏱ ${formatTime(Math.max(0, mission.timeLimit - state.elapsed))}`
        : `⏱ ${formatTime(state.elapsed)}`;
      const target = state.ringsPassed < mission.rings.length
        ? `Ring ${state.ringsPassed + 1} of ${mission.rings.length}`
        : `Land at ${mission.to.name}`;
      refs.objective.textContent = `${mission.name} — ${target} · ${cameraMode === 'cockpit' ? 'COCKPIT' : 'CHASE'} cam (C)`;
      if (state.message && performance.now() < state.messageUntil) {
        refs.banner.textContent = state.message;
        refs.banner.classList.remove('hidden');
      } else {
        refs.banner.classList.add('hidden');
      }
    },
    toast(text, ms = 2600) {
      refs.toast.textContent = text;
      refs.toast.classList.remove('hidden');
      toastUntil = performance.now() + ms;
      setTimeout(() => {
        if (performance.now() >= toastUntil) refs.toast.classList.add('hidden');
      }, ms);
    },
    setOver(title, text) {
      refs.overTitle.textContent = title;
      refs.overText.textContent = text;
    },
    setDone(text) { refs.doneText.textContent = text; },
    buildMissionList(missions, currentId, onPick) {
      refs.missionList.innerHTML = '';
      missions.forEach((m, i) => {
        const b = document.createElement('button');
        b.className = 'mission-btn' + (m.id === currentId ? ' active' : '');
        b.innerHTML = `<b>${i + 1}. ${m.name}</b><span>${m.brief}</span>`;
        b.addEventListener('click', () => onPick(m.id));
        refs.missionList.appendChild(b);
      });
    },
  };
}
