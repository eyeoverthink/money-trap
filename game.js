/* MONEY TRAP 2070 — a 2D pixel-art co-op tag-team platformer.
   Ronin VII & Jarron X, two hustlers from Sacramento, escape New Sacramento 2070
   by using money itself as the tool. Plain JS + HTML5 Canvas, zero dependencies. */
(function () {
'use strict';
const cv = document.getElementById('game');
const ctx = cv.getContext('2d');
const W = 960, H = 540, T = 32;
ctx.imageSmoothingEnabled = false;

/* ---------------- SPRITE ATLAS (tools/build_sprites.py → assets/sprites/atlas.png + sprites.js) ---------------- */
const ATLAS = window.MT_ATLAS || null;
const atlasImg = new Image(); let atlasReady = false;
if (ATLAS) { atlasImg.onload = () => { atlasReady = true; }; atlasImg.src = 'assets/sprites/atlas.png'; }
// draw a frame anchored at its feet (x = centre of feet, y = ground line); flip mirrors around the anchor
function spr(name, x, y, flip, sc, sy) {
  const f = ATLAS && atlasReady && ATLAS[name]; if (!f) return false;
  sc = sc || 1; const scy = sy || sc;
  ctx.save(); ctx.translate(Math.round(x), Math.round(y)); if (flip) ctx.scale(-1, 1);
  ctx.drawImage(atlasImg, f.x, f.y, f.w, f.h, Math.round(-f.ax * sc), Math.round(-f.ay * scy), Math.round(f.w * sc), Math.round(f.h * scy));
  ctx.restore(); return true;
}
function sprH(name) { return ATLAS && ATLAS[name] ? ATLAS[name].h : 0; }

function fit() {
  const s = Math.min(window.innerWidth / W, window.innerHeight / H);
  const k = s >= 1 ? Math.floor(s * 4) / 4 : s;
  cv.style.width = Math.round(W * k) + 'px';
  cv.style.height = Math.round(H * k) + 'px';
}
window.addEventListener('resize', fit); fit();

/* ---------------- INPUT ---------------- */
const keys = {}, pressed = {};
const BLOCK = ['Tab', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight'];
window.addEventListener('keydown', e => {
  if (BLOCK.includes(e.code)) e.preventDefault();
  if (!keys[e.code]) pressed[e.code] = true;
  keys[e.code] = true;
  unlockAudio();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });
cv.addEventListener('mousedown', () => { cv.focus(); unlockAudio(); pressed.Click = true; });
const down = (...c) => c.some(k => keys[k]);
const hit = (...c) => c.some(k => pressed[k]);
const K = {
  left: ['ArrowLeft', 'KeyA'], right: ['ArrowRight', 'KeyD'], up: ['ArrowUp', 'KeyW'], down: ['ArrowDown', 'KeyS'],
  jump: ['Space', 'ArrowUp', 'KeyW'], ability: ['KeyE', 'ShiftLeft', 'ShiftRight'], swap: ['Tab', 'KeyQ'],
  use: ['KeyF'], throw: ['KeyX', 'KeyJ'], borrow: ['KeyB'], beg: ['KeyG'], music: ['KeyM'],
  pause: ['Escape', 'KeyP'], ok: ['Enter', 'NumpadEnter'],
};

/* ---------------- AUDIO ---------------- */
const bgm = document.getElementById('bgm');
let AC = null, musicOn = true, audioUnlocked = false;
function unlockAudio() {
  if (audioUnlocked) return;
  audioUnlocked = true;
  try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; }
  if (musicOn) playMusic();
}
function playMusic() {
  if (!bgm) return;
  bgm.volume = 0.55;
  const p = bgm.play();
  if (p && p.catch) p.catch(() => {});
}
function toggleMusic() {
  musicOn = !musicOn;
  if (musicOn) playMusic(); else if (bgm) bgm.pause();
  toast(musicOn ? '♪ SOUNDTRACK ON — "MONEY TRAP"' : '♪ SOUNDTRACK MUTED', '#00f3ff');
}
function tone(f, d, type, vol, slide, delay) {
  if (!AC) return;
  try {
    const t0 = AC.currentTime + (delay || 0);
    const o = AC.createOscillator(), g = AC.createGain();
    o.type = type || 'square'; o.frequency.setValueAtTime(f, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, slide), t0 + d);
    g.gain.setValueAtTime(vol || 0.08, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
    o.connect(g); g.connect(AC.destination); o.start(t0); o.stop(t0 + d + 0.02);
  } catch (e) { /* ignore */ }
}
function noise(d, vol, hp) {
  if (!AC) return;
  try {
    const n = Math.floor(AC.sampleRate * d), b = AC.createBuffer(1, n, AC.sampleRate), a = b.getChannelData(0);
    for (let i = 0; i < n; i++) a[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = AC.createBufferSource(), g = AC.createGain(), f = AC.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = hp || 1200; s.buffer = b; g.gain.value = vol || 0.08;
    s.connect(f); f.connect(g); g.connect(AC.destination); s.start();
  } catch (e) { /* ignore */ }
}
const SFX = {
  coin() { tone(1318, 0.06, 'square', 0.05); tone(1976, 0.12, 'square', 0.05, 0, 0.05); },
  bill() { noise(0.08, 0.06, 3000); tone(880, 0.08, 'triangle', 0.05, 1320); },
  chip() { tone(660, 0.05, 'sawtooth', 0.04); tone(990, 0.05, 'sawtooth', 0.04, 0, 0.05); tone(1480, 0.08, 'sawtooth', 0.04, 0, 0.1); },
  jump() { tone(330, 0.12, 'square', 0.05, 660); },
  stack() { tone(523, 0.05, 'square', 0.06); tone(784, 0.05, 'square', 0.06, 0, 0.04); tone(1046, 0.1, 'triangle', 0.06, 0, 0.08); noise(0.05, 0.03, 4000); },
  fold() { noise(0.12, 0.08, 2500); tone(440, 0.25, 'triangle', 0.05, 990); },
  dash() { noise(0.15, 0.07, 800); tone(220, 0.15, 'sawtooth', 0.04, 110); },
  swap() { tone(587, 0.06, 'square', 0.05); tone(880, 0.06, 'square', 0.05, 0, 0.06); },
  vault() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.25, 'triangle', 0.06, 0, i * 0.08)); },
  hurt() { tone(220, 0.25, 'sawtooth', 0.07, 80); },
  debt() { tone(110, 0.4, 'sawtooth', 0.07, 55); tone(116, 0.4, 'square', 0.04, 58); },
  stomp() { tone(180, 0.1, 'square', 0.07, 60); noise(0.08, 0.06, 600); },
  err() { tone(150, 0.12, 'square', 0.05); tone(120, 0.15, 'square', 0.05, 0, 0.1); },
  cash() { [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.1, 'square', 0.04, 0, i * 0.05)); },
  lose() { [392, 330, 262, 196].forEach((f, i) => tone(f, 0.16, 'triangle', 0.06, 0, i * 0.1)); },
  throw() { noise(0.06, 0.05, 2000); tone(900, 0.08, 'square', 0.03, 1400); },
  boss() { tone(70, 0.6, 'sawtooth', 0.08, 40); },
  win() { [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => tone(f, 0.2, 'square', 0.05, 0, i * 0.11)); },
  alarm() { tone(880, 0.1, 'square', 0.04); tone(660, 0.1, 'square', 0.04, 0, 0.1); },
};

/* ---------------- PIXEL SPRITES ---------------- */
function makeSprite(rows, pal, scale) {
  const w = rows[0].length, h = rows.length, c = document.createElement('canvas');
  c.width = w * scale; c.height = h * scale;
  const g = c.getContext('2d');
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const ch = rows[y][x];
    if (ch === '.' || ch === ' ' || !pal[ch]) continue;
    g.fillStyle = pal[ch]; g.fillRect(x * scale, y * scale, scale, scale);
  }
  return c;
}
function flipped(src) {
  const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
  const g = c.getContext('2d'); g.translate(src.width, 0); g.scale(-1, 1); g.drawImage(src, 0, 0); return c;
}
function pair(rows, pal, s) { const r = makeSprite(rows, pal, s); return { r, l: flipped(r) }; }

const LEGS = {
  stand: ['....pppppppp....', '....ppPppPpp....', '....ppp..ppp....', '....ppp..ppp....', '....ppp..ppp....', '....ppp..ppp....', '....ppp..ppp....', '...SSSS..SSSS...', '...wwww..wwww...'],
  run1: ['....pppppppp....', '....ppPppPpp....', '...ppp....ppp...', '..ppp......ppp..', '..ppp......ppp..', '.ppp........pp..', '.ppp.........pp.', 'SSSS........SSSS', 'wwww........wwww'],
  run2: ['....pppppppp....', '....ppPppPpp....', '.....pppppp.....', '.....ppp.ppp....', '....ppp..ppp....', '....ppp...pp....', '...ppp....pp....', '..SSSS...SSSS...', '..wwww...wwww...'],
  air: ['....pppppppp....', '....ppPppPpp....', '...ppp...ppp....', '..ppp....ppp....', '..pp......ppp...', '..pp.......pp...', '.SSSS......pp...', '.wwww.....SSSS..', '..........wwww..'],
};
const RONIN_TOP = [
  '......kkkkk.....',
  '.....kkyyykk....',
  '..K..kkkkkkkkk..',
  '..K..sssssss....',
  '...K.sssssess...',
  '...K.sssssss....',
  '....K.SsssS.....',
  '...Khhhhhhhhh...',
  '..hhhhyyyyhhhh..',
  '..hhhHhhyhhHhh..',
  '..hhhHyhyhyHhh..',
  '..hhhHyhyhyHhs..',
  '..shhhhhhhhhhs..',
  '..s.hhhhhhhh.s..',
  '....hhhhhhhh....',
];
const RONIN_PAL = { k: '#121218', y: '#f5c542', s: '#7a4a2a', S: '#0e0e14', e: '#0a0a0a', h: '#1d1d27', H: '#33334a', p: '#24242e', P: '#363648', w: '#f5c542', K: '#d8deea' };
const JARRON_TOP = [
  '.....dDdDd......',
  '....dDdDdDdd....',
  '...dDsssssdd....',
  '...d.sGGGGGG....',
  '..dd.ssssss.....',
  '..d...sssss.....',
  '..d.jjjjjjjjj...',
  '...jjjJxjjxJjj..',
  '..jjjjJjxxjJjjj.',
  '..jjjJjjxxJjjjj.',
  '..jrrJjxjjxjjjs.',
  '..jrrjxjjjjxjjs.',
  '..s.jjjjjjjjj...',
  '....jjjjjjjjj...',
  '....jjjjjjjjj...',
];
const JARRON_PAL = { d: '#2b1a0e', D: '#5a3a1c', s: '#6e4024', G: '#00ff66', j: '#1d6b35', J: '#3fd06a', x: '#ffffff', r: '#ff3355', p: '#1b1b22', P: '#2a2a36', S: '#f2f2f2', w: '#00ff66' };
function buildHero(top, pal) {
  const o = {};
  for (const k of Object.keys(LEGS)) o[k] = pair(top.concat(LEGS[k]), pal, 2);
  return o;
}
const SPR = {
  ronin: buildHero(RONIN_TOP, RONIN_PAL),
  jarron: buildHero(JARRON_TOP, JARRON_PAL),
  devil: pair([
    '..h........h..', '..hh......hh..', '...rRRRRRRr...', '..rRRRRRRRRr..', '..RRYkRRYkRR..', '..RRRRRRRRRR..',
    '..RRkwkwkwRR..', '...RRRRRRRR...', '..rrRRRRRRrr..', '.r.RRggggRR.r.', 'r..RRRRRRRR..r', '...RRRRRRRR...',
    '...rr....rr...', '...rr....rr...', '..kkk....kkk..', '..............'], { h: '#2b0a0f', r: '#8f1528', R: '#d42a44', Y: '#ffd23f', k: '#14070a', w: '#ffffff', g: '#f5c542' }, 2),
  drone: pair([
    'cc..........cc', '.cccc....cccc.', '...ssssssss...', '..sSSSSSSSSs..', '..sSRRSSSSSs..', '...ssssssss...', '.....r..r.....'],
  { c: '#7a8aa0', s: '#3a4456', S: '#5a6880', R: '#ff2244', r: '#ff4466' }, 3),
  coin: makeSprite(['..yyyy..', '.yYYYYy.', 'yYyYYyYy', 'yYYyyYYy', 'yYYyyYYy', 'yYyYYyYy', '.yYYYYy.', '..yyyy..'], { y: '#b8860b', Y: '#ffd84a' }, 2),
  bill: makeSprite(['gggggggggggg', 'gGGGGGGGGGGg', 'gGwGGddGGwGg', 'gGGGGddGGGGg', 'gGGGGGGGGGGg', 'gggggggggggg'], { g: '#1f7a3a', G: '#5fe08a', w: '#ffffff', d: '#0d4a22' }, 2),
  credit: makeSprite(['.cccccccc.', 'cCCCCCCCCc', 'cCwwCCCCCc', 'cCCCCCCCCc', 'cCCCbbbbCc', '.cccccccc.'], { c: '#0a6a7a', C: '#00f3ff', w: '#ffffff', b: '#003a44' }, 2),
  chip: makeSprite(['.p.p.p.p.', 'pPPPPPPPp', '.PmmmmmP.', 'pPmMMMmPp', '.PmMMMmP.', 'pPmmmmmPp', '.PPPPPPP.', 'p.p.p.p.p'], { p: '#9a6bff', P: '#5a2fbf', m: '#b48cff', M: '#ffffff' }, 2),
  goods: makeSprite(['bbbbbbbbbb', 'bBBBBBBBBb', 'bBkBBBBkBb', 'bBBkBBkBBb', 'bBBBkkBBBb', 'bBBkBBkBBb', 'bBkBBBBkBb', 'bbbbbbbbbb'], { b: '#6b4423', B: '#a0703c', k: '#4a2c14' }, 2),
  stackCoin: makeSprite([
    '.yyyyyyyyyyyyyy.', 'yYYYYYYYYYYYYYYy', 'yyyyyyyyyyyyyyyy', '.oooooooooooooo.', 'yYYYYYYYYYYYYYYy', 'yyyyyyyyyyyyyyyy',
    '.oooooooooooooo.', 'yYYYYYYYYYYYYYYy', 'yyyyyyyyyyyyyyyy', '.oooooooooooooo.', 'yYYYYYYYYYYYYYYy', 'yyyyyyyyyyyyyyyy',
    '.oooooooooooooo.', 'yYYYYYYYYYYYYYYy', 'yyyyyyyyyyyyyyyy', '.oooooooooooooo.'], { y: '#c8961c', Y: '#ffe066', o: '#7a5a10' }, 2),
  plane: pair(['GG..........', 'GgGG........', '.GggGGG.....', '.GgwggggGGG.', '..GgggggggggG', '..GGGGGGGGG..', '...GgG.......', '....G........'].map(r => r.padEnd(13, '.').slice(0, 13)), { G: '#1f7a3a', g: '#7dffa8', w: '#ffffff' }, 3),
};

