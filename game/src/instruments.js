// Ridge Runner — drawn flight instruments (one job: horizon, dials, compass on 2D canvas).
// These are drawn every frame from the live flight state, so they look flown,
// not pasted: the horizon tilts with roll, the needles move with the numbers.

// Draw the artificial horizon ball + fixed wings mark in a round gauge.
export function drawHorizon(ctx, x, y, r, pitch, roll) {
  ctx.save();
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.clip();
  ctx.translate(x, y);
  ctx.rotate(-roll);
  const pitchPx = pitch * r * 1.6;
  ctx.translate(0, pitchPx);
  ctx.fillStyle = '#3f7fc4';
  ctx.fillRect(-r * 2, -r * 2, r * 4, r * 2);
  ctx.fillStyle = '#8a6a42';
  ctx.fillRect(-r * 2, 0, r * 4, r * 2);
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-r, 0); ctx.lineTo(r, 0); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1;
  for (const d of [-0.35, -0.17, 0.17, 0.35]) {
    ctx.beginPath(); ctx.moveTo(-r * 0.3, d * r); ctx.lineTo(r * 0.3, d * r); ctx.stroke();
  }
  ctx.restore();
  // Bezel + fixed aircraft mark.
  ctx.save();
  ctx.strokeStyle = '#e8e2d0'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = '#ffc21a'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x - r * 0.55, y); ctx.lineTo(x - r * 0.18, y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + r * 0.18, y); ctx.lineTo(x + r * 0.55, y); ctx.stroke();
  ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fillStyle = '#ffc21a'; ctx.fill();
  ctx.restore();
}

// Round dial with a needle: value mapped between min and max over 270 degrees.
export function drawDial(ctx, x, y, r, label, value, min, max, unit, majorStep) {
  ctx.save();
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = '#141a20'; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.restore();
  ctx.strokeStyle = '#e8e2d0'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#e8e2d0'; ctx.font = `bold ${Math.round(r * 0.28)}px sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(label, x, y - r * 0.55);
  ctx.font = `${Math.round(r * 0.2)}px sans-serif`;
  ctx.fillStyle = '#9fb2c4';
  ctx.fillText(unit, x, y + r * 0.62);
  const span = max - min;
  ctx.strokeStyle = '#cfd8e2'; ctx.lineWidth = 2;
  for (let v = min; v <= max + 0.001; v += majorStep) {
    const a = -Math.PI * 0.75 + ((v - min) / span) * Math.PI * 1.5;
    const x1 = x + Math.cos(a) * r * 0.82; const y1 = y + Math.sin(a) * r * 0.82;
    const x2 = x + Math.cos(a) * r * 0.94; const y2 = y + Math.sin(a) * r * 0.94;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }
  const clamped = Math.min(max, Math.max(min, value));
  const a = -Math.PI * 0.75 + ((clamped - min) / span) * Math.PI * 1.5;
  ctx.strokeStyle = '#ffc21a'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(a) * r * 0.8, y + Math.sin(a) * r * 0.8); ctx.stroke();
  ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fillStyle = '#ffc21a'; ctx.fill();
  ctx.fillStyle = '#ffffff'; ctx.font = `bold ${Math.round(r * 0.34)}px monospace`;
  ctx.fillText(String(Math.round(value)), x, y + r * 0.28);
  ctx.restore();
}

// Compass strip across the top: cardinal ticks scroll with heading.
export function drawCompass(ctx, w, headingDeg) {
  const h = 34;
  ctx.save();
  ctx.fillStyle = 'rgba(10,16,22,0.72)';
  ctx.fillRect(0, 0, w, h);
  const pxPerDeg = 4;
  const cx = w / 2;
  ctx.font = 'bold 13px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const names = { 0: 'N', 45: 'NE', 90: 'E', 135: 'SE', 180: 'S', 225: 'SW', 270: 'W', 315: 'NW' };
  for (let d = -60; d <= 60; d += 5) {
    let deg = Math.round((headingDeg + d) % 360);
    if (deg < 0) deg += 360;
    const x = cx + d * pxPerDeg;
    const major = deg % 45 === 0;
    ctx.strokeStyle = major ? '#ffffff' : 'rgba(255,255,255,0.45)';
    ctx.lineWidth = major ? 2 : 1;
    ctx.beginPath(); ctx.moveTo(x, major ? 6 : 12); ctx.lineTo(x, 20); ctx.stroke();
    if (major) {
      ctx.fillStyle = '#ffffff';
      ctx.fillText(names[deg] || String(deg), x, 27);
    } else if (deg % 15 === 0) {
      ctx.fillStyle = '#c8d4de';
      ctx.fillText(String(deg), x, 27);
    }
  }
  // Centre caret + heading readout.
  ctx.fillStyle = '#ffc21a';
  ctx.beginPath(); ctx.moveTo(cx - 7, 0); ctx.lineTo(cx + 7, 0); ctx.lineTo(cx, 8); ctx.closePath(); ctx.fill();
  ctx.restore();
}

// Vertical-speed bar on the right edge.
export function drawVsBar(ctx, w, h, vs) {
  const x = w - 26; const top = h * 0.3; const height = h * 0.4;
  ctx.save();
  ctx.fillStyle = 'rgba(10,16,22,0.72)';
  ctx.fillRect(x - 8, top - 24, 40, height + 48);
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, top + height); ctx.stroke();
  ctx.strokeStyle = '#ffffff';
  ctx.beginPath(); ctx.moveTo(x - 6, top + height / 2); ctx.lineTo(x + 6, top + height / 2); ctx.stroke();
  const frac = Math.max(-1, Math.min(1, vs / 10));
  const y = top + height / 2 - frac * (height / 2);
  ctx.fillStyle = vs < -6 ? '#ff5a4a' : '#37c978';
  ctx.fillRect(x - 5, Math.min(y, top + height / 2), 10, Math.abs(y - (top + height / 2)) || 2);
  ctx.fillStyle = '#c8d4de'; ctx.font = '11px monospace'; ctx.textAlign = 'center';
  ctx.fillText('VS', x + 2, top - 12);
  ctx.fillText(`${vs >= 0 ? '+' : ''}${vs.toFixed(1)}`, x + 2, top + height + 14);
  ctx.restore();
}