/* ---------------- THEMES & BACKGROUNDS ---------------- */
const THEMES = {
  oldsac: { sky: ['#140a2a', '#3a1450', '#7a2a5a'], acc: '#ff3fa4', acc2: '#ffd84a', ground: '#3a2a2a', top: '#6b4a3a', line: '#22161a', name: 'brick' },
  bridge: { sky: ['#0a0a2a', '#1a2a6a', '#c86a3a'], acc: '#ffd84a', acc2: '#00f3ff', ground: '#5a4a1a', top: '#ffd84a', line: '#2a220a', name: 'girder' },
  casino: { sky: ['#12001a', '#3a0a4a', '#ff3fa4'], acc: '#ff3fa4', acc2: '#00ff66', ground: '#2a0a3a', top: '#ff3fa4', line: '#14051e', name: 'neon' },
  tower: { sky: ['#020a14', '#0a2a3a', '#0a6a6a'], acc: '#00f3ff', acc2: '#ffd84a', ground: '#1a2a3a', top: '#00f3ff', line: '#0a141e', name: 'glass' },
  market: { sky: ['#1a0a0a', '#5a2a1a', '#e09a3a'], acc: '#ffb03a', acc2: '#00ff66', ground: '#3a2a1a', top: '#c08a3a', line: '#1e140a', name: 'wood' },
  alley: { sky: ['#05050a', '#10101e', '#2a1a3a'], acc: '#ff4466', acc2: '#00f3ff', ground: '#1e1e26', top: '#4a4a5a', line: '#0e0e14', name: 'concrete' },
  sky: { sky: ['#0a1a3a', '#2a3a8a', '#ff8a5a'], acc: '#00f3ff', acc2: '#ffd84a', ground: '#2a3a4a', top: '#8affff', line: '#141e28', name: 'steel' },
  boss: { sky: ['#0a0000', '#2a0505', '#5a0a0a'], acc: '#ff2244', acc2: '#ffd84a', ground: '#2a1a0a', top: '#ffd84a', line: '#140a05', name: 'vault' },
};
function rnd(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function grad(g, h, cols) { const gr = g.createLinearGradient(0, 0, 0, h); cols.forEach((c, i) => gr.addColorStop(i / (cols.length - 1), c)); return gr; }
function neonText(g, txt, x, y, col, size, vertical) {
  g.save(); g.font = 'bold ' + size + 'px "Courier New", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = col; g.shadowBlur = 10; g.fillStyle = col;
  if (vertical) { for (let i = 0; i < txt.length; i++) g.fillText(txt[i], x, y + i * size * 1.05); }
  else g.fillText(txt, x, y);
  g.shadowBlur = 0; g.restore();
}
function drawTowerBridge(g, x, base, s) {
  g.fillStyle = '#ffd84a'; g.strokeStyle = '#ffd84a'; g.lineWidth = 3 * s;
  for (const tx of [x, x + 220 * s]) {
    g.fillRect(tx, base - 190 * s, 14 * s, 190 * s); g.fillRect(tx + 40 * s, base - 190 * s, 14 * s, 190 * s);
    g.fillRect(tx - 4 * s, base - 196 * s, 62 * s, 10 * s);
    for (let k = 0; k < 4; k++) { const yy = base - 180 * s + k * 42 * s; g.beginPath(); g.moveTo(tx + 14 * s, yy); g.lineTo(tx + 40 * s, yy + 40 * s); g.moveTo(tx + 40 * s, yy); g.lineTo(tx + 14 * s, yy + 40 * s); g.stroke(); }
  }
  g.fillRect(x, base - 70 * s, 274 * s, 10 * s);
  g.fillRect(x + 54 * s, base - 150 * s, 166 * s, 8 * s);
  g.fillStyle = 'rgba(255,216,74,.25)'; g.fillRect(x - 40 * s, base - 4, 360 * s, 4);
}
function drawCapitol(g, x, base, col) {
  g.fillStyle = '#1a1030'; g.fillRect(x - 70, base - 60, 140, 60);
  g.fillStyle = col; for (let i = 0; i < 9; i++) g.fillRect(x - 64 + i * 16, base - 56, 4, 52);
  g.fillStyle = '#1a1030'; g.fillRect(x - 40, base - 90, 80, 30);
  g.beginPath(); g.arc(x, base - 90, 38, Math.PI, 0); g.fill();
  g.strokeStyle = col; g.lineWidth = 3; g.shadowColor = col; g.shadowBlur = 14;
  g.beginPath(); g.arc(x, base - 90, 38, Math.PI, 0); g.stroke(); g.strokeRect(x - 70, base - 60, 140, 60);
  g.fillStyle = col; g.fillRect(x - 3, base - 150, 6, 24); g.shadowBlur = 0;
}
function drawPyramid(g, x, base, w, col) {
  g.fillStyle = '#062a14'; g.beginPath(); g.moveTo(x - w / 2, base); g.lineTo(x, base - w * 0.75); g.lineTo(x + w / 2, base); g.fill();
  g.strokeStyle = col; g.lineWidth = 2; g.shadowColor = col; g.shadowBlur = 12; g.stroke(); g.shadowBlur = 0;
  g.strokeStyle = 'rgba(0,255,102,.35)'; g.lineWidth = 1;
  for (let i = 1; i < 10; i++) { const yy = base - i * w * 0.075, hw = (w / 2) * (1 - i / 10); g.beginPath(); g.moveTo(x - hw, yy); g.lineTo(x + hw, yy); g.stroke(); }
  const cy = base - w * 0.75 - 34;
  g.fillStyle = '#ffd84a'; g.shadowColor = '#ffd84a'; g.shadowBlur = 20; g.beginPath(); g.arc(x, cy, 28, 0, 7); g.fill(); g.shadowBlur = 0;
  g.fillStyle = '#b8860b'; g.beginPath(); g.arc(x, cy, 22, 0, 7); g.fill();
  g.fillStyle = '#ffe680'; g.font = 'bold 30px "Courier New",monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('$', x, cy + 1);
}
const BG = {};
function buildBG(key) {
  const th = THEMES[key], R = rnd(key.length * 977 + key.charCodeAt(0) * 31);
  const mk = () => { const c = document.createElement('canvas'); c.width = 1920; c.height = H; return c; };
  const far = mk(), mid = mk(), near = mk();
  let g = far.getContext('2d');
  g.fillStyle = grad(g, H, th.sky); g.fillRect(0, 0, 1920, H);
  for (let i = 0; i < 160; i++) { g.fillStyle = 'rgba(255,255,255,' + (0.2 + R() * 0.7) + ')'; g.fillRect(Math.floor(R() * 1920), Math.floor(R() * 260), R() < 0.1 ? 2 : 1, R() < 0.1 ? 2 : 1); }
  if (key !== 'boss') {
    g.fillStyle = '#f4ecd0'; g.beginPath(); g.arc(1500, 90, 34, 0, 7); g.fill(); g.fillStyle = th.sky[0]; g.beginPath(); g.arc(1488, 82, 30, 0, 7); g.fill();
    g.fillStyle = 'rgba(20,10,40,.85)';
    for (let x = 0; x < 1920;) { const w = 30 + R() * 70, h = 120 + R() * 220; g.fillRect(x, H - h - 60, w, h + 60); x += w + R() * 10; }
  } else {
    for (let i = 0; i < 1920; i += 120) { g.fillStyle = 'rgba(255,216,74,.06)'; g.fillRect(i, 0, 60, H); }
  }
  g = mid.getContext('2d');
  if (key === 'boss') {
    g.strokeStyle = 'rgba(255,216,74,.4)'; g.lineWidth = 4;
    for (let i = 0; i < 6; i++) { const x = 160 + i * 320; g.beginPath(); for (let y = 0; y < H; y += 18) { g.moveTo(x - 8, y); g.lineTo(x + 8, y + 9); g.moveTo(x + 8, y + 9); g.lineTo(x - 8, y + 18); } g.stroke(); }
    neonText(g, 'DEBT 100%', 960, 120, '#ff2244', 54);
    neonText(g, 'THE HOUSE ALWAYS WINS', 400, 210, '#ffd84a', 18);
    neonText(g, 'SIGN HERE', 1500, 210, '#ff4466', 18);
    for (let i = 0; i < 40; i++) { const x = R() * 1920, h = 30 + R() * 90; g.fillStyle = '#7a5a10'; g.fillRect(x, H - 60 - h, 26, h); g.fillStyle = '#ffd84a'; for (let y = H - 60 - h; y < H - 60; y += 6) g.fillRect(x, y, 26, 2); }
  } else {
    for (let x = 0; x < 1920;) {
      const w = 50 + R() * 80, h = 140 + R() * 200, top = H - 40 - h;
      g.fillStyle = '#120c22'; g.fillRect(x, top, w, h + 40);
      if (R() < 0.35) { g.beginPath(); g.moveTo(x, top); g.lineTo(x + w / 2, top - 30 - R() * 40); g.lineTo(x + w, top); g.fill(); }
      for (let wy = top + 10; wy < H - 50; wy += 12) for (let wx = x + 6; wx < x + w - 6; wx += 10) if (R() < 0.35) { g.fillStyle = R() < 0.7 ? 'rgba(255,216,120,.55)' : (R() < 0.5 ? th.acc : th.acc2); g.fillRect(wx, wy, 4, 5); }
      x += w + 8 + R() * 30;
    }
    if (key === 'bridge') { drawTowerBridge(g, 200, H - 60, 1.6); drawTowerBridge(g, 1200, H - 60, 1.1); }
    else drawTowerBridge(g, 180, H - 70, 0.9);
    drawCapitol(g, key === 'tower' ? 1500 : 820, H - 70, key === 'casino' ? '#ff3fa4' : '#00f3ff');
    drawPyramid(g, key === 'sky' ? 1100 : 1520, H - 60, key === 'sky' ? 420 : 260, '#00ff66');
    if (key === 'sky') drawPyramid(g, 1100, H - 60, 420, '#00ff66');
  }
  g = near.getContext('2d');
  const SIGNS = ['GOTHAM', '916', 'HUSTLE HARDER', 'CASH OUT ATM', 'OLD SAC', 'CREDIT IS A TRAP', 'NEVER SLEEP', 'CAPITAL OF HUSTLE'];
  if (key !== 'boss') {
    let si = Math.floor(R() * SIGNS.length);
    for (let x = 0; x < 1920;) {
      const w = 90 + R() * 120, h = 200 + R() * 160, top = H - h;
      g.fillStyle = '#08060f'; g.fillRect(x, top, w, h);
      if (th.name === 'brick' || R() < 0.4) { g.beginPath(); g.moveTo(x - 6, top); g.lineTo(x + w / 2, top - 46); g.lineTo(x + w + 6, top); g.fill(); g.fillStyle = 'rgba(255,63,164,.35)'; g.fillRect(x + w / 2 - 10, top + 20, 20, 30); }
      for (let wy = top + 60; wy < H - 30; wy += 30) for (let wx = x + 10; wx < x + w - 14; wx += 22) if (R() < 0.25) { g.fillStyle = 'rgba(0,243,255,.18)'; g.fillRect(wx, wy, 10, 14); }
      const s = SIGNS[si++ % SIGNS.length], col = [th.acc, th.acc2, '#00ff66', '#00f3ff'][Math.floor(R() * 4)];
      if (s.length <= 7 && R() < 0.6) neonText(g, s, x + w / 2, top + 40, col, 18, true);
      else { g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(x + 4, top + 26, w - 8, 26); g.strokeStyle = col; g.lineWidth = 2; g.strokeRect(x + 4, top + 26, w - 8, 26); neonText(g, s, x + w / 2, top + 40, col, Math.min(15, (w - 12) / s.length * 1.6)); }
      x += w + 60 + R() * 140;
    }
  }
  BG[key] = { far, mid, near };
}

/* -------- shared state handles (filled later) -------- */
/* ---------------- LEVEL BUILDERS ---------------- */
// Tiles: '#' solid, '-' one-way platform, 'C' stacked coins (solid), 'G' crew-held gate, 'Z' toll gate, '^' debt spikes, 't' gold tower lattice (decor)
function Level(id, name, sub, w, h, theme) {
  const grid = []; for (let y = 0; y < h; y++) grid.push(new Array(w).fill('.'));
  const L = { id, name, sub, w, h, theme, grid, ents: [], start: { x: 2, y: h - 4 }, systems: [], req: null, minWallet: 250 };
  L.fill = (x1, y1, x2, y2, ch) => { for (let y = Math.max(0, y1); y <= Math.min(h - 1, y2); y++) for (let x = Math.max(0, x1); x <= Math.min(w - 1, x2); x++) grid[y][x] = ch; };
  L.ground = (x1, x2, top) => L.fill(x1, top === undefined ? 14 : top, x2, h - 1, '#');
  L.block = (x1, x2, top, bottom) => L.fill(x1, top, x2, bottom === undefined ? h - 1 : bottom, '#');
  L.plat = (x1, x2, row) => L.fill(x1, row, x2, row, '-');
  L.ent = (o) => { L.ents.push(o); return o; };
  L.pick = (tx, row, cur) => L.ent({ type: 'pick', cur: cur || 'coin', x: tx * T + 8, y: row * T + 8, w: 16, h: 16, bob: Math.random() * 6 });
  L.row = (x1, x2, row, cur, step) => { for (let x = x1; x <= x2; x += (step || 1)) L.pick(x, row, cur); };
  L.arc = (x1, x2, row, cur, hgt) => { const n = x2 - x1; for (let i = 0; i <= n; i++) { const t = i / n; L.pick(x1 + i, Math.round(row - Math.sin(t * Math.PI) * (hgt || 2)), cur); } };
  L.signs = [];
  L.sign = (tx, floor, text) => {
    const x1 = tx * T - 6, x2 = tx * T + text.length * 6.8 + 16;
    let lv = 0; while (L.signs.some(o => o.floor === floor && o.lv === lv && o.x1 < x2 && o.x2 > x1)) lv++;
    L.signs.push({ x1, x2, lv, floor });
    return L.ent({ type: 'sign', x: tx * T, y: floor * T - 100 - lv * 26, floorY: floor * T, text });
  };
  L.devil = (x1, x2, floor) => L.ent({ type: 'devil', x: x1 * T, y: floor * T - 32, w: 26, h: 30, vx: 1.1, min: x1 * T, max: x2 * T, alive: true });
  L.drone = (x1, x2, row) => L.ent({ type: 'drone', x: x1 * T, y: row * T, w: 42, h: 21, vx: 1.3, min: x1 * T, max: x2 * T });
  L.vault = (tx, floor) => L.ent({ type: 'vault', x: tx * T - 4, y: floor * T - 56, w: 40, h: 56, saved: false });
  L.exit = (tx, floor, req) => L.ent({ type: 'exit', x: tx * T - 8, y: floor * T - 72, w: 48, h: 72, req: req || null });
  L.station = (kind, tx, floor, extra) => L.ent(Object.assign({ type: 'station', kind, x: tx * T - 4, y: floor * T - 52, w: 40, h: 52, cool: 0 }, extra || {}));
  L.npc = (kind, tx, floor, extra) => L.ent(Object.assign({ type: 'station', kind, npc: true, x: tx * T + 2, y: floor * T - 46, w: 28, h: 46, cool: 0 }, extra || {}));
  L.drop = (tx, floor) => L.ent({ type: 'drop', x: tx * T, y: floor * T - 64, w: 32, h: 64 });
  L.cab = (tx, floor, dx, dfloor) => L.station('cab', tx, floor, { dest: { x: dx * T + 5, y: dfloor * T - 46 } });
  L.lift = (tx, wt, topRow, botRow) => L.ent({ type: 'lift', x: tx * T, y: botRow * T, w: wt * T, h: 14, top: topRow * T, bot: botRow * T, dir: -1 });
  return L;
}

const LEVELS = [
  function () { // L1
    const L = Level(1, 'OLD SAC STREETS', 'Tutorial — Stacking · first honest cash', 112, 17, 'oldsac');
    L.systems = [1, 2, 4, 10, 11, 12]; L.minWallet = 300;
    L.ground(0, 59); L.ground(66, 111);
    L.sign(3, 14, 'A/D or ←/→ move · SPACE jump · TAB/Q tag-switch'); L.row(6, 11, 12, 'coin');
    L.block(14, 15, 12); L.row(14, 15, 10, 'bill');
    L.sign(18, 14, 'STOMP devils for +$20 · touching one = +DEBT'); L.devil(20, 28, 14); L.row(22, 26, 11, 'coin');
    L.vault(31, 14); L.sign(29, 14, 'VAULT DOOR = SAVE checkpoint');
    L.sign(34, 14, 'Wall too high? RONIN: E/SHIFT = STACK coins ($40)');
    L.block(37, 50, 8); L.row(39, 48, 7, 'coin', 2); L.pick(49, 7, 'credit');
    L.station('hustle', 44, 8); L.sign(41, 8, 'F = take a SIDE HUSTLE gig');
    L.sign(52, 14, 'F at ATM / NPC: BORROW, ASK · B = borrow · G = beg');
    L.npc('beg', 54, 14, { label: 'ASK' }); L.station('atm', 57, 14);
    L.sign(59, 14, 'Gap too wide? STACK a bridge or JARRON jump + E = GLIDE');
    L.arc(60, 65, 12, 'bill', 2);
    L.vault(68, 14); L.devil(72, 82, 14); L.plat(76, 80, 10); L.row(76, 80, 9, 'chip', 2);
    L.block(86, 88, 11); L.row(86, 88, 10, 'coin');
    L.drop(95, 14);
    L.block(99, 100, 9); L.sign(97, 14, 'STACK again — climb out!'); L.pick(99, 8, 'credit');
    L.exit(106, 14);
    L.start = { x: 2, y: 12 };
    return L;
  },
  function () { // L2
    const L = Level(2, 'TOWER BRIDGE JUMP', 'Bill Plane — glide the golden spans', 152, 17, 'bridge');
    L.systems = [1, 2, 11, 12]; L.minWallet = 250;
    const tower = (x) => { L.fill(x, 4, x + 1, 13, 't'); L.plat(x - 1, x + 2, 4); L.pick(x, 3, 'chip'); };
    L.ground(0, 12);
    L.sign(2, 14, 'JARRON: jump, then E mid-air = PAPER PLANE ($25)'); L.sign(8, 14, 'TAB/Q swaps hustlers — even mid-jump');
    L.arc(14, 26, 11, 'bill', 3);
    L.ground(27, 44); tower(31); L.devil(35, 43, 14); L.vault(40, 14);
    L.arc(46, 58, 11, 'bill', 3);
    L.ground(59, 72); L.block(64, 65, 12); tower(68); L.row(60, 63, 12, 'coin');
    L.arc(74, 88, 11, 'credit', 3);
    L.ground(89, 104); L.vault(91, 14); L.devil(94, 103, 14); tower(99);
    L.plat(112, 115, 11); L.arc(106, 121, 10, 'bill', 2);
    L.ground(123, 151); L.block(131, 132, 9); L.sign(127, 14, 'Combo: RONIN stacks up, JARRON glides off'); tower(138); L.devil(136, 144, 14);
    L.exit(147, 14);
    L.start = { x: 2, y: 12 };
    return L;
  },
  function () { // L3
    const L = Level(3, 'CASINO ROW', 'Gambling — double it… or lose the platform', 122, 17, 'casino');
    L.systems = [1, 2, 8, 10, 11, 12]; L.minWallet = 250;
    L.ground(0, 39); L.ground(46, 79); L.ground(89, 121);
    L.sign(2, 14, 'CASINO ROW: F at terminals to GAMBLE'); L.station('gamble', 8, 14, { label: 'DICE' });
    L.npc('beg', 14, 14, { label: 'DEALER', dealer: true }); L.station('gamble', 20, 14, { label: 'ROULETTE' });
    L.row(4, 12, 12, 'coin', 2); L.devil(24, 34, 14); L.row(25, 33, 11, 'bill', 2); L.vault(36, 14);
    L.arc(40, 45, 12, 'chip', 2);
    L.station('gamble', 50, 14, { label: 'HIGH ROLLER' }); L.station('atm', 54, 14);
    L.plat(58, 61, 11); L.plat(63, 66, 8); L.row(63, 66, 7, 'chip', 1); L.row(58, 61, 10, 'bill', 1);
    L.sign(69, 14, 'HIGH ROLLER BRIDGE — pay the toll ($350)'); L.station('toll', 72, 14);
    L.fill(75, 0, 75, 13, 'Z');
    L.arc(80, 88, 12, 'credit', 3);
    L.vault(92, 14); L.devil(96, 108, 14); L.row(97, 107, 11, 'coin', 2); L.npc('beg', 110, 14, { label: 'DEALER', dealer: true });
    L.exit(116, 14);
    L.start = { x: 2, y: 12 };
    return L;
  },
  function () { // L4 vertical
    const L = Level(4, 'INVESTMENT TOWER', 'Invest / Grow · hire crews to run the lifts', 50, 40, 'tower');
    L.systems = [1, 2, 5, 7, 11, 12]; L.minWallet = 250;
    L.fill(0, 0, 0, 39, '#'); L.fill(49, 0, 49, 39, '#'); L.fill(0, 0, 49, 0, '#');
    L.ground(1, 48, 38);
    L.sign(2, 38, 'INVESTMENT TOWER: F at kiosk to INVEST — it grows while you climb');
    L.station('invest', 6, 38); L.station('hire', 12, 38); L.station('atm', 16, 38); L.vault(20, 38);
    L.sign(9, 38, 'HIRE a crew ($60) → lifts run + gates open'); L.row(2, 22, 36, 'coin', 3);
    // floor 2 (row 28), shaft 23-27
    L.fill(1, 28, 22, 28, '#'); L.fill(28, 28, 48, 28, '#'); L.lift(23, 5, 28, 37);
    L.station('invest', 8, 28, { label: 'CASH OUT' }); L.station('hire', 31, 28); L.row(4, 20, 26, 'bill', 4);
    L.fill(36, 19, 36, 27, 'G'); L.devil(38, 47, 28); L.station('hire', 40, 28);
    // floor 3 (row 18), shaft 41-45
    L.fill(1, 18, 40, 18, '#'); L.fill(46, 18, 48, 18, '#'); L.lift(41, 5, 18, 27);
    L.vault(38, 18); L.station('hire', 33, 18); L.station('hire', 14, 18); L.fill(28, 9, 28, 17, 'G'); L.row(12, 26, 16, 'credit', 3); L.devil(12, 24, 18);
    // floor 4 penthouse (row 8), shaft 5-9
    L.fill(1, 8, 4, 8, '#'); L.fill(10, 8, 48, 8, '#'); L.lift(5, 5, 8, 17);
    L.station('invest', 20, 8, { label: 'CASH OUT' }); L.devil(24, 36, 8); L.row(12, 40, 6, 'chip', 4);
    L.exit(44, 8);
    L.start = { x: 3, y: 36 };
    return L;
  },
  function () { // L5
    const L = Level(5, 'BARTER MARKET', 'Sell / Trade — afford the vault key', 122, 17, 'market');
    L.systems = [1, 2, 4, 9, 10, 11, 12]; L.minWallet = 250; L.req = 'key';
    L.ground(0, 54); L.ground(62, 121);
    L.sign(2, 14, 'BARTER MARKET: grab GOODS crates, sell or trade them at stalls');
    L.station('hustle', 6, 14); L.pick(10, 13, 'goods'); L.row(12, 17, 12, 'coin');
    L.station('barter', 20, 14); L.vault(25, 14);
    L.plat(29, 33, 9); L.pick(31, 8, 'goods'); L.row(29, 33, 8, 'bill', 2);
    L.npc('beg', 38, 14, { label: 'ASK' }); L.devil(40, 52, 14); L.pick(45, 13, 'goods');
    L.arc(55, 61, 11, 'goods', 0); L.arc(54, 62, 11, 'coin', 2);
    L.drop(66, 14); L.plat(70, 73, 10); L.pick(71, 9, 'goods'); L.vault(76, 14); L.pick(80, 13, 'goods');
    L.devil(82, 88, 14); L.station('barter', 92, 14); L.station('atm', 96, 14); L.row(100, 108, 12, 'credit', 2);
    L.block(104, 105, 11); L.sign(110, 14, 'VAULT DOOR: needs the VAULT KEY'); L.exit(116, 14, 'key');
    L.start = { x: 2, y: 12 };
    return L;
  },
  function () { // L6
    const L = Level(6, 'CRIME ALLEY', 'Stealth Steal — watch your HEAT', 132, 17, 'alley');
    L.systems = [1, 2, 6, 10, 11, 12]; L.minWallet = 250; L.req = 'keycard';
    L.ground(0, 131);
    L.sign(2, 14, 'CRIME ALLEY: F at targets to STEAL (+$ / +HEAT)'); L.vault(5, 14);
    L.sign(8, 14, 'Drone light = HEAT · solid cover blocks the light');
    L.station('steal', 12, 14, { label: 'POCKET', loot: 120, heat: 22 });
    L.block(18, 26, 10, 10); L.drone(14, 36, 3); L.row(19, 25, 13, 'coin');
    L.station('steal', 32, 14, { label: 'ATM SKIM', loot: 140, heat: 26 }); L.block(30, 31, 12);
    L.block(40, 50, 10, 10); L.drone(38, 62, 3); L.row(41, 49, 13, 'bill', 2); L.npc('beg', 46, 14, { label: 'FENCE' });
    L.vault(55, 14); L.block(60, 61, 11);
    L.plat(64, 68, 10); L.station('steal', 66, 10, { label: 'CRYPTO SAFE', loot: 200, heat: 34 }); L.drone(64, 90, 3);
    L.block(72, 82, 10, 10); L.row(73, 81, 13, 'chip', 2);
    L.vault(96, 14); L.block(100, 112, 10, 10); L.drone(98, 122, 3); L.row(101, 111, 13, 'coin', 2);
    L.station('steal', 116, 14, { label: 'KEYCARD SAFE', loot: 80, heat: 40, keycard: true });
    L.sign(119, 14, 'BACK DOOR: needs the KEYCARD'); L.exit(126, 14, 'keycard');
    L.start = { x: 2, y: 12 };
    return L;
  },
  function () { // L7
    const L = Level(7, 'CAB / AIR TRANSIT', 'Pay to Fly — flying cabs between megastructures', 212, 17, 'sky');
    L.systems = [1, 2, 3, 10, 11, 12]; L.minWallet = 300;
    L.ground(0, 20, 12); L.ground(55, 75, 12); L.ground(90, 108, 12); L.ground(143, 162, 12); L.ground(177, 211, 12);
    L.sign(2, 12, 'SKY GAPS too wide even for a plane — hail a FLYING CAB'); L.npc('beg', 8, 12, { label: 'ASK' }); L.station('atm', 12, 12);
    L.cab(17, 12, 57, 12); L.row(4, 14, 10, 'credit', 3);
    L.vault(58, 12); L.devil(62, 72, 12); L.sign(72, 12, 'AIR LANE: glide this one!'); L.arc(76, 89, 9, 'bill', 2);
    L.vault(92, 12); L.row(94, 100, 10, 'chip', 2); L.cab(105, 12, 145, 12);
    L.devil(148, 160, 12); L.arc(163, 176, 9, 'credit', 2); L.vault(180, 12);
    L.block(190, 191, 7, 11); L.row(184, 198, 10, 'coin', 2); L.sign(198, 12, 'PYRAMID BANK — the Devil Banker waits');
    L.exit(205, 12);
    L.start = { x: 2, y: 10 };
    return L;
  },
  function () { // L8 boss
    const L = Level(8, 'THE MONEY TRAP', 'Boss — The Devil Banker · spend everything', 30, 17, 'boss');
    L.systems = [1, 2, 7, 11, 12]; L.minWallet = 400; L.boss = true;
    L.fill(0, 0, 0, 16, '#'); L.fill(29, 0, 29, 16, '#'); L.ground(1, 28);
    L.plat(4, 8, 10); L.plat(21, 25, 10); L.plat(11, 18, 7);
    L.vault(2, 14); L.station('atm', 27, 14);
    L.row(8, 21, 13, 'coin', 3);
    L.start = { x: 3, y: 12 };
    return L;
  },
];

/* ---------------- GAME STATE ---------------- */
const HERO = {
  ronin: { name: 'RONIN VII', role: 'THE PLANNER / STACKER', ab: 'STACK', spd: 3.1, jump: -10.9, col: '#f5c542' },
  jarron: { name: 'JARRON X', role: 'THE HUSTLER / BOOSTER', ab: 'GLIDE', spd: 3.7, jump: -10.6, col: '#00ff66' },
};
const SYSTEMS = ['STACK', 'GLIDE', 'CAB', 'HUSTLE', 'HIRE', 'STEAL', 'INVEST', 'GAMBLE', 'BARTER', 'BEG', 'BORROW', 'SAVE'];
const S = {
  mode: 'title', menuIdx: 0, selIdx: 0, frame: 0, hero: 'ronin', wallet: 300, debt: 10, heat: 0,
  invest: { principal: 0, value: 0 }, level: null, levelNo: 1, p: null, cam: { x: 0, y: 0 },
  parts: [], floats: [], shots: [], bshots: [], toastMsg: null, modal: null, worker: 0, gig: null,
  tollPaid: false, goods: 0, key: false, keycard: false, checkpoint: null, ride: null, boss: null,
  stats: { spent: 0, earned: 0, stacks: 0, planes: 0, borrowed: 0, levelTime: 0, total: 0 },
  interestT: 0, gateHold: false, cars: [], exitMsgT: 0, clearT: 0, trapT: 0, errors: 0,
};
function money(n) { return '$' + Math.round(n).toLocaleString('en-US'); }
function toast(msg, col) { S.toastMsg = { msg, col: col || '#ffd84a', t: 150 }; }
function floater(x, y, txt, col) { S.floats.push({ x, y, txt, col: col || '#ffd84a', t: 60 }); }
function burst(x, y, col, n, spd) { for (let i = 0; i < (n || 12); i++) { const a = Math.random() * Math.PI * 2, v = (spd || 3) * (0.3 + Math.random()); S.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1, t: 30 + Math.random() * 25, col }); } }
function price(base) { return S.hero === 'jarron' ? Math.round(base * 0.75) : base; }
function spend(n, why) {
  if (S.wallet < n) { SFX.err(); toast('BROKE! Need ' + money(n) + ' — HUSTLE, ASK (G) or BORROW (B)', '#ff4466'); return false; }
  S.wallet -= n; S.stats.spent += n; if (S.p) floater(S.p.x + 11, S.p.y - 6, '-' + money(n), '#ff8899'); return true;
}
function earn(n, x, y, col) { S.wallet += n; S.stats.earned += n; floater(x === undefined ? S.p.x + 11 : x, y === undefined ? S.p.y - 6 : y, '+' + money(n), col || '#7dffa8'); }
function addDebt(n, why) {
  if (S.mode !== 'play') return;
  S.debt = Math.max(0, Math.min(100, S.debt + n));
  if (n > 0) { SFX.debt(); floater(S.p.x + 11, S.p.y - 20, '+' + n + '% DEBT' + (why ? ' · ' + why : ''), '#ff4466'); }
  if (S.debt >= 100) trapped();
}
function snapshot() {
  const P = S.p;
  return { wallet: S.wallet, debt: S.debt, invest: { ...S.invest }, x: P.x, y: P.y, goods: S.goods, key: S.key, keycard: S.keycard, hero: S.hero };
}
function newPlayer(tx, ty) { return { x: tx * T + 5, y: ty * T - 14, w: 22, h: 46, vx: 0, vy: 0, face: 1, onGround: false, coyote: 0, jumpBuf: 0, glide: 0, dash: 0, inv: 0, onLift: null, throwCD: 0, hidden: false }; }

function loadLevel(n, carry) {
  n = Math.max(1, Math.min(8, n));
  const L = LEVELS[n - 1]();
  S.level = L; S.levelNo = n;
  if (!BG[L.theme]) buildBG(L.theme);
  buildTiles(L.theme);
  if (!carry) { S.wallet = L.minWallet; S.debt = 10; S.invest = { principal: 0, value: 0 }; }
  else S.wallet = Math.max(S.wallet, L.minWallet);
  S.heat = 0; S.worker = 0; S.gig = null; S.tollPaid = false; S.goods = 0; S.key = false; S.keycard = false;
  S.shots = []; S.bshots = []; S.parts = []; S.floats = []; S.ride = null; S.modal = null; S.interestT = 0; S.stats.levelTime = 0;
  S.p = newPlayer(L.start.x, L.start.y);
  S.cam.x = Math.max(0, S.p.x - W / 2); S.cam.y = Math.max(0, Math.min(L.h * T - H, S.p.y - H * 0.55));
  S.checkpoint = snapshot();
  S.boss = L.boss ? { x: 480, y: 190, w: 100, h: 130, hp: 36, max: 36, t: 0, flash: 0, dead: false, deadT: 0, intro: 120 } : null;
  S.cars = []; const R = rnd(n * 131);
  for (let i = 0; i < 9; i++) S.cars.push({ x: R() * 1920, y: 40 + R() * 200, vx: (R() < 0.5 ? -1 : 1) * (1 + R() * 2.5), col: ['#00f3ff', '#ff3fa4', '#ffd84a', '#00ff66'][i % 4], big: R() < 0.15 });
  S.mode = 'play';
  toast('LEVEL ' + n + ' · ' + L.name + ' — ' + L.sub, THEMES[L.theme].acc2);
  if (L.boss) { SFX.boss(); }
}

/* ---------------- TILES ---------------- */
const TILE = {};
function buildTiles(key) {
  if (TILE[key]) return;
  const th = THEMES[key];
  const mk = (fn) => { const c = document.createElement('canvas'); c.width = T; c.height = T; fn(c.getContext('2d')); return c; };
  const shade = (hex, f) => { const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255; const c = v => Math.max(0, Math.min(255, Math.round(f > 0 ? v + (255 - v) * f : v * (1 + f)))); return 'rgb(' + c(r) + ',' + c(g) + ',' + c(b) + ')'; };
  const R = rnd(key.length * 7919);
  const body = mk(g => {
    g.fillStyle = th.ground; g.fillRect(0, 0, T, T);
    for (let i = 0; i < 46; i++) { g.fillStyle = R() < 0.5 ? shade(th.ground, 0.08) : shade(th.ground, -0.18); g.fillRect(Math.floor(R() * 16) * 2, Math.floor(R() * 16) * 2, 2, 2); } // dithered grain
    const hi = shade(th.ground, 0.22), lo = shade(th.ground, -0.45);
    if (th.name === 'brick' || th.name === 'wood') {
      const rows = th.name === 'wood' ? [0, 8, 16, 24] : [0, 16];
      rows.forEach((ry, i) => { const h = th.name === 'wood' ? 8 : 16; const offs = th.name === 'wood' ? [(i * 11) % 32] : (i ? [8, 24] : [0, 16]);
        g.fillStyle = hi; g.fillRect(0, ry, T, 1); g.fillStyle = lo; g.fillRect(0, ry + h - 2, T, 2);
        offs.forEach(ox => { g.fillStyle = lo; g.fillRect(ox, ry, 2, h); g.fillStyle = hi; g.fillRect(ox + 2, ry + 1, 1, h - 3); }); });
    } else if (th.name === 'girder' || th.name === 'vault') {
      g.fillStyle = lo; g.fillRect(0, 0, T, 3); g.fillRect(0, T - 3, T, 3);
      g.strokeStyle = shade(th.top, -0.35); g.lineWidth = 3; g.beginPath(); g.moveTo(2, 3); g.lineTo(T - 2, T - 3); g.moveTo(T - 2, 3); g.lineTo(2, T - 3); g.stroke();
      g.fillStyle = hi; g.fillRect(0, 3, T, 1);
      [[3, 6], [T - 6, 6], [3, T - 8], [T - 6, T - 8]].forEach(([rx, ry]) => { g.fillStyle = shade(th.top, -0.1); g.fillRect(rx, ry, 3, 3); g.fillStyle = '#fff8'; g.fillRect(rx, ry, 1, 1); });
    } else if (th.name === 'neon' || th.name === 'glass' || th.name === 'steel') {
      g.fillStyle = hi; g.fillRect(0, 0, T, 1); g.fillRect(0, 0, 1, T); g.fillStyle = lo; g.fillRect(0, T - 2, T, 2); g.fillRect(T - 2, 0, 2, T);
      g.fillStyle = 'rgba(255,255,255,.07)'; g.beginPath(); g.moveTo(3, 3); g.lineTo(14, 3); g.lineTo(3, 14); g.fill();
      g.fillStyle = th.top + '55'; g.fillRect(6, 15, 20, 2); g.fillStyle = th.top + '22'; g.fillRect(6, 19, 20, 6);
    } else {
      g.fillStyle = lo; g.fillRect(0, T - 2, T, 2); g.fillRect(T - 2, 0, 2, T); g.fillStyle = hi; g.fillRect(0, 0, T, 1); g.fillRect(0, 0, 1, T);
      g.fillStyle = lo; g.fillRect(8, 10, 6, 1); g.fillRect(13, 11, 1, 5); g.fillRect(20, 22, 7, 1); // cracks
    }
  });
  const top = mk(g => {
    g.drawImage(body, 0, 0); g.fillStyle = shade(th.top, -0.35); g.fillRect(0, 0, T, 7); g.fillStyle = th.top; g.fillRect(0, 0, T, 5);
    g.fillStyle = shade(th.top, 0.45); g.fillRect(0, 0, T, 1); for (let x = 2; x < T; x += 8) { g.fillStyle = shade(th.top, 0.25); g.fillRect(x, 2, 3, 1); }
    g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(0, 7, T, 2);
    if (th.name === 'neon' || th.name === 'glass' || th.name === 'steel') { g.fillStyle = th.top; g.globalAlpha = 0.35; g.fillRect(0, 7, T, 4); g.globalAlpha = 1; }
  });
  TILE[key] = { body, top };
}
function tileAt(tx, ty) { const L = S.level; if (tx < 0 || tx >= L.w) return '#'; if (ty < 0 || ty >= L.h) return '.'; return L.grid[ty][tx]; }
function solidChar(c) { return c === '#' || c === 'C' || (c === 'G' && S.worker <= 0 && !S.gateHold) || (c === 'Z' && !S.tollPaid); }
function solidAt(tx, ty) { return solidChar(tileAt(tx, ty)); }
function emptyAt(tx, ty) { const L = S.level; if (tx < 0 || tx >= L.w || ty < 0 || ty >= L.h) return false; const c = L.grid[ty][tx]; return c === '.' || c === 't'; }
function overlap(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
function boxHitsTile(P, tx, ty) { return overlap(P, { x: tx * T, y: ty * T, w: T, h: T }); }

/* ---------------- ABILITIES ---------------- */
function placeStack(tx, ty) {
  S.level.grid[ty][tx] = 'C'; S.stats.stacks++; S.p.act = 'stack'; S.p.actT = 14;
  burst(tx * T + 16, ty * T + 16, '#ffd84a', 16, 2.5); SFX.stack();
}
function doStack() {
  const P = S.p;
  if (S.wallet < 40) { spend(40); return; }
  const front = P.face > 0 ? Math.floor((P.x + P.w - 1) / T) + 1 : Math.floor(P.x / T) - 1;
  const feet = Math.floor((P.y + P.h - 1) / T);
  if (P.onGround) {
    if (emptyAt(front, feet + 1) && !boxHitsTile(P, front, feet + 1)) { spend(40); placeStack(front, feet + 1); floater(front * T + 16, feet * T, 'COIN BRIDGE', '#ffd84a'); return; }
    if (emptyAt(front, feet) && !boxHitsTile(P, front, feet)) { spend(40); placeStack(front, feet); floater(front * T + 16, feet * T - 10, 'COIN STAIR', '#ffd84a'); return; }
    // pillar: lift Ronin up on a fresh stack
    const col = Math.floor((P.x + P.w / 2) / T), headRow = Math.floor((P.y - T) / T);
    const c1 = Math.floor(P.x / T), c2 = Math.floor((P.x + P.w - 1) / T);
    for (let c = c1; c <= c2; c++) if (solidAt(c, headRow)) { SFX.err(); toast('No headroom to stack here', '#ff4466'); return; }
    if (!emptyAt(col, feet)) { SFX.err(); return; }
    spend(40); P.y -= T; placeStack(col, feet); floater(col * T + 16, feet * T - 30, 'COIN PILLAR', '#ffd84a');
  } else {
    const col = Math.floor((P.x + P.w / 2) / T), row = Math.ceil((P.y + P.h) / T);
    if (row < S.level.h && emptyAt(col, row)) { spend(40); placeStack(col, row); floater(col * T + 16, row * T - 10, 'MID-AIR STACK', '#ffd84a'); }
    else SFX.err();
  }
}
function doJarron() {
  const P = S.p;
  if (!P.onGround && P.coyote <= 0) {
    if (P.glide > 0) { P.glide = 0; return; }
    if (!spend(25)) return;
    P.glide = 170; P.vy = Math.min(P.vy, -1.6); S.stats.planes++; SFX.fold(); burst(P.x + 11, P.y + 40, '#7dffa8', 14, 2);
    floater(P.x + 11, P.y - 20, 'PAPER PLANE!', '#7dffa8');
  } else {
    if (!spend(10)) return;
    P.dash = 14; SFX.dash(); burst(P.x + 11, P.y + 30, '#00ff66', 10, 2);
  }
}
function doThrow() {
  const P = S.p; if (P.throwCD > 0) return;
  const ron = S.hero === 'ronin', cost = ron ? 15 : 25;
  if (!spend(cost)) return;
  P.throwCD = 16; SFX.throw(); P.act = 'throw'; P.actT = 12;
  const up = down(...K.up);
  S.shots.push({ x: P.x + 11 + P.face * 14, y: P.y + 16, vx: P.face * (ron ? 9 : 7), vy: ron && up ? -6.5 : (up ? -3 : 0), kind: ron ? 'coin' : 'plane', dmg: ron ? 1 : 2, life: ron ? 110 : 220, face: P.face });
}

/* ---------------- STATIONS ---------------- */
const STATION_LABEL = { hustle: 'SIDE HUSTLE', atm: 'CASH OUT ATM', beg: 'ASK', gamble: 'GAMBLE', invest: 'INVEST', hire: 'HIRE CREW', barter: 'BARTER STALL', steal: 'STEAL', cab: 'FLYING CAB', toll: 'TOLL BOOTH' };
function openModal(title, body, opts) { S.modal = { title, body, opts: opts.concat([{ t: 'Walk away', f: () => {} }]) }; }
function useStation(st) {
  const P = S.p, J = S.hero === 'jarron';
  switch (st.kind) {
    case 'hustle':
      if (S.gig) { toast('Gig in progress — deliver to the green DROP beacon!', '#00ff66'); return; }
      openModal('SIDE HUSTLE · COURIER GIG', ['Deliver a package to the green DROP beacon in 40s.', 'Pay: $120' + (J ? ' + $30 charm tip (Jarron)' : '') + ' · Missed job = lost pay.'],
        [{ t: 'Take the gig', f: () => { S.gig = { t: 2400 }; SFX.cash(); toast('GIG ACCEPTED — run to the DROP beacon!', '#00ff66'); } }]);
      break;
    case 'atm':
      openModal('CASH OUT ATM · NEW SAC CREDIT UNION', ['Debt is the trap. Every loan feeds the meter.', 'Current DEBT: ' + Math.round(S.debt) + '%'],
        [{ t: 'BORROW +$200  (+18% DEBT)', f: borrow }, { t: 'REPAY $100  (−10% DEBT)', f: () => { if (S.debt <= 0) { toast('No debt to repay!'); return; } if (spend(100)) { S.debt = Math.max(0, S.debt - 10); SFX.vault(); toast('DEBT PAID DOWN −10%', '#00ff66'); } } }]);
      break;
    case 'beg': {
      if (st.cool > 0) { toast('"Come back later, hustler."', '#aaa'); return; }
      const dealer = st.dealer;
      openModal(dealer ? 'CASINO DEALER' : (st.label === 'FENCE' ? 'THE FENCE' : 'ASK A STRANGER'),
        [dealer ? 'Charm the dealer for comp chips (Jarron talks better).' : 'Swallow your pride and ask for help.', 'Costs pride: small DEBT bump.'],
        [{ t: J ? 'Charm them (Jarron)' : 'Ask politely (Ronin)', f: () => {
          st.cool = 600; const amt = (S.wallet < 60 ? 40 : 15) + (J ? 25 : 0);
          earn(amt); addDebt(J ? 1 : 2, 'PRIDE'); SFX.coin(); toast(J ? '"For you, Jarron? Here." +' + money(amt) : '"Stay up, Ronin." +' + money(amt), '#7dffa8');
        } }]);
      break;
    }
    case 'gamble': {
      const odds = J ? 0.08 : 0;
      openModal('CASINO ROW · ' + (st.label || 'GAMBLE'), ['Double it… or lose the platform.' + (J ? ' Jarron charm: +8% odds.' : ''), 'The house always wins — eventually.'],
        [{ t: 'DICE  $50 → win $100 (roll 4+)', f: () => bet(50, 100, 0.5 + odds) },
         { t: 'ROULETTE  $100 → win $220 (red)', f: () => bet(100, 220, 0.47 + odds) },
         { t: 'HIGH ROLLER  $200 → win $600 (1 in 3)', f: () => bet(200, 600, 0.33 + odds) }]);
      break;
    }
    case 'invest': {
      const iv = S.invest;
      openModal('INVESTMENT TOWER KIOSK', ['Locked capital grows while you climb' + (S.hero === 'ronin' ? ' (Ronin plans: +rate).' : '.'), 'Portfolio: ' + money(iv.value) + (iv.principal ? '  (put in ' + money(iv.principal) + ')' : '') + ' · market can dip.'],
        [{ t: 'INVEST $100', f: () => { if (spend(100)) { iv.principal += 100; iv.value += 100; SFX.chip(); toast('INVESTED $100 — watch it grow', '#00f3ff'); } } },
         { t: 'INVEST $250', f: () => { if (spend(250)) { iv.principal += 250; iv.value += 250; SFX.chip(); toast('INVESTED $250 — watch it grow', '#00f3ff'); } } },
         { t: 'CASH OUT ' + money(iv.value), f: () => { if (iv.value <= 0) { toast('Nothing invested yet'); return; } const v = Math.round(iv.value); earn(v); S.invest = { principal: 0, value: 0 }; SFX.cash(); toast('CASHED OUT ' + money(v), '#00ff66'); } }]);
      break;
    }
    case 'hire': {
      const c = price(60);
      openModal('HIRE A CREW', ['Pay a crew to hold the lift controls & gates open for 25s.', 'Workers walk off if unpaid.' + (J ? ' Jarron charm: 25% off.' : '')],
        [{ t: 'Hire crew  ' + money(c), f: () => { if (spend(c)) { S.worker = 1500; SFX.cash(); toast('CREW HIRED — lifts running, gates open (25s)', '#00f3ff'); } } }]);
      break;
    }
    case 'barter': {
      const c = price(250);
      openModal('BARTER STALL', ['Goods crates: ' + S.goods + ' · Sell $60 each, or trade 3 for the VAULT KEY.', J ? 'Jarron charm: key 25% off.' : 'Ronin pays full price.'],
        [{ t: 'SELL 1 GOODS  +$60', f: () => { if (S.goods < 1) { SFX.err(); toast('No goods — find crates!', '#ff4466'); return; } S.goods--; earn(60); SFX.cash(); } },
         { t: 'BUY VAULT KEY  ' + money(c), f: () => { if (S.key) { toast('You already have the key'); return; } if (spend(c)) { S.key = true; SFX.vault(); toast('VAULT KEY ACQUIRED!', '#ffd84a'); } } },
         { t: 'TRADE 3 GOODS → VAULT KEY', f: () => { if (S.key) { toast('You already have the key'); return; } if (S.goods < 3) { SFX.err(); toast('Need 3 goods (have ' + S.goods + ')', '#ff4466'); return; } S.goods -= 3; S.key = true; SFX.vault(); toast('BARTERED THE VAULT KEY!', '#ffd84a'); } }]);
      break;
    }
    case 'steal':
      if (st.used) { toast('Already hit this one.', '#aaa'); return; }
      openModal('CRIME RING · ' + st.label, ['Loot: ' + money(st.loot) + (st.keycard ? ' + BACK-DOOR KEYCARD' : '') + '.', 'Risk: +' + st.heat + '% HEAT. 100% HEAT = BUSTED (+15% DEBT).'],
        [{ t: 'Steal it', f: () => { st.used = true; earn(st.loot, undefined, undefined, '#ff9a3a'); if (st.keycard) { S.keycard = true; toast('KEYCARD SNATCHED — get to the back door!', '#ffd84a'); } SFX.alarm(); S.heat = Math.min(100, S.heat + st.heat); if (S.heat >= 100) busted(); } }]);
      break;
    case 'cab': {
      const c = price(90);
      openModal('FLYING CAB · AIR TRANSIT', ['Fly across the sky gap to the next megastructure.', 'Fare: ' + money(c) + (J ? ' (Jarron charm 25% off)' : '') + '.'],
        [{ t: 'Pay fare  ' + money(c), f: () => { if (spend(c)) { S.ride = { sx: st.x, sy: st.y - 30, tx: st.dest.x, ty: st.dest.y - 30, t: 0, dur: 130, dest: st.dest }; SFX.dash(); toast('CAB HAILED — hold on!', '#00f3ff'); } } }]);
      break;
    }
    case 'toll': {
      if (S.tollPaid) { toast('Toll paid — bridge open'); return; }
      const c = price(350);
      openModal('HIGH ROLLER BRIDGE · TOLL', ['The neon gate opens for high rollers only.', 'Toll: ' + money(c) + (J ? ' (Jarron charmed the booth: 25% off)' : '') + '.'],
        [{ t: 'Pay toll  ' + money(c), f: () => { if (spend(c)) { S.tollPaid = true; SFX.vault(); burst(75 * T + 16, 10 * T, '#ff3fa4', 30, 4); toast('TOLL PAID — GATE OPEN', '#ff3fa4'); } } }]);
      break;
    }
  }
}
function bet(stake, win, p) {
  if (!spend(stake)) return;
  if (Math.random() < p) { earn(win); SFX.cash(); toast('WINNER! +' + money(win), '#00ff66'); burst(S.p.x + 11, S.p.y, '#ffd84a', 24, 4); }
  else { SFX.lose(); toast('HOUSE WINS. −' + money(stake), '#ff4466'); }
}
function borrow() { earn(200, undefined, undefined, '#ffd84a'); S.stats.borrowed += 200; SFX.cash(); toast('BORROWED $200 — +18% DEBT', '#ff4466'); addDebt(18, 'LOAN'); }
function beg() {
  if (S.wallet >= 25) { SFX.err(); toast('Only beg when you are broke (< $25)', '#aaa'); return; }
  earn(20); SFX.coin(); toast('Spare change… +$20 · +4% DEBT (pride)', '#aaa'); addDebt(4, 'PRIDE');
}
function respawn(why, debt) {
  const c = S.checkpoint, P = S.p;
  P.x = c.x; P.y = c.y; P.vx = 0; P.vy = 0; P.glide = 0; P.dash = 0; P.inv = 90; P.onLift = null;
  burst(P.x + 11, P.y + 20, '#ffffff', 16, 3); SFX.hurt(); toast(why, '#ff4466');
  if (debt) addDebt(debt, 'FINE');
}
function busted() { S.heat = 0; respawn('BUSTED! Drones tagged you — fined', 15); }
function trapped() {
  S.mode = 'trapped'; S.trapT = 0; SFX.lose(); SFX.boss();
}
function escapeTrap() {
  const c = S.checkpoint;
  S.wallet = c.wallet; S.debt = Math.min(c.debt, 60); S.invest = { ...c.invest }; S.goods = c.goods; S.key = c.key; S.keycard = c.keycard; S.heat = 0;
  S.mode = 'play'; S.bshots = []; respawn('Restored from your last BANK VAULT save', 0);
}
function levelClear() {
  S.mode = 'clear'; S.clearT = 0; SFX.win();
  if (S.invest.value > 0) S.invest.value *= 1.1;
}

/* ---------------- UPDATE ---------------- */
function updatePlay() {
  const L = S.level, P = S.p, hero = HERO[S.hero];
  S.stats.levelTime++; S.stats.total++;
  if (S.toastMsg && --S.toastMsg.t <= 0) S.toastMsg = null;
  if (hit(...K.pause)) { S.mode = 'pause'; S.menuIdx = 0; return; }
  if (hit(...K.music)) toggleMusic();

  // cab ride
  if (S.ride) {
    const r = S.ride; r.t++;
    if (r.t >= r.dur) { P.x = r.dest.x; P.y = r.dest.y; P.vx = P.vy = 0; P.glide = 0; S.ride = null; burst(P.x + 11, P.y + 40, '#00f3ff', 16, 3); SFX.vault(); }
    updateWorld(); camera(); return;
  }

  // tag-team switch (works mid-jump)
  if (hit(...K.swap)) {
    S.hero = S.hero === 'ronin' ? 'jarron' : 'ronin';
    if (S.hero === 'ronin') P.glide = 0;
    SFX.swap(); burst(P.x + 11, P.y + 23, HERO[S.hero].col, 14, 2.5);
    floater(P.x + 11, P.y - 18, 'TAG → ' + HERO[S.hero].name, HERO[S.hero].col);
  }
  const dir = (down(...K.right) ? 1 : 0) - (down(...K.left) ? 1 : 0);
  if (P.glide > 0) {
    P.glide--; if (dir) P.face = dir;
    P.vx += (P.face * 5.4 - P.vx) * 0.2; P.vy = Math.min(P.vy + 0.06, 0.95);
    if (S.frame % 3 === 0) S.parts.push({ x: P.x + 11 - P.face * 20, y: P.y + 44, vx: -P.face, vy: 0.3, t: 20, col: '#7dffa8' });
  } else if (P.dash > 0) {
    P.dash--; P.vx = P.face * 9; P.vy += 0.55;
    if (S.frame % 2 === 0) S.parts.push({ x: P.x + 11, y: P.y + 20 + Math.random() * 20, vx: -P.face * 2, vy: 0, t: 16, col: '#00ff66' });
  } else {
    const acc = P.onGround ? 0.7 : 0.45;
    const tgt = dir * hero.spd;
    P.vx += Math.max(-acc, Math.min(acc, tgt - P.vx));
    if (dir) P.face = dir;
    const holding = down(...K.jump);
    P.vy += (P.vy < 0 && !holding) ? 1.15 : 0.55;
  }
  P.vy = Math.min(P.vy, 12);
  P.jumpBuf = hit(...K.jump) ? 7 : Math.max(0, P.jumpBuf - 1);
  P.coyote = P.onGround ? 7 : Math.max(0, P.coyote - 1);
  if (P.jumpBuf > 0 && P.coyote > 0) {
    P.vy = hero.jump; P.jumpBuf = 0; P.coyote = 0; P.onGround = false; P.onLift = null; P.glide = 0; SFX.jump();
  }
  if (hit(...K.ability)) { P.holdE = 0; if (S.hero === 'ronin') doStack(); else doJarron(); }
  else if (S.hero === 'ronin' && down(...K.ability)) { P.holdE = (P.holdE || 0) + 1; if (P.holdE % 18 === 0 && S.wallet >= 40) doStack(); } // hold to keep stacking
  if (hit(...K.throw)) doThrow();
  if (hit(...K.borrow)) borrow();
  if (hit(...K.beg)) beg();
  if (P.throwCD > 0) P.throwCD--;
  if (P.actT > 0) P.actT--;
  if (P.inv > 0) P.inv--;

  updateWorld();
  movePlayer();

  // station use
  S.near = null;
  for (const e of L.ents) if (e.type === 'station' && overlap(P, { x: e.x - 10, y: e.y, w: e.w + 20, h: e.h + 8 })) { S.near = e; break; }
  if (S.near && hit(...K.use, ...K.down)) { useStation(S.near); }

  // pits
  if (P.y > L.h * T + 60) respawn('FELL! Medical bill', 10);
  if (S.mode !== 'play') return;
  // interactions
  for (const e of L.ents) {
    if (e.dead) continue;
    if (e.type === 'pick' && overlap(P, e)) {
      e.dead = true;
      if (e.cur === 'goods') { S.goods++; SFX.bill(); floater(e.x + 8, e.y, '+1 GOODS', '#c08a3a'); continue; }
      const v = { coin: 10, bill: 20, credit: 35, chip: 50 }[e.cur];
      earn(v, e.x + 8, e.y, { coin: '#ffd84a', bill: '#7dffa8', credit: '#00f3ff', chip: '#c9a8ff' }[e.cur]);
      (e.cur === 'coin' ? SFX.coin : e.cur === 'bill' ? SFX.bill : SFX.chip)();
      burst(e.x + 8, e.y + 8, { coin: '#ffd84a', bill: '#7dffa8', credit: '#00f3ff', chip: '#c9a8ff' }[e.cur], 6, 1.5);
    } else if (e.type === 'vault' && overlap(P, e) && !e.saved) {
      L.ents.forEach(v => { if (v.type === 'vault') v.saved = false; });
      e.saved = true; S.checkpoint = snapshot(); S.checkpoint.x = e.x + 9; S.checkpoint.y = e.y + e.h - P.h;
      if (S.invest.value > 0) { S.invest.value *= 1.05; floater(e.x + 20, e.y - 30, 'INTEREST ON INVESTMENT +5%', '#00f3ff'); }
      SFX.vault(); toast('BANK VAULT SAVED — progress locked in', '#ffd84a'); burst(e.x + 20, e.y + 20, '#ffd84a', 24, 3);
    } else if (e.type === 'drop' && S.gig && overlap(P, e)) {
      const pay = 120 + (S.hero === 'jarron' ? 30 : 0); S.gig = null; earn(pay); SFX.cash(); toast('DELIVERED! Side hustle paid ' + money(pay), '#00ff66');
    } else if (e.type === 'exit' && overlap(P, e)) {
      if (e.req && !S[e.req]) { if (S.exitMsgT <= 0) { SFX.err(); toast(e.req === 'key' ? 'LOCKED — buy or barter the VAULT KEY at a stall' : 'LOCKED — steal the KEYCARD from the safe', '#ff4466'); S.exitMsgT = 120; } }
      else { levelClear(); return; }
    } else if (e.type === 'devil' && e.alive && overlap(P, e)) {
      if (P.vy > 0 && P.y + P.h - e.y < 16) { e.alive = false; P.vy = -8; earn(20, e.x + 13, e.y); SFX.stomp(); burst(e.x + 13, e.y + 15, '#ff4466', 18, 3); }
      else if (P.inv <= 0) { P.inv = 90; P.vy = -6; P.vx = (P.x < e.x ? -1 : 1) * 6; P.glide = 0; addDebt(10, 'DEVIL'); SFX.hurt(); }
    } else if (e.type === 'drone') {
      const ax = e.x + 21, ay = e.y + 21, px = P.x + 11, py = P.y + 23;
      e.seeing = false;
      if (py > ay && Math.abs(px - ax) < (py - ay) * 0.38 + 8) {
        let clear = true;
        for (let k = 1; k < 40; k++) { const t = k / 40, sx = ax + (px - ax) * t, sy = ay + 14 + (py - ay - 14) * t; if (solidAt(Math.floor(sx / T), Math.floor(sy / T))) { clear = false; break; } }
        if (clear) { e.seeing = true; S.seen = true; }
      }
    }
  }
  if (S.exitMsgT > 0) S.exitMsgT--;
  if (S.level.id === 6) {
    const seen = L.ents.some(e => e.type === 'drone' && e.seeing);
    if (seen) { S.heat += 0.75; if (S.frame % 20 === 0) SFX.alarm(); } else S.heat = Math.max(0, S.heat - 0.2);
    if (S.heat >= 100) busted();
  }
  // gig timer
  if (S.gig && --S.gig.t <= 0) { S.gig = null; SFX.lose(); toast('MISSED THE GIG — lost pay', '#ff4466'); }
  // interest
  if (++S.interestT >= 1200) { S.interestT = 0; if (S.debt > 0) addDebt(1 + Math.floor(S.debt / 30), 'INTEREST'); }
  // invest growth
  if (S.invest.value > 0) {
    const rate = S.hero === 'ronin' ? 0.016 : 0.012;
    S.invest.value = Math.min(S.invest.principal * 3, S.invest.value * (1 + rate / 60));
    if (S.frame % 600 === 0 && Math.random() < 0.2) { S.invest.value *= 0.85; toast('MARKET DIP — portfolio −15%', '#ff4466'); }
  }
  if (S.boss) updateBoss();
  camera();
}

function movePlayer() {
  const P = S.p, L = S.level;
  if (P.onLift) { P.y += P.onLift.dy || 0; }
  // X
  P.x += P.vx;
  const r1 = Math.floor(P.y / T), r2 = Math.floor((P.y + P.h - 1) / T);
  if (P.vx > 0) { const tx = Math.floor((P.x + P.w - 0.01) / T); for (let r = r1; r <= r2; r++) if (solidAt(tx, r)) { P.x = tx * T - P.w; P.vx = 0; P.glide = 0; break; } }
  else if (P.vx < 0) { const tx = Math.floor(P.x / T); for (let r = r1; r <= r2; r++) if (solidAt(tx, r)) { P.x = (tx + 1) * T; P.vx = 0; P.glide = 0; break; } }
  // Y
  const prevBottom = P.y + P.h; P.y += P.vy; P.onGround = false;
  const c1 = Math.floor(P.x / T), c2 = Math.floor((P.x + P.w - 0.01) / T);
  if (P.vy >= 0) {
    const ty = Math.floor((P.y + P.h) / T);
    for (let c = c1; c <= c2; c++) {
      const ch = tileAt(c, ty);
      if (solidChar(ch) || (ch === '-' && prevBottom <= ty * T + 0.5)) { P.y = ty * T - P.h; P.vy = 0; P.onGround = true; P.glide = 0; break; }
    }
    P.onLift = null;
    if (!P.onGround) for (const e of L.ents) if (e.type === 'lift' && P.x + P.w > e.x && P.x < e.x + e.w && prevBottom <= e.y + 3 && P.y + P.h >= e.y) { P.y = e.y - P.h; P.vy = 0; P.onGround = true; P.onLift = e; P.glide = 0; break; }
  } else {
    const ty = Math.floor(P.y / T);
    for (let c = c1; c <= c2; c++) if (solidAt(c, ty)) { P.y = (ty + 1) * T; P.vy = 0; break; }
    P.onLift = null;
  }
  // gate hold (never close a gate on top of a hustler)
  S.gateHold = false;
  for (let r = r1 - 1; r <= r2 + 1; r++) for (let c = c1 - 1; c <= c2 + 1; c++) if (tileAt(c, r) === 'G' && boxHitsTile(P, c, r)) S.gateHold = true;
}

function updateWorld() {
  const L = S.level;
  S.frame++;
  if (S.worker > 0) { S.worker--; if (S.worker === 0) { SFX.err(); toast('CREW WALKED OFF — unpaid. Gates closing!', '#ff4466'); } }
  for (const e of L.ents) {
    if (e.type === 'lift') {
      e.dy = 0;
      if (S.worker > 0) {
        if (e.wait > 0) e.wait--;
        else { const ny = Math.max(e.top, Math.min(e.bot, e.y + e.dir * 1.4)); e.dy = ny - e.y; e.y = ny; if (e.y <= e.top || e.y >= e.bot) { e.dir *= -1; e.wait = 50; } }
      }
    } else if (e.type === 'devil' && e.alive) {
      e.x += e.vx;
      const ahead = e.vx > 0 ? Math.floor((e.x + e.w) / T) : Math.floor(e.x / T), feet = Math.floor((e.y + e.h + 4) / T), mid = Math.floor((e.y + 10) / T);
      if (e.x < e.min || e.x > e.max || solidAt(ahead, mid) || !solidAt(ahead, feet) && tileAt(ahead, feet) !== '-') e.vx *= -1;
    } else if (e.type === 'drone') {
      e.x += e.vx; if (e.x < e.min || e.x > e.max) e.vx *= -1;
    } else if (e.type === 'pick') { e.bob += 0.08; }
    if (e.cool > 0) e.cool--;
  }
  // shots
  for (const s of S.shots) {
    if (s.kind === 'plane') {
      let best = null, bd = 420;
      if (S.boss && !S.boss.dead) { const d = Math.hypot(S.boss.x - s.x, S.boss.y - s.y); if (d < 700) { best = S.boss; bd = d; } }
      for (const e of L.ents) if (e.type === 'devil' && e.alive) { const d = Math.hypot(e.x + 13 - s.x, e.y + 15 - s.y); if (d < bd) { bd = d; best = { x: e.x + 13, y: e.y + 15 }; } }
      if (best) { const a = Math.atan2(best.y - s.y, best.x - s.x); s.vx += Math.cos(a) * 0.6; s.vy += Math.sin(a) * 0.6; const sp = Math.hypot(s.vx, s.vy), mx = S.boss ? 9 : 7.5; if (sp > mx) { s.vx *= mx / sp; s.vy *= mx / sp; } }
    } else s.vy += s.vy < 0 ? 0.12 : 0;
    s.x += s.vx; s.y += s.vy; s.life--;
    if (solidAt(Math.floor(s.x / T), Math.floor(s.y / T))) { s.life = 0; burst(s.x, s.y, s.kind === 'coin' ? '#ffd84a' : '#7dffa8', 6, 1.5); }
    for (const e of L.ents) if (e.type === 'devil' && e.alive && s.life > 0 && overlap({ x: s.x - 6, y: s.y - 6, w: 12, h: 12 }, e)) { e.alive = false; s.life = 0; earn(10, e.x + 13, e.y); SFX.stomp(); burst(e.x + 13, e.y + 15, '#ff4466', 16, 3); }
    const B = S.boss;
    if (B && !B.dead && B.intro <= 0 && s.life > 0 && overlap({ x: s.x - 6, y: s.y - 6, w: 12, h: 12 }, { x: B.x - B.w / 2, y: B.y - B.h / 2, w: B.w, h: B.h })) {
      s.life = 0; B.hp -= s.dmg; B.flash = 8; SFX.stomp(); burst(s.x, s.y, '#ffd84a', 14, 3); floater(s.x, s.y - 10, '-' + s.dmg + ' TRAP', '#ffd84a');
      if (B.hp <= 0) bossDefeated();
    }
  }
  S.shots = S.shots.filter(s => s.life > 0);
  for (const p of S.parts) { p.x += p.vx; p.y += p.vy; p.vy += 0.08; p.t--; }
  S.parts = S.parts.filter(p => p.t > 0);
  for (const f of S.floats) { f.y -= 0.7; f.t--; }
  S.floats = S.floats.filter(f => f.t > 0);
  for (const c of S.cars) { c.x += c.vx; if (c.x > 2000) c.x = -80; if (c.x < -80) c.x = 2000; }
}

function camera() {
  const P = S.p, L = S.level;
  let fx = P.x + P.w / 2, fy = P.y + P.h / 2;
  if (S.ride) { const r = S.ride, t = r.t / r.dur, e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; fx = r.sx + (r.tx - r.sx) * e; fy = r.sy + (r.ty - r.sy) * e - Math.sin(t * Math.PI) * 120; S.ride.cx = fx; S.ride.cy = fy; }
  const tx = Math.max(0, Math.min(L.w * T - W, fx - W / 2 + P.face * 70));
  const ty = Math.max(0, Math.min(L.h * T - H + 30, fy - H * 0.55));
  S.cam.x += (tx - S.cam.x) * 0.12; S.cam.y += (ty - S.cam.y) * 0.12;
}

/* ---------------- BOSS: THE DEVIL BANKER ---------------- */
function updateBoss() {
  const B = S.boss, P = S.p;
  if (B.dead) {
    B.deadT++;
    if (B.deadT % 6 === 0) burst(B.x + (Math.random() - 0.5) * 120, B.y + (Math.random() - 0.5) * 140, Math.random() < 0.5 ? '#ffd84a' : '#ff2244', 16, 4);
    if (B.deadT === 1) { S.hero = 'jarron'; }
    if (B.deadT > 60) { P.glide = 2; P.vy = -1.5; P.vx = 4; P.face = 1; }
    if (B.deadT > 240) { S.mode = 'victory'; S.clearT = 0; SFX.win(); }
    return;
  }
  if (B.intro > 0) { B.intro--; if (B.intro === 60) toast('THE DEVIL BANKER: "Sign here… your future is MINE."', '#ff2244'); return; }
  B.t++; if (B.flash > 0) B.flash--;
  const ph2 = B.hp <= B.max / 2;
  B.x = 480 + Math.sin(B.t * (ph2 ? 0.017 : 0.012)) * 330;
  B.y = 190 + Math.sin(B.t * 0.03) * 40;
  if (B.t % (ph2 ? 75 : 110) === 0) {
    const a0 = Math.atan2(P.y + 20 - B.y, P.x + 11 - B.x);
    for (let k = -1; k <= 1; k++) S.bshots.push({ x: B.x, y: B.y + 30, vx: Math.cos(a0 + k * 0.25) * (ph2 ? 3.8 : 3.1), vy: Math.sin(a0 + k * 0.25) * (ph2 ? 3.8 : 3.1), kind: 'coin', life: 300 });
    SFX.boss(); B.atkT = 30;
  }
  if (B.atkT > 0) B.atkT--;
  if (B.t % 240 === 120) for (let k = 0; k < 4; k++) S.bshots.push({ x: 50 + Math.random() * 860, y: -10 - k * 40, vx: 0, vy: 2.4, kind: 'contract', life: 400 });
  if (ph2 && B.t % 600 === 300 && S.level.ents.filter(e => e.type === 'devil' && e.alive).length < 3) {
    const x = 3 + Math.floor(Math.random() * 18); S.level.devil(x, Math.min(27, x + 6), 14); burst(x * T + 16, 13 * T, '#ff2244', 20, 3);
  }
  if (B.t % 180 === 0) addDebt(1, 'INTEREST AURA');
  if (B.t % 240 === 0 && S.level.ents.filter(e => e.type === 'pick' && !e.dead).length < 10) {
    const spots = [[6, 9], [23, 9], [14, 6], [9, 13], [20, 13], [15, 13]], s = spots[Math.floor(Math.random() * spots.length)];
    S.level.pick(s[0], s[1], ['coin', 'bill', 'credit', 'chip'][Math.floor(Math.random() * 4)]);
  }
  for (const b of S.bshots) {
    b.x += b.vx; b.y += b.vy; b.life--;
    if (b.y > 14 * T) b.life = 0;
    if (P.inv <= 0 && overlap(P, { x: b.x - 7, y: b.y - 7, w: 14, h: 14 })) { b.life = 0; P.inv = 70; P.glide = 0; addDebt(b.kind === 'contract' ? 6 : 8, b.kind === 'contract' ? 'CONTRACT' : 'HEX COIN'); SFX.hurt(); }
  }
  S.bshots = S.bshots.filter(b => b.life > 0);
  if (P.inv <= 0 && overlap(P, { x: B.x - B.w / 2 + 10, y: B.y - B.h / 2 + 10, w: B.w - 20, h: B.h - 20 })) { P.inv = 90; P.vy = -7; P.vx = (P.x < B.x ? -1 : 1) * 7; addDebt(12, 'BANKER'); }
}
function bossDefeated() {
  const B = S.boss; B.dead = true; B.deadT = 0; S.bshots = [];
  S.level.ents.forEach(e => { if (e.type === 'devil') e.alive = false; });
  SFX.win(); toast('THE TRAP SHATTERS! Spend it all — GLIDE FREE!', '#ffd84a');
  for (let i = 0; i < 6; i++) burst(B.x, B.y, '#ffd84a', 30, 6);
}

/* ---------------- DRAW ---------------- */
let tick = 0;
function txt(s, x, y, col, size, align, glow) {
  ctx.font = 'bold ' + (size || 12) + 'px "Courier New", monospace'; ctx.textAlign = align || 'left'; ctx.textBaseline = 'middle';
  if (glow) { ctx.shadowColor = glow === true ? col : glow; ctx.shadowBlur = 8; }
  ctx.fillStyle = '#000'; ctx.fillText(s, x + 1, y + 1); ctx.fillStyle = col || '#fff'; ctx.fillText(s, x, y); ctx.shadowBlur = 0;
}
function panel(x, y, w, h, border, fill) {
  ctx.fillStyle = fill || 'rgba(6,6,14,.86)'; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = border || '#00ff66'; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
}
function drawBG(key, camx, camy) {
  if (!BG[key]) buildBG(key);
  const b = BG[key];
  const layer = (c, f, oy) => { const ox = -((camx * f) % 1920 + 1920) % 1920; ctx.drawImage(c, ox, oy); ctx.drawImage(c, ox + 1920, oy); };
  const vy = Math.min(0, -camy * 0.05);
  layer(b.far, 0.08, 0);
  // flying traffic
  for (const c of S.cars) {
    const x = ((c.x - camx * 0.3) % 1920 + 1920) % 1920 - 40, y = c.y;
    if (c.big) { ctx.fillStyle = '#2a2a3e'; ctx.beginPath(); ctx.ellipse(x, y, 60, 18, 0, 0, 7); ctx.fill(); ctx.fillStyle = c.col; ctx.fillRect(x - 30, y + 14, 60, 3); txt('SAC', x, y, c.col, 14, 'center', true); }
    else { ctx.fillStyle = '#1a1a2a'; ctx.fillRect(x - 14, y - 4, 28, 8); ctx.fillStyle = c.col; ctx.fillRect(x + (c.vx > 0 ? 10 : -14), y - 2, 4, 3); ctx.fillStyle = c.col + '55'; ctx.fillRect(c.vx > 0 ? x - 44 : x + 14, y - 1, 30, 2); }
  }
  layer(b.mid, 0.25, vy * 2);
  layer(b.near, 0.5, vy * 4);
}
function drawTiles() {
  const L = S.level, th = THEMES[L.theme], tl = TILE[L.theme];
  const x1 = Math.max(0, Math.floor(S.cam.x / T)), x2 = Math.min(L.w - 1, Math.floor((S.cam.x + W) / T));
  const y1 = Math.max(0, Math.floor(S.cam.y / T)), y2 = Math.min(L.h - 1, Math.floor((S.cam.y + H) / T));
  for (let y = y1; y <= y2; y++) for (let x = x1; x <= x2; x++) {
    const c = L.grid[y][x]; if (c === '.') continue;
    const sx = Math.round(x * T - S.cam.x), sy = Math.round(y * T - S.cam.y);
    if (c === '#') ctx.drawImage(solidAt(x, y - 1) ? tl.body : tl.top, sx, sy);
    else if (c === '-') { ctx.fillStyle = th.top; ctx.fillRect(sx, sy, T, 6); ctx.fillStyle = th.line; ctx.fillRect(sx, sy + 6, T, 3); ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fillRect(sx, sy, T, 1); }
    else if (c === 'C') { ctx.shadowColor = '#ffd84a'; ctx.shadowBlur = 8; ctx.drawImage(SPR.stackCoin, sx, sy); ctx.shadowBlur = 0; if ((tick + x * 7) % 90 < 4) { ctx.fillStyle = '#fff'; ctx.fillRect(sx + 6, sy + 3, 3, 3); } }
    else if (c === 't') { ctx.strokeStyle = '#ffd84a'; ctx.lineWidth = 2; ctx.strokeRect(sx + 4, sy, T - 8, T); ctx.beginPath(); ctx.moveTo(sx + 4, sy); ctx.lineTo(sx + T - 4, sy + T); ctx.moveTo(sx + T - 4, sy); ctx.lineTo(sx + 4, sy + T); ctx.stroke(); }
    else if (c === 'G') {
      const open = S.worker > 0 || S.gateHold;
      if (!open) { ctx.fillStyle = 'rgba(255,34,68,.18)'; ctx.fillRect(sx, sy, T, T); ctx.fillStyle = (tick % 20 < 10) ? '#ff2244' : '#ff6680'; for (let k = 4; k < T; k += 9) ctx.fillRect(sx + k, sy, 3, T); }
      else { ctx.strokeStyle = 'rgba(0,243,255,.35)'; ctx.setLineDash([4, 4]); ctx.strokeRect(sx + 2, sy, T - 4, T); ctx.setLineDash([]); }
    } else if (c === 'Z') {
      if (!S.tollPaid) { ctx.fillStyle = 'rgba(255,63,164,.25)'; ctx.fillRect(sx, sy, T, T); ctx.fillStyle = '#ff3fa4'; ctx.fillRect(sx + 6, sy, 4, T); ctx.fillRect(sx + 22, sy, 4, T); if (y % 3 === 0) txt('$', sx + 16, sy + 16, '#ffd84a', 14, 'center', true); }
    } else if (c === '^') { ctx.fillStyle = '#ff2244'; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(sx + k * 8, sy + T); ctx.lineTo(sx + k * 8 + 4, sy + 12); ctx.lineTo(sx + k * 8 + 8, sy + T); ctx.fill(); } }
  }
}
function drawNPC(x, y, kind, label, t, face) {
  const map = { beg: 'beggar', hire: 'worker', dealer: 'dealer', fence: 'thief', merchant: 'merchant' };
  if (spr(map[kind], x + 14, y + 46 + (Math.floor(t / 36) % 2 && kind !== 'merchant' ? 0 : 0), face === -1)) return;
  const col = { beg: '#8a7a6a', hire: '#ff9a2a', dealer: '#ff3fa4' }[kind] || '#888';
  ctx.fillStyle = '#6a4024'; ctx.fillRect(x + 8, y + 2, 12, 12);
  ctx.fillStyle = kind === 'hire' ? '#ffb000' : '#222'; ctx.fillRect(x + 6, y - 2, 16, 6);
  ctx.fillStyle = col; ctx.fillRect(x + 4, y + 14, 20, 18);
  ctx.fillStyle = '#222'; ctx.fillRect(x + 6, y + 32, 6, 14); ctx.fillRect(x + 16, y + 32, 6, 14);
  ctx.fillStyle = '#fff'; ctx.fillRect(x + 15, y + 6, 2, 2);
  if (kind === 'beg' && Math.floor(t / 40) % 2) { ctx.fillStyle = '#c8961c'; ctx.fillRect(x + 22, y + 20, 8, 6); }
}
function drawStation(e) {
  const x = Math.round(e.x - S.cam.x), y = Math.round(e.y - S.cam.y);
  if (e.npc) { drawNPC(x, y, e.dealer ? 'dealer' : (e.label === 'FENCE' ? 'fence' : 'beg'), e.label, tick, S.p && S.p.x < e.x ? -1 : 1); txt(e.label || 'ASK', x + 14, y - 12, '#ffd84a', 11, 'center', true); return; }
  const meta = {
    hustle: ['#00ff66', 'GIG', '📦'], atm: ['#00f3ff', 'ATM', '$'], gamble: ['#ff3fa4', e.label || 'BET', '⚂'], invest: ['#00f3ff', e.label || 'INVEST', '↗'],
    hire: ['#ff9a2a', 'HIRE', '⚒'], barter: ['#ffb03a', 'BARTER', '⇄'], steal: ['#ff4466', e.label || 'STEAL', '✋'], cab: ['#00f3ff', 'CAB $90', '🚕'], toll: ['#ff3fa4', 'TOLL', '$'],
  }[e.kind] || ['#fff', '?', '?'];
  const col = meta[0];
  if (e.kind === 'steal' && e.used) { ctx.globalAlpha = 0.35; }
  const propMap = { atm: 'atm', gamble: 'slot', invest: 'kiosk' };
  if (propMap[e.kind] && sprH(propMap[e.kind])) {
    ctx.shadowColor = col; ctx.shadowBlur = 10 + Math.sin(tick * 0.08) * 4; spr(propMap[e.kind], x + e.w / 2, y + e.h); ctx.shadowBlur = 0;
    txt(meta[1], x + e.w / 2, y - 8, col, 11, 'center', true); ctx.globalAlpha = 1; return;
  }
  if (e.kind === 'barter' && sprH('stall')) {
    spr('stall', x + e.w / 2, y + e.h); spr('merchant', x + e.w / 2 + 34, y + e.h, true);
    txt('BARTER STALL', x + e.w / 2, y - 36, col, 11, 'center', true); return;
  }
  if (e.kind === 'cab' && sprH('taxi')) {
    const bob = Math.sin(tick * 0.08) * 3;
    ctx.fillStyle = 'rgba(0,243,255,' + (0.18 + Math.sin(tick * 0.2) * 0.08) + ')'; ctx.beginPath(); ctx.ellipse(x + 20, y + e.h, 40, 6, 0, 0, 7); ctx.fill();
    spr('taxi', x + 20, y + e.h - 6 + bob); txt('FLYING CAB', x + 20, y - 10, col, 11, 'center', true); return;
  }
  if (e.kind === 'hire' && sprH('worker')) {
    ctx.fillStyle = '#2a2a36'; ctx.fillRect(x + 4, y + 18, 30, 34); ctx.strokeStyle = '#ff9a2a'; ctx.lineWidth = 2; ctx.strokeRect(x + 4, y + 18, 30, 34);
    ctx.fillStyle = S.worker > 0 ? '#00ff66' : '#ff2244'; ctx.fillRect(x + 9, y + 24, 7, 7);
    ctx.fillStyle = '#888'; ctx.fillRect(x + 24, y + 22, 3, 16); ctx.fillStyle = S.worker > 0 ? '#00ff66' : '#ffb000'; ctx.fillRect(x + 21, S.worker > 0 ? y + 34 : y + 18, 9, 6);
    spr('worker', S.worker > 0 ? x + 48 : x - 16, y + e.h, S.worker > 0);
    txt('HIRE CREW', x + 20, y - 8, col, 11, 'center', true); return;
  }
  if (e.kind === 'cab') {
    const bob = Math.sin(tick * 0.08) * 3;
    ctx.fillStyle = '#ffd000'; ctx.fillRect(x - 10, y + 14 + bob, 60, 20); ctx.fillStyle = '#222'; ctx.fillRect(x, y + 6 + bob, 36, 12); ctx.fillStyle = '#00f3ff'; ctx.fillRect(x + 4, y + 8 + bob, 12, 8); ctx.fillRect(x + 20, y + 8 + bob, 12, 8);
    ctx.fillStyle = '#00f3ff88'; ctx.fillRect(x - 6, y + 36 + bob, 52, 3); txt('TAXI', x + 20, y + 24 + bob, '#111', 10, 'center');
    ctx.fillStyle = '#334'; ctx.fillRect(x + 16, y + 40, 4, 12);
    txt('FLYING CAB', x + 20, y - 8, col, 11, 'center', true);
  } else if (e.kind === 'hire') {
    ctx.fillStyle = '#2a2a36'; ctx.fillRect(x + 2, y + 18, 36, 34); ctx.fillStyle = S.worker > 0 ? '#00ff66' : '#ff2244'; ctx.fillRect(x + 8, y + 24, 8, 8);
    ctx.fillStyle = '#888'; ctx.fillRect(x + 24, y + 20, 4, 16); ctx.fillStyle = S.worker > 0 ? '#00ff66' : '#ffb000'; ctx.fillRect(x + 21, S.worker > 0 ? y + 34 : y + 16, 10, 6);
    if (S.worker > 0) drawNPC(x + 30, y + 6, 'hire', '', tick);
    else drawNPC(x - 26, y + 6, 'hire', '', tick);
    txt('HIRE CREW', x + 20, y - 8, col, 11, 'center', true);
  } else {
    ctx.fillStyle = '#12121c'; ctx.fillRect(x, y, e.w, e.h); ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.shadowColor = col; ctx.shadowBlur = 10; ctx.strokeRect(x + 1, y + 1, e.w - 2, e.h - 2); ctx.shadowBlur = 0;
    ctx.fillStyle = col + '33'; ctx.fillRect(x + 5, y + 6, e.w - 10, 18);
    txt(meta[2], x + e.w / 2, y + 15, col, 14, 'center');
    ctx.fillStyle = col; for (let k = 0; k < 3; k++) ctx.fillRect(x + 8 + k * 9, y + 32, 6, 4);
    ctx.fillRect(x + 8, y + 40, e.w - 16, 3);
    txt(meta[1], x + e.w / 2, y - 8, col, 11, 'center', true);
  }
  ctx.globalAlpha = 1;
}
function drawBossProcedural(B) {
  const x = Math.round(B.x - S.cam.x), y = Math.round(B.y - S.cam.y), f = B.flash > 0 && B.flash % 2;
  ctx.save(); ctx.translate(x, y);
  ctx.shadowColor = '#ff2244'; ctx.shadowBlur = 30;
  ctx.fillStyle = f ? '#fff' : '#7a0a1a'; ctx.fillRect(-46, -20, 92, 80); // body
  ctx.shadowBlur = 0;
  if (!f) { ctx.fillStyle = '#a01428'; for (let k = -40; k < 46; k += 10) ctx.fillRect(k, -20, 2, 80); }
  ctx.fillStyle = '#f2f2f2'; ctx.fillRect(-10, -20, 20, 30); ctx.fillStyle = '#c8102e'; ctx.fillRect(-4, -18, 8, 30);
  ctx.fillStyle = '#ffd84a'; ctx.fillRect(-46, 40, 8, 6); ctx.fillRect(38, 40, 8, 6);
  ctx.fillStyle = f ? '#fff' : '#8a3a2a'; ctx.fillRect(-20, -54, 40, 36); // head
  ctx.fillStyle = '#ffdd00'; ctx.fillRect(-14, -42, 9, 5); ctx.fillRect(5, -42, 9, 5);
  ctx.fillStyle = '#ff2244'; ctx.fillRect(-12, -41, 5, 3); ctx.fillRect(7, -41, 5, 3);
  ctx.fillStyle = '#1a0505'; ctx.fillRect(-10, -28, 20, 4); ctx.fillStyle = '#fff'; for (let k = -9; k < 10; k += 4) ctx.fillRect(k, -28, 2, 3);
  ctx.fillStyle = '#c8102e'; ctx.beginPath(); ctx.moveTo(-20, -54); ctx.lineTo(-28, -76); ctx.lineTo(-12, -58); ctx.fill(); ctx.beginPath(); ctx.moveTo(20, -54); ctx.lineTo(28, -76); ctx.lineTo(12, -58); ctx.fill();
  ctx.fillStyle = '#0a0a0a'; ctx.fillRect(-24, -60, 48, 8); ctx.fillRect(-16, -86, 32, 28); ctx.fillStyle = '#c8102e'; ctx.fillRect(-16, -66, 32, 5);
  // cane + contract
  ctx.fillStyle = '#333'; ctx.fillRect(52, -30, 4, 96); ctx.fillStyle = '#ffd84a'; ctx.beginPath(); ctx.arc(54, -36, 10, 0, 7); ctx.fill(); txt('$', 54, -35, '#7a5a10', 12, 'center');
  ctx.fillStyle = '#f0e0b0'; ctx.fillRect(-74, -10, 26, 34); ctx.fillStyle = '#7a5a3a'; for (let k = 0; k < 5; k++) ctx.fillRect(-70, -4 + k * 6, 18, 2); ctx.fillStyle = '#c8102e'; ctx.fillRect(-58, 18, 6, 4);
  ctx.fillStyle = '#1a0a0a'; ctx.fillRect(-40, 60, 30, 10); ctx.fillRect(10, 60, 30, 10);
  ctx.restore();
}
function drawBossSprite(B) {
  if (!sprH('boss_idle')) return drawBossProcedural(B);
  const x = B.x - S.cam.x, y = B.y - S.cam.y, ph2 = B.hp <= B.max / 2;
  const fr = B.dead ? 'boss_rage' : (B.atkT > 0 ? 'boss_attack' : (ph2 ? 'boss_rage' : 'boss_idle'));
  const flip = (fr === 'boss_attack') ? (S.p.x < B.x) : false;
  const feet = y + 88 + Math.sin(tick * 0.06) * 4;
  // swirling coin & contract aura
  for (let i = 0; i < 10; i++) {
    const a = tick * (ph2 ? 0.05 : 0.03) + i * Math.PI / 5, rx = 78, ry = 34, cx = x + Math.cos(a) * rx, cy = y + 10 + Math.sin(a) * ry;
    if (Math.sin(a) < 0) continue; // back half drawn later? keep it simple: front half only
    if (i % 3 === 0) { ctx.fillStyle = '#f0e0b0'; ctx.fillRect(cx - 5, cy - 7, 10, 13); ctx.fillStyle = '#c8102e'; ctx.fillRect(cx - 3, cy + 2, 6, 2); }
    else spr('coin', cx, cy + 6, false, 0.6 * Math.max(0.2, Math.abs(Math.cos(a * 2))), 0.6);
  }
  ctx.save();
  ctx.shadowColor = ph2 ? '#ff2244' : '#ff4466'; ctx.shadowBlur = 24 + Math.sin(tick * 0.15) * 8;
  spr(fr, x, feet, flip);
  ctx.restore();
  if (B.flash > 0) { ctx.globalAlpha = 0.85; spr(fr + '_flash', x, feet, flip); ctx.globalAlpha = 1; }
  for (let i = 0; i < 10; i++) {
    const a = tick * (ph2 ? 0.05 : 0.03) + i * Math.PI / 5, cx = x + Math.cos(a) * 78, cy = y + 10 + Math.sin(a) * 34;
    if (Math.sin(a) >= 0) continue;
    if (i % 3 === 0) { ctx.fillStyle = '#f0e0b0'; ctx.fillRect(cx - 5, cy - 7, 10, 13); ctx.fillStyle = '#c8102e'; ctx.fillRect(cx - 3, cy + 2, 6, 2); }
    else spr('coin', cx, cy + 6, false, 0.6 * Math.max(0.2, Math.abs(Math.cos(a * 2))), 0.6);
  }
}
function heroFrame(P) {
  const k = S.hero;
  if (P.actT > 0 && P.act === 'stack' && k === 'ronin') return 'ronin_stack';
  if (P.actT > 0 && P.act === 'throw') return k + '_throw';
  if (k === 'jarron' && P.glide > 0) return 'jarron_glide';
  if (k === 'jarron' && P.dash > 0) return 'jarron_dash';
  if (!P.onGround) return k + (P.vy < 0 ? '_jump' : '_fall');
  if (Math.abs(P.vx) > 0.6) { P.runT = (P.runT || 0) + Math.abs(P.vx) * 0.06; return k + '_run' + (1 + Math.floor(P.runT) % 4); }
  P.runT = 0;
  return k === 'ronin' ? (Math.floor(tick / 40) % 2 ? 'ronin_idle2' : 'ronin_idle') : 'jarron_idle';
}
function drawHero(P, x, y) {
  if (P.inv > 0 && Math.floor(P.inv / 4) % 2) ctx.globalAlpha = 0.45;
  const fr = heroFrame(P), fx = x + P.w / 2, fy = y + P.h + (fr === 'jarron_glide' ? 10 : 0);
  const breathe = (fr === 'jarron_idle' && Math.floor(tick / 30) % 2) ? 1 : 0;
  // soft rim glow so dark outfits read on night backgrounds
  ctx.shadowColor = S.hero === 'ronin' ? 'rgba(255,216,74,.55)' : 'rgba(0,255,102,.55)'; ctx.shadowBlur = 6;
  const ok = spr(fr, fx, fy + breathe, P.face < 0, 1, 1 - breathe / 62);
  ctx.shadowBlur = 0;
  if (!ok) { // procedural fallback
    const set = SPR[S.hero]; let f = 'stand';
    if (!P.onGround) f = 'air'; else if (Math.abs(P.vx) > 0.6) f = (Math.floor(tick / 6) % 2) ? 'run1' : 'run2';
    if (P.glide > 0) { const pl = SPR.plane[P.face > 0 ? 'r' : 'l']; ctx.drawImage(pl, x + 11 - pl.width / 2, y + 34); }
    ctx.drawImage(set[f][P.face > 0 ? 'r' : 'l'], Math.round(x - 5), Math.round(y));
  }
  if (P.dash > 0) { ctx.globalAlpha = 0.25; spr(fr, fx - P.face * 14, fy, P.face < 0); spr(fr, fx - P.face * 28, fy, P.face < 0); }
  ctx.globalAlpha = 1;
}
function drawPlay() {
  const L = S.level, cx = S.cam.x, cy = S.cam.y, P = S.p;
  drawBG(L.theme, cx, cy);
  drawTiles();
  for (const e of L.ents) {
    if (e.dead) continue;
    const x = Math.round(e.x - cx), y = Math.round(e.y - cy);
    if (x < -120 || x > W + 120 || y < -200 || y > H + 200) continue;
    switch (e.type) {
      case 'pick': {
        const nm = e.cur === 'goods' ? 'crate' : e.cur, by = y + 16 + Math.sin(e.bob) * 3;
        const sx = e.cur === 'coin' ? Math.max(0.15, Math.abs(Math.cos(e.bob * 0.7))) : 1;
        ctx.shadowColor = { coin: '#ffd84a', bill: '#5fe08a', credit: '#00f3ff', chip: '#b48cff', goods: '#c08a3a' }[e.cur]; ctx.shadowBlur = 8;
        if (!spr(nm, x + 8, by, false, sx, 1)) { const img = SPR[e.cur]; ctx.drawImage(img, x + 8 - img.width / 2, y + 8 - img.height / 2 + Math.sin(e.bob) * 3); }
        ctx.shadowBlur = 0; break; }
      case 'sign': { ctx.font = 'bold 11px "Courier New",monospace'; const w = ctx.measureText(e.text).width + 14; ctx.fillStyle = 'rgba(0,0,0,.72)'; ctx.fillRect(x - 4, y - 10, w, 20); ctx.strokeStyle = '#00f3ff88'; ctx.lineWidth = 1; ctx.strokeRect(x - 4, y - 10, w, 20); txt(e.text, x + 3, y, '#bff', 11); ctx.fillStyle = '#334'; ctx.fillRect(x + 8, y + 10, 3, e.floorY - e.y - 10); break; }
      case 'vault': {
        if (sprH('vault')) { ctx.shadowColor = e.saved ? '#00ff66' : '#ffd84a'; ctx.shadowBlur = 12 + Math.sin(tick * 0.1) * 6; spr('vault', x + e.w / 2, y + e.h); ctx.shadowBlur = 0; txt(e.saved ? 'SAVED' : 'VAULT', x + 20, y - 8, e.saved ? '#00ff66' : '#ffd84a', 11, 'center', true); break; }
        ctx.fillStyle = '#2a2a1a'; ctx.fillRect(x, y, e.w, e.h); ctx.strokeStyle = e.saved ? '#00ff66' : '#ffd84a'; ctx.lineWidth = 3; ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 14 + Math.sin(tick * 0.1) * 6; ctx.strokeRect(x + 2, y + 2, e.w - 4, e.h - 4); ctx.shadowBlur = 0;
        ctx.beginPath(); ctx.arc(x + 20, y + 26, 11, 0, 7); ctx.stroke(); for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + tick * 0.02; ctx.beginPath(); ctx.moveTo(x + 20, y + 26); ctx.lineTo(x + 20 + Math.cos(a) * 11, y + 26 + Math.sin(a) * 11); ctx.stroke(); }
        txt(e.saved ? 'SAVED' : 'VAULT', x + 20, y - 8, e.saved ? '#00ff66' : '#ffd84a', 11, 'center', true); break;
      }
      case 'exit': {
        const locked = e.req && !S[e.req];
        ctx.fillStyle = '#05050a'; ctx.fillRect(x, y, e.w, e.h); ctx.strokeStyle = locked ? '#ff2244' : '#00ff66'; ctx.lineWidth = 3; ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 16; ctx.strokeRect(x + 2, y + 2, e.w - 4, e.h - 4); ctx.shadowBlur = 0;
        ctx.fillStyle = locked ? 'rgba(255,34,68,.25)' : 'rgba(0,255,102,' + (0.2 + Math.sin(tick * 0.1) * 0.1) + ')'; ctx.fillRect(x + 6, y + 6, e.w - 12, e.h - 12);
        txt(locked ? 'LOCKED' : 'EXIT ▶', x + e.w / 2, y - 10, locked ? '#ff4466' : '#00ff66', 12, 'center', true); break;
      }
      case 'station': drawStation(e); break;
      case 'drop': if (S.gig) { ctx.fillStyle = 'rgba(0,255,102,' + (0.25 + Math.sin(tick * 0.15) * 0.15) + ')'; ctx.fillRect(x, y - 300, 32, 364); txt('DROP', x + 16, y - 10, '#00ff66', 12, 'center', true); } else { ctx.fillStyle = '#0a3a1a'; ctx.fillRect(x + 4, y + 50, 24, 14); txt('DROP', x + 16, y + 40, '#2a7a4a', 10, 'center'); } break;
      case 'devil': if (e.alive && !spr('devil', x + e.w / 2, y + e.h + 1 - (Math.floor(tick / 8) % 2), e.vx < 0)) ctx.drawImage(SPR.devil[e.vx > 0 ? 'r' : 'l'], x, y + 2 + (Math.floor(tick / 8) % 2)); break;
      case 'drone': {
        const ax = x + 21, ay = y + 21, d = (S.level.h - 2) * T - e.y;
        ctx.fillStyle = e.seeing ? 'rgba(255,34,68,.28)' : 'rgba(255,255,180,.12)'; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax - d * 0.38, ay + d); ctx.lineTo(ax + d * 0.38, ay + d); ctx.fill();
        const gr = ctx.createRadialGradient(ax, ay, 2, ax, ay, 18); gr.addColorStop(0, e.seeing ? 'rgba(255,40,70,.9)' : 'rgba(255,240,180,.7)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = gr; ctx.fillRect(ax - 18, ay - 18, 36, 36);
        if (!spr('drone', ax, y + 26 + Math.sin(tick * 0.12 + e.min) * 2, e.vx < 0)) ctx.drawImage(SPR.drone[e.vx > 0 ? 'r' : 'l'], x, y); break;
      }
      case 'lift': {
        ctx.fillStyle = '#0a2a3a'; ctx.fillRect(x, y, e.w, e.h); ctx.fillStyle = S.worker > 0 ? '#00f3ff' : '#446'; ctx.fillRect(x, y, e.w, 4);
        ctx.strokeStyle = '#00f3ff55'; ctx.beginPath(); ctx.moveTo(x + 6, y); ctx.lineTo(x + 6, Math.round(e.top - cy) - 200); ctx.moveTo(x + e.w - 6, y); ctx.lineTo(x + e.w - 6, Math.round(e.top - cy) - 200); ctx.stroke();
        txt(S.worker > 0 ? 'LIFT ▲▼' : 'LIFT · HIRE CREW', x + e.w / 2, y + 22, S.worker > 0 ? '#00f3ff' : '#889', 9, 'center'); break;
      }
    }
  }
  if (S.boss && (!S.boss.dead || S.boss.deadT < 50)) drawBossSprite(S.boss);
  if (S.boss) {
    for (const b of S.bshots) { const x = b.x - cx, y = b.y - cy; if (b.kind === 'coin') { ctx.fillStyle = '#ff2244'; ctx.shadowColor = '#ff2244'; ctx.shadowBlur = 10; ctx.beginPath(); ctx.arc(x, y, 7, 0, 7); ctx.fill(); ctx.shadowBlur = 0; txt('$', x, y, '#300', 10, 'center'); } else { ctx.fillStyle = '#f0e0b0'; ctx.fillRect(x - 8, y - 10, 16, 20); ctx.fillStyle = '#c8102e'; ctx.fillRect(x - 5, y + 4, 10, 3); ctx.fillStyle = '#7a5a3a'; ctx.fillRect(x - 5, y - 6, 10, 2); ctx.fillRect(x - 5, y - 2, 10, 2); } }
  }
  for (const s of S.shots) { const x = s.x - cx, y = s.y - cy; if (s.kind === 'coin') { if (!spr('coin', x, y + 7, false, Math.max(0.2, Math.abs(Math.cos(tick * 0.5))) * 0.7, 0.7)) ctx.drawImage(SPR.coin, x - 8, y - 8); } else { const pl = SPR.plane[s.vx > 0 ? 'r' : 'l']; ctx.drawImage(pl, x - pl.width / 2, y - pl.height / 2); } }
  if (S.ride) {
    const r = S.ride, x = r.cx - cx, y = r.cy - cy;
    if (!spr('taxi', x, y + 22, r.tx < r.sx)) { ctx.fillStyle = '#ffd000'; ctx.fillRect(x - 34, y - 6, 68, 22); }
    for (let k = 0; k < 3; k++) S.parts.push({ x: r.cx - 30 + Math.random() * 60, y: r.cy + 18, vx: 0, vy: 1.5, t: 14, col: '#00f3ff' });
  } else if (!(S.boss && S.boss.dead && S.boss.deadT > 230)) drawHero(P, P.x - cx, P.y - cy);
  for (const p of S.parts) { ctx.fillStyle = p.col; ctx.globalAlpha = Math.min(1, p.t / 20); ctx.fillRect(Math.round(p.x - cx), Math.round(p.y - cy), 3, 3); }
  ctx.globalAlpha = 1;
  for (const f of S.floats) { ctx.globalAlpha = Math.min(1, f.t / 25); txt(f.txt, f.x - cx, f.y - cy, f.col, 12, 'center', true); }
  ctx.globalAlpha = 1;
  if (S.near && !S.modal) { const e = S.near; txt('[F] ' + (STATION_LABEL[e.kind] || 'USE') + (e.label && e.kind !== 'beg' ? ' · ' + e.label : ''), e.x + e.w / 2 - cx, e.y - 28 - cy, '#fff', 12, 'center', '#00ff66'); }
  if (S.level.id === 6 && S.heat > 60) { ctx.fillStyle = 'rgba(255,0,40,' + (0.08 + Math.sin(tick * 0.3) * 0.05) + ')'; ctx.fillRect(0, 0, W, H); }
  if (S.debt >= 80) { ctx.strokeStyle = 'rgba(255,34,68,' + (0.4 + Math.sin(tick * 0.2) * 0.3) + ')'; ctx.lineWidth = 10; ctx.strokeRect(5, 5, W - 10, H - 10); }
  drawHUD();
}
function drawHUD() {
  const P = S.p;
  ctx.fillStyle = 'rgba(4,4,10,.84)'; ctx.fillRect(0, 0, W, 58); ctx.fillStyle = '#00ff6655'; ctx.fillRect(0, 58, W, 2);
  ['ronin', 'jarron'].forEach((k, i) => {
    const x = 6 + i * 104, act = S.hero === k, h = HERO[k];
    ctx.fillStyle = act ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.3)'; ctx.fillRect(x, 4, 100, 50);
    ctx.strokeStyle = act ? h.col : '#333'; ctx.lineWidth = 2; ctx.strokeRect(x + 1, 5, 98, 48);
    ctx.globalAlpha = act ? 1 : 0.45;
    const fA = ATLAS && atlasReady && ATLAS[k + '_idle'];
    if (fA) { ctx.save(); ctx.beginPath(); ctx.rect(x + 3, 7, 34, 44); ctx.clip(); ctx.drawImage(atlasImg, fA.x, fA.y, fA.w, 22, x + 20 - fA.w * 0.8, 8, fA.w * 1.6, 44); ctx.restore(); }
    else ctx.drawImage(SPR[k].stand.r, 0, 0, 32, 30, x + 4, 10, 32, 30);
    ctx.globalAlpha = 1;
    txt(h.name, x + 40, 16, act ? h.col : '#777', 11); txt((k === 'ronin' ? 'E: STACK' : 'E: GLIDE'), x + 40, 31, act ? '#fff' : '#555', 10); txt(act ? '◆ ACTIVE' : 'TAB swap', x + 40, 45, act ? h.col : '#555', 9);
  });
  txt('WALLET', 222, 14, '#998', 10); txt(money(S.wallet), 222, 36, '#ffd84a', 22, 'left', '#b8860b');
  // debt
  const dx = 360, dw = 210, d = S.debt;
  txt('DEBT METER', dx, 14, '#998', 10); txt(Math.round(d) + '%', dx + dw, 14, d >= 75 ? '#ff4466' : '#fff', 11, 'right');
  ctx.fillStyle = '#1a1a22'; ctx.fillRect(dx, 24, dw, 16);
  const dc = d < 40 ? '#00ff66' : d < 75 ? '#ffd84a' : '#ff2244'; ctx.fillStyle = dc; ctx.fillRect(dx, 24, dw * d / 100, 16);
  ctx.strokeStyle = '#555'; ctx.strokeRect(dx, 24, dw, 16); for (let k = 1; k < 4; k++) { ctx.fillStyle = '#0008'; ctx.fillRect(dx + dw * k / 4, 24, 1, 16); }
  txt(d >= 100 ? 'TRAPPED' : d >= 75 ? 'THE TRAP IS CLOSING' : d >= 40 ? 'Careful…' : 'Under control', dx, 49, dc, 9);
  // heat / invest / items
  let x = 588;
  if (S.level.id === 6 || S.heat > 0) { txt('HEAT', x, 14, '#998', 10); ctx.fillStyle = '#1a1a22'; ctx.fillRect(x, 24, 90, 12); ctx.fillStyle = S.heat > 70 ? '#ff2244' : '#ff9a3a'; ctx.fillRect(x, 24, 90 * S.heat / 100, 12); ctx.strokeStyle = '#555'; ctx.strokeRect(x, 24, 90, 12); txt(Math.round(S.heat) + '%', x + 45, 45, '#ff9a3a', 9, 'center'); x += 100; }
  if (S.invest.value > 0) { const g = S.invest.value / S.invest.principal - 1; txt('INVEST', x, 14, '#998', 10); txt(money(S.invest.value), x, 32, '#00f3ff', 13); txt((g >= 0 ? '+' : '') + Math.round(g * 100) + '%', x, 46, g >= 0 ? '#00ff66' : '#ff4466', 10); x += 86; }
  const items = [];
  if (S.goods) items.push(['GOODS ×' + S.goods, '#c08a3a']); if (S.key) items.push(['VAULT KEY', '#ffd84a']); if (S.keycard) items.push(['KEYCARD', '#ffd84a']);
  if (S.gig) items.push(['GIG ' + Math.ceil(S.gig.t / 60) + 's', '#00ff66']); if (S.worker > 0) items.push(['CREW ' + Math.ceil(S.worker / 60) + 's', '#ff9a2a']);
  items.forEach((it, i) => txt(it[0], x + Math.floor(i / 3) * 92, 14 + (i % 3) * 15, it[1], 10));
  txt('L' + S.level.id + ' · ' + S.level.name, W - 8, 16, THEMES[S.level.theme].acc2, 12, 'right', true);
  txt('NEW SACRAMENTO 2070', W - 8, 32, '#667', 9, 'right'); txt('ESC pause · M music ' + (musicOn ? 'ON' : 'OFF'), W - 8, 46, '#556', 9, 'right');
  // boss bar
  if (S.boss && !S.boss.dead) { const B = S.boss; panel(230, 66, 500, 26, '#ff2244'); txt('THE DEVIL BANKER', 240, 79, '#ff4466', 11); ctx.fillStyle = '#300'; ctx.fillRect(380, 72, 340, 14); ctx.fillStyle = '#ff2244'; ctx.fillRect(380, 72, 340 * B.hp / B.max, 14); txt('TRAP ' + Math.max(0, B.hp) + '/' + B.max, 550, 79, '#fff', 10, 'center'); }
  // quick-action bar — 12 money systems
  ctx.fillStyle = 'rgba(4,4,10,.86)'; ctx.fillRect(0, H - 32, W, 32); ctx.fillStyle = '#00ff6644'; ctx.fillRect(0, H - 33, W, 1);
  const cw = W / 12;
  SYSTEMS.forEach((s, i) => {
    const on = S.level.systems.includes(i + 1), active = (i === 0 && S.hero === 'ronin') || (i === 1 && S.hero === 'jarron');
    const nearK = S.near && ({ cab: 2, hustle: 3, hire: 4, steal: 5, invest: 6, gamble: 7, barter: 8, beg: 9, atm: 10 })[S.near.kind] === i;
    const bx = i * cw + 2;
    ctx.fillStyle = nearK ? 'rgba(0,255,102,.25)' : active ? 'rgba(255,216,74,.18)' : 'rgba(255,255,255,.03)'; ctx.fillRect(bx, H - 29, cw - 4, 26);
    ctx.strokeStyle = on ? (active || nearK ? '#ffd84a' : '#00ff6688') : '#222'; ctx.strokeRect(bx + 0.5, H - 28.5, cw - 5, 25);
    txt((i + 1) + ' ' + s, bx + (cw - 4) / 2, H - 20, on ? '#dfe' : '#444', 10, 'center');
    const hint = ['E', 'E', 'F', 'F', 'F', 'F', 'F', 'F', 'F', 'G', 'B', 'VAULT'][i];
    txt(hint, bx + (cw - 4) / 2, H - 9, on ? '#7a9' : '#333', 8, 'center');
  });
  if (S.toastMsg) {
    const tm = S.toastMsg; ctx.globalAlpha = Math.min(1, tm.t / 30);
    ctx.font = 'bold 14px "Courier New",monospace'; const w = ctx.measureText(tm.msg).width + 30;
    panel(W / 2 - w / 2, 100, w, 30, tm.col); txt(tm.msg, W / 2, 115, tm.col, 14, 'center', true); ctx.globalAlpha = 1;
  }
  if (S.modal) drawModal();
}
function drawModal() {
  const m = S.modal, h = 84 + m.body.length * 18 + m.opts.length * 26;
  ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(0, 0, W, H);
  panel(W / 2 - 290, H / 2 - h / 2, 580, h, '#ffd84a', 'rgba(8,8,18,.96)');
  let y = H / 2 - h / 2 + 24;
  txt(m.title, W / 2, y, '#ffd84a', 16, 'center', true); y += 28;
  m.body.forEach(l => { txt(l, W / 2, y, '#cde', 12, 'center'); y += 18; }); y += 8;
  m.opts.forEach((o, i) => { const sel = S.menuIdx === i; ctx.fillStyle = sel ? 'rgba(0,255,102,.18)' : 'rgba(255,255,255,.03)'; ctx.fillRect(W / 2 - 250, y - 11, 500, 22); txt('[' + (i + 1) + '] ' + o.t, W / 2 - 236, y, sel ? '#00ff66' : '#fff', 13); y += 26; });
  txt('1-' + m.opts.length + ' or ↑↓ + ENTER · ESC close · ' + (S.hero === 'jarron' ? 'JARRON charm active' : 'RONIN plan active'), W / 2, y + 4, '#678', 10, 'center');
}
function updateModal() {
  const m = S.modal;
  const n = m.opts.length;
  if (hit(...K.down)) S.menuIdx = (S.menuIdx + 1) % n;
  if (hit(...K.up)) S.menuIdx = (S.menuIdx + n - 1) % n;
  let choice = -1;
  for (let i = 0; i < n && i < 9; i++) if (hit('Digit' + (i + 1), 'Numpad' + (i + 1))) choice = i;
  if (hit(...K.ok, 'Space')) choice = S.menuIdx;
  if (hit('Escape', 'KeyF')) { S.modal = null; return; }
  if (choice >= 0) { const o = m.opts[choice]; S.modal = null; o.f(); }
}

/* ---------------- SCREENS ---------------- */
function logo(x, y, s) {
  ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold ' + 64 * s + 'px "Courier New", monospace';
  const g = ctx.createLinearGradient(0, y - 40 * s, 0, y + 40 * s); g.addColorStop(0, '#fff6c0'); g.addColorStop(0.5, '#ffd84a'); g.addColorStop(1, '#b8860b');
  ctx.lineWidth = 8 * s; ctx.strokeStyle = '#0a3a1a'; ctx.strokeText('MONEY TRAP', x, y);
  ctx.shadowColor = '#00ff66'; ctx.shadowBlur = 24; ctx.fillStyle = g; ctx.fillText('MONEY TRAP', x, y); ctx.shadowBlur = 0;
  ctx.font = 'bold ' + 20 * s + 'px "Courier New", monospace'; ctx.fillStyle = '#00ff66'; ctx.fillText('· 2 0 7 0 ·', x, y + 46 * s);
  ctx.restore();
}
const TITLE_OPTS = ['START THE HUSTLE', 'LEVEL SELECT', 'MUSIC'];
function drawTitle() {
  drawBG('oldsac', tick * 1.2, 0);
  ctx.fillStyle = 'rgba(4,2,10,.55)'; ctx.fillRect(0, 0, W, H);
  logo(W / 2, 92, 1);
  txt('A 2D PIXEL-ART CO-OP TAG-TEAM PLATFORMER · NEW SACRAMENTO 2070', W / 2, 160, '#bfe', 12, 'center');
  ctx.save(); ctx.imageSmoothingEnabled = false;
  if (sprH('ronin_idle')) { ctx.shadowColor = '#ffd84a'; ctx.shadowBlur = 16; spr(Math.floor(tick / 40) % 2 ? 'ronin_idle2' : 'ronin_idle', 258, 336, false, 2.4); ctx.shadowColor = '#00ff66'; spr('jarron_idle', 702, 336 + (Math.floor(tick / 30) % 2), true, 2.4); ctx.shadowBlur = 0; }
  else { ctx.drawImage(SPR.ronin.stand.r, 210, 196, 96, 138); ctx.drawImage(SPR.jarron.stand.l, 654, 196, 96, 138); }
  ctx.restore();
  for (let i = 0; i < 14; i++) ctx.drawImage(SPR.coin, 300 + i * 26 + (i % 2) * 6, 330 - (i % 3) * 3);
  txt('RONIN VII', 258, 350, '#f5c542', 14, 'center', true); txt('THE STACKER', 258, 366, '#998', 10, 'center');
  txt('JARRON X', 702, 350, '#00ff66', 14, 'center', true); txt('THE HUSTLER', 702, 366, '#998', 10, 'center');
  TITLE_OPTS.forEach((o, i) => {
    const sel = S.menuIdx === i, y = 214 + i * 38, label = o === 'MUSIC' ? 'SOUNDTRACK: ' + (musicOn ? 'ON ♪' : 'MUTED') : o;
    ctx.fillStyle = sel ? 'rgba(0,255,102,.18)' : 'rgba(0,0,0,.5)'; ctx.fillRect(W / 2 - 150, y - 15, 300, 30);
    ctx.strokeStyle = sel ? '#00ff66' : '#335'; ctx.lineWidth = 2; ctx.strokeRect(W / 2 - 150, y - 15, 300, 30);
    txt((sel ? '▶ ' : '  ') + label, W / 2, y, sel ? '#00ff66' : '#dde', 15, 'center', sel);
  });
  panel(110, 392, 740, 104, '#ffd84a33', 'rgba(0,0,0,.65)');
  const C = ['←/→ A/D move · SPACE/W jump · TAB/Q tag-switch (even mid-jump)', 'E/SHIFT ability: RONIN STACK coins ($40, hold to keep stacking) · JARRON paper-plane GLIDE ($25) / dash ($10)', 'X throw (Ronin coin $15 · Jarron homing plane $25) · F use station · B borrow · G beg', 'One shared WALLET · one DEBT METER — hit 100% DEBT and you are TRAPPED.'];
  C.forEach((c, i) => txt(c, W / 2, 410 + i * 22, i === 3 ? '#ff6680' : '#cde', 12, 'center'));
  txt('"I gotta be careful, can\'t let the evil of the money trap, can\'t let them devils get me."', W / 2, 512, '#ffd84a', 11, 'center');
  txt('ENTER select · ↑↓ choose · M music · 1-8 jump to level', W / 2, 530, '#667', 10, 'center');
}
function updateTitle() {
  if (hit(...K.up)) S.menuIdx = (S.menuIdx + 2) % 3;
  if (hit(...K.down)) S.menuIdx = (S.menuIdx + 1) % 3;
  if (hit(...K.music)) toggleMusic();
  for (let i = 1; i <= 8; i++) if (hit('Digit' + i)) { S.hero = 'ronin'; loadLevel(i, false); return; }
  if (hit(...K.ok, 'Space', 'Click')) {
    if (S.menuIdx === 0) { S.hero = 'ronin'; S.stats = { spent: 0, earned: 0, stacks: 0, planes: 0, borrowed: 0, levelTime: 0, total: 0 }; loadLevel(1, false); }
    else if (S.menuIdx === 1) { S.mode = 'select'; S.selIdx = 0; }
    else toggleMusic();
  }
}
const LEVEL_ICONS = ['STACK', 'GLIDE', 'GAMBLE', 'INVEST', 'BARTER', 'STEAL', 'CAB', 'BOSS'];
function drawSelect() {
  drawBG('sky', tick * 0.8, 0); ctx.fillStyle = 'rgba(4,2,10,.7)'; ctx.fillRect(0, 0, W, H);
  logo(W / 2, 54, 0.6); txt('LEVEL SELECT · 8 LEVELS · ONE ESCAPE', W / 2, 106, '#00f3ff', 14, 'center', true);
  for (let i = 0; i < 8; i++) {
    const L = LEVELS[i](), cx = 40 + (i % 4) * 225, cy = 136 + Math.floor(i / 4) * 170, sel = S.selIdx === i, th = THEMES[L.theme];
    if (!BG[L.theme]) buildBG(L.theme);
    ctx.save(); ctx.beginPath(); ctx.rect(cx, cy, 205, 150); ctx.clip(); ctx.drawImage(BG[L.theme].mid, (i * 300) % 1500, 300, 410, 240, cx, cy, 205, 120); ctx.restore();
    ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(cx, cy + 86, 205, 64);
    ctx.strokeStyle = sel ? '#00ff66' : th.acc; ctx.lineWidth = sel ? 4 : 2; ctx.strokeRect(cx, cy, 205, 150);
    txt('L' + (i + 1), cx + 10, cy + 16, th.acc2, 18, 'left', true); txt(LEVEL_ICONS[i], cx + 195, cy + 16, '#fff', 11, 'right');
    txt(L.name, cx + 102, cy + 104, sel ? '#00ff66' : '#fff', 13, 'center', true);
    txt(L.sub.length > 32 ? L.sub.slice(0, 31) + '…' : L.sub, cx + 102, cy + 124, '#aab', 9, 'center');
    if (sel) txt('▶ ENTER', cx + 102, cy + 141, '#00ff66', 10, 'center');
  }
  txt('←→↑↓ choose · 1-8 direct · ENTER play · ESC back', W / 2, 520, '#889', 11, 'center');
}
function updateSelect() {
  if (hit(...K.left)) S.selIdx = (S.selIdx + 7) % 8;
  if (hit(...K.right)) S.selIdx = (S.selIdx + 1) % 8;
  if (hit(...K.up, ...K.down)) S.selIdx = (S.selIdx + 4) % 8;
  if (hit(...K.music)) toggleMusic();
  for (let i = 1; i <= 8; i++) if (hit('Digit' + i)) { S.selIdx = i - 1; loadLevel(i, false); return; }
  if (hit(...K.ok, 'Space')) loadLevel(S.selIdx + 1, false);
  else if (hit('Escape')) { S.mode = 'title'; S.menuIdx = 1; }
}
const PAUSE_OPTS = ['RESUME', 'RESTART LEVEL', 'LEVEL SELECT', 'TITLE SCREEN'];
function drawOverlay(title, col, lines, opts) {
  ctx.fillStyle = 'rgba(0,0,0,.65)'; ctx.fillRect(0, 0, W, H);
  const h = 120 + lines.length * 22 + (opts ? opts.length * 30 : 0);
  panel(W / 2 - 360, H / 2 - h / 2, 720, h, col, 'rgba(6,6,14,.95)');
  let y = H / 2 - h / 2 + 40; txt(title, W / 2, y, col, 30, 'center', true); y += 44;
  lines.forEach(l => { txt(l, W / 2, y, '#dde', 13, 'center'); y += 22; });
  if (opts) { y += 6; opts.forEach((o, i) => { const sel = S.menuIdx === i; txt((sel ? '▶ ' : '') + o, W / 2, y, sel ? '#00ff66' : '#aab', 15, 'center', sel); y += 30; }); }
}
function updatePause() {
  if (hit(...K.up)) S.menuIdx = (S.menuIdx + 3) % 4;
  if (hit(...K.down)) S.menuIdx = (S.menuIdx + 1) % 4;
  if (hit(...K.music)) toggleMusic();
  if (hit('Escape', 'KeyP')) { S.mode = 'play'; return; }
  if (hit(...K.ok, 'Space')) {
    const i = S.menuIdx;
    if (i === 0) S.mode = 'play'; else if (i === 1) loadLevel(S.levelNo, false); else if (i === 2) { S.mode = 'select'; S.selIdx = S.levelNo - 1; } else { S.mode = 'title'; S.menuIdx = 0; }
  }
}

/* ---------------- MAIN LOOP ---------------- */
function step() {
  tick++;
  switch (S.mode) {
    case 'title': updateTitle(); break;
    case 'select': updateSelect(); break;
    case 'play': if (S.modal) { updateModal(); if (S.toastMsg && --S.toastMsg.t <= 0) S.toastMsg = null; } else updatePlay(); break;
    case 'pause': updatePause(); break;
    case 'clear': S.clearT++; if (S.clearT > 30 && hit(...K.ok, 'Space', 'Click')) { if (S.levelNo < 8) loadLevel(S.levelNo + 1, true); else { S.mode = 'title'; } } break;
    case 'trapped': S.trapT++; if (S.trapT > 150 || (S.trapT > 40 && hit(...K.ok, 'Space'))) escapeTrap(); break;
    case 'victory': S.clearT++; updateWorld(); if (S.clearT > 60 && hit(...K.ok, 'Space', 'Click')) { S.mode = 'title'; S.menuIdx = 0; } break;
  }
  for (const k in pressed) pressed[k] = false;
}
function render() {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, W, H);
  if (S.mode === 'title') drawTitle();
  else if (S.mode === 'select') drawSelect();
  else {
    drawPlay();
    if (S.mode === 'pause') drawOverlay('PAUSED', '#00f3ff', ['L' + S.levelNo + ' · ' + S.level.name, 'Wallet ' + money(S.wallet) + ' · Debt ' + Math.round(S.debt) + '%'], PAUSE_OPTS);
    if (S.mode === 'clear') drawOverlay('LEVEL ' + S.levelNo + ' CLEAR!', '#00ff66', [S.level.name + ' escaped in ' + (S.stats.levelTime / 60).toFixed(1) + 's', 'Wallet ' + money(S.wallet) + ' · Debt ' + Math.round(S.debt) + '%' + (S.invest.value ? ' · Invest ' + money(S.invest.value) + ' (+10% level bonus)' : ''), S.levelNo < 8 ? 'Next: L' + (S.levelNo + 1) + ' · ' + LEVELS[S.levelNo]().name : '', 'ENTER to continue']);
    if (S.mode === 'trapped') { ctx.fillStyle = 'rgba(80,0,10,' + Math.min(0.6, S.trapT / 60) + ')'; ctx.fillRect(0, 0, W, H); drawOverlay('TRAPPED!', '#ff2244', ['DEBT hit 100%. The Money Trap closed on Ronin & Jarron.', '"Can\'t let them devils get me…"', 'Restoring your last BANK VAULT save…']); }
    if (S.mode === 'victory') drawOverlay('YOU ESCAPED THE MONEY TRAP', '#ffd84a', ['The Devil Banker is broke. Ronin VII & Jarron X glide free over Tower Bridge.', 'Spent ' + money(S.stats.spent) + ' · Earned ' + money(S.stats.earned) + ' · Borrowed ' + money(S.stats.borrowed), 'Coin stacks ' + S.stats.stacks + ' · Paper planes ' + S.stats.planes + ' · Final debt ' + Math.round(S.debt) + '%', '"Money is not the score. Money is the tool."', 'ENTER for title']);
  }
}
let last = performance.now(), acc = 0;
function frame(now) {
  acc += Math.min(100, now - last); last = now;
  let n = 0;
  while (acc >= 1000 / 60 && n < 5) { step(); acc -= 1000 / 60; n++; }
  render();
  requestAnimationFrame(frame);
}
buildBG('oldsac');
requestAnimationFrame(frame);
cv.focus();

/* ---------------- TEST / DEV HOOKS ---------------- */
window.MT = {
  S, loadLevel, LEVELS, step, render,
  press(code) { pressed[code] = true; keys[code] = true; },
  release(code) { keys[code] = false; },
  get mode() { return S.mode; },
};
})();
