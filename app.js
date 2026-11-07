'use strict';
/* CheerPlan – private Trainings- und Routinen-App fürs Cheerleading.
   Alle Daten bleiben auf dem Gerät (localStorage, Musik in IndexedDB). */

// ---------- Hilfsfunktionen ----------
const $ = (s, r = document) => r.querySelector(s);
const uid = () => Math.random().toString(36).slice(2, 10);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const pad = n => String(n).padStart(2, '0');
const today = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const fmtTime = sec => { sec = Math.max(0, Math.round(sec)); return `${Math.floor(sec / 60)}:${pad(sec % 60)}`; };
const WD = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const fmtDate = iso => { if (!iso) return ''; const [y, m, d] = iso.split('-').map(Number); const dt = new Date(y, m - 1, d); return `${WD[dt.getDay()]}, ${pad(d)}.${pad(m)}.${y}`; };
const initials = name => { const p = String(name || '?').trim().split(/\s+/); return (p.length > 1 ? p[0][0] + p[p.length - 1][0] : p[0].slice(0, 2)).toUpperCase(); };
const clone = o => JSON.parse(JSON.stringify(o));

function toast(msg, ms = 2200) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => { t.hidden = true; }, ms);
}

// Kleine Symbole als SVG (sehen auf jedem Gerät gleich aus)
const svg = d => `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">${d}</svg>`;
const I = {
  prev: svg('<path d="M6 5h2v14H6zM20 5v14L9 12z"/>'),
  next: svg('<path d="M16 5h2v14h-2zM4 5v14l11-7z"/>'),
  copy: svg('<path d="M8 3h11a2 2 0 0 1 2 2v11h-2V5H8zM5 7h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2zm0 2v10h10V9z"/>'),
};

// ---------- Fachliche Konstanten ----------
const SECTIONS = {
  stunt: { label: 'Stunt', color: '#e2337f' },
  pyramid: { label: 'Pyramide', color: '#d4a20f' },
  tumbling: { label: 'Tumbling', color: '#ee7d22' },
  jumps: { label: 'Sprünge', color: '#1fa3b5' },
  dance: { label: 'Tanz', color: '#7b3fe4' },
  cheer: { label: 'Cheer', color: '#2fa564' },
  transition: { label: 'Übergang', color: '#7c8799' },
};
const ROLES = { Flyer: '#e2337f', Base: '#3a6fd8', Backspot: '#7b3fe4', Frontspot: '#1fa3b5', Tumbler: '#ee7d22', Ersatz: '#7c8799' };
const BLOCKS = {
  warmup: { label: 'Aufwärmen', color: '#ee7d22' },
  stunts: { label: 'Stunts', color: '#e2337f' },
  tumbling: { label: 'Tumbling', color: '#d4a20f' },
  jumps: { label: 'Sprünge', color: '#1fa3b5' },
  routine: { label: 'Routine üben', color: '#7b3fe4' },
  condition: { label: 'Kondition', color: '#3a6fd8' },
  stretch: { label: 'Dehnen', color: '#2fa564' },
  break: { label: 'Pause', color: '#9aa3b2' },
  other: { label: 'Sonstiges', color: '#7c8799' },
};
const SKILL_STATUS = ['Ziel', 'Übe ich', 'Sitzt ✓'];
const TEAM_COLORS = ['#e2337f', '#ee7d22', '#d4a20f', '#2fa564', '#1fa3b5', '#3a6fd8', '#7b3fe4', '#7c8799'];
const TEAM_SUGGEST = ['Tinys', 'Minis', 'Sassys', 'Classys', 'Youth', 'Juniors', 'Seniors'];
// Begrüßung beim allerersten Öffnen
const WELCOME = {
  title: 'Überraschung! ❤️',
  text: 'Hey Baby, hab mal eine App für dich bauen lassen. Müssen wir mal durchgehen, was wir optimieren können. Love you ❤️',
  from: 'André',
};
const MOTTOS = [
  'Ein Team, ein Count. 💙', 'Hit zero! 🎯', 'Flyer fly – Bases trust.', 'Jeder Achter zählt.',
  'Smile – die Jury schaut zu 😁', 'Stark ist, wer wieder aufsteht.', 'Heute wird geflogen! ✨',
  'Kleine Schritte, große Stunts.', 'Sharp motions, big smiles!', 'Vertrauen ist die beste Base.',
];

// ---------- Grafiken ----------
function pompom(cx, cy, r, c1, c2) {
  let out = '';
  for (let i = 0; i < 34; i++) {
    const a = i / 34 * Math.PI * 2, len = r * (0.78 + ((i * 37) % 11) / 45);
    const x = (cx + Math.cos(a) * len).toFixed(1), y = (cy + Math.sin(a) * len).toFixed(1);
    out += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="${i % 2 ? c1 : c2}"/>`;
  }
  return `<g stroke-width="${(r / 6).toFixed(1)}" stroke-linecap="round">${out}</g><circle cx="${cx}" cy="${cy}" r="${(r * 0.35).toFixed(1)}" fill="${c2}"/>`;
}
const ART = {
  pompoms: `<svg class="art" viewBox="0 0 200 120" aria-hidden="true"><g class="pp1">${pompom(62, 58, 40, '#2f5fd0', '#c9d2e3')}</g><g class="pp2">${pompom(138, 62, 40, '#14275e', '#e2337f')}</g></svg>`,
  megaphone: `<svg class="art" viewBox="0 0 200 120" aria-hidden="true">
    <g transform="rotate(-14 100 60)"><path d="M58 48 L132 22 L132 98 L58 72 Z" fill="#2f5fd0"/><rect x="40" y="46" width="22" height="28" rx="6" fill="#14275e"/>
    <ellipse cx="132" cy="60" rx="10" ry="38" fill="#c9d2e3"/><path d="M70 74 L78 98 L90 96 L84 76 Z" fill="#14275e"/>
    <text x="96" y="66" text-anchor="middle" font-size="16" font-weight="900" font-style="italic" fill="#fff">ACU</text></g>
    <g class="twinkle" fill="#d4a20f"><path d="M160 22l3 7 7 3-7 3-3 7-3-7-7-3 7-3z"/><path d="M174 70l2 4 4 2-4 2-2 4-2-4-4-2 4-2z"/></g></svg>`,
  stopwatch: `<svg class="art" viewBox="0 0 200 120" aria-hidden="true"><circle cx="100" cy="66" r="42" fill="#fff" stroke="#2f5fd0" stroke-width="9"/>
    <rect x="90" y="10" width="20" height="12" rx="4" fill="#14275e"/><rect x="96" y="20" width="8" height="8" fill="#14275e"/>
    <path d="M100 66 L100 38" stroke="#e2337f" stroke-width="6" stroke-linecap="round" class="hand"/><circle cx="100" cy="66" r="6" fill="#14275e"/>
    <g class="twinkle" fill="#d4a20f"><path d="M160 30l3 7 7 3-7 3-3 7-3-7-7-3 7-3z"/><path d="M36 40l2 4 4 2-4 2-2 4-2-4-4-2 4-2z"/></g></svg>`,
};
const SPARKLES = `<svg class="sparkles" viewBox="0 0 300 160" aria-hidden="true" fill="#fff">
  <path d="M30 30l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/><path d="M250 20l3 8 8 3-8 3-3 8-3-8-8-3 8-3z"/>
  <path d="M200 120l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/><circle cx="120" cy="18" r="2"/><circle cx="280" cy="100" r="2"/><circle cx="70" cy="140" r="1.6"/></svg>`;

function confetti(n = 90) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const wrap = document.createElement('div'); wrap.className = 'confetti';
  const colors = ['#2f5fd0', '#ffffff', '#c9d2e3', '#e2337f', '#d4a20f', '#14275e'];
  for (let i = 0; i < n; i++) {
    const p = document.createElement('i');
    p.style.left = Math.random() * 100 + '%';
    p.style.background = colors[i % colors.length];
    p.style.animationDelay = Math.random() * 0.5 + 's';
    p.style.animationDuration = 1.8 + Math.random() * 1.6 + 's';
    p.style.setProperty('--dx', (Math.random() * 180 - 90) + 'px');
    p.style.setProperty('--r', (Math.random() * 900 - 450) + 'deg');
    if (i % 3 === 0) p.style.borderRadius = '50%';
    wrap.appendChild(p);
  }
  document.body.appendChild(wrap); setTimeout(() => wrap.remove(), 4200);
}
const MOODS = ['😣', '😐', '🙂', '😄', '🤩'];

// ---------- Vorschläge beim ersten Start ----------
function seed() {
  const ex = (name, seconds, sides = false) => ({ id: uid(), name, seconds, sides });
  const sk = (name, cat) => ({ id: uid(), name, cat, status: 0, date: '' });
  return {
    v: 1,
    welcomed: false,
    profile: { name: '' },
    teams: [],
    athletes: [],
    routines: [],
    sessions: [],
    me: {
      plans: [
        { id: uid(), name: 'Flyer-Beweglichkeit', exercises: [
          ex('Hüftbeuger dehnen (Ausfallschritt)', 45, true),
          ex('Spagat', 60, true),
          ex('Mittelspagat', 60),
          ex('Heel Stretch mit Band', 40, true),
          ex('Scorpion-Zug mit Band', 40, true),
          ex('Brücke', 30),
          ex('Schultern dehnen', 40),
        ] },
        { id: uid(), name: 'Balance & Körperspannung', exercises: [
          ex('Hollow Hold', 30),
          ex('Unterarmstütz', 45),
          ex('Seitstütz', 30, true),
          ex('Einbeinstand auf Zehenspitzen', 40, true),
          ex('Liberty-Haltung halten', 30, true),
          ex('Einbeinstand mit geschlossenen Augen', 30, true),
          ex('Superman', 30),
        ] },
      ],
      skills: [
        sk('Prep / Elevator', 'Stunts'), sk('Extension', 'Stunts'), sk('Liberty', 'Stunts'),
        sk('Heel Stretch', 'Stunts'), sk('Arabesque', 'Stunts'), sk('Scale', 'Stunts'),
        sk('Bow and Arrow', 'Stunts'), sk('Scorpion', 'Stunts'), sk('Needle', 'Stunts'),
        sk('Tick Tock', 'Stunts'), sk('Full Down', 'Stunts'), sk('Double Down', 'Stunts'),
        sk('Basket Toss', 'Stunts'), sk('Kick Double', 'Stunts'),
        sk('Spagat links', 'Beweglichkeit'), sk('Spagat rechts', 'Beweglichkeit'), sk('Mittelspagat', 'Beweglichkeit'),
        sk('Toe Touch', 'Sprünge'), sk('Hurdler', 'Sprünge'), sk('Pike', 'Sprünge'),
        sk('Rad', 'Tumbling'), sk('Round-off', 'Tumbling'), sk('Flick-Flack (Back Handspring)', 'Tumbling'), sk('Salto rückwärts (Back Tuck)', 'Tumbling'),
      ],
      diary: [],
    },
  };
}

// ---------- Speicher ----------
const KEY = 'cheerplan.v1';
const APP_VERSION = '8 · 07.11.2026'; // bei jeder Änderung zusammen mit CACHE in sw.js hochzählen
let db;
function load() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY));
    if (d && d.v === 1) return upgrade(d);
  } catch (e) { /* defekte Daten: neu anfangen */ }
  return upgrade(seed());
}
function upgrade(d) {
  d.teams = d.teams || [];
  d.profile = d.profile || { name: '' };
  if (d.welcomed === undefined) d.welcomed = true;
  patchTabata(d);
  d.me.plans.forEach(planDefaults);
  // Wunsch Nov. 2026: Zählen mit Stimme standardmäßig aus
  if (!d.patches.includes('voice-off-1')) { d.patches.push('voice-off-1'); d.me.plans.forEach(p => { p.count = false; }); }
  // Wunsch Nov. 2026: Tabata ist ein eigener Konditionsplan, Beweglichkeit ohne Tabata-Pausen
  if (!d.patches.includes('tabata-split-1')) {
    d.patches.push('tabata-split-1');
    const kond = ['Jumping Jacks', 'Squats', 'Plank halten'];
    const flex = d.me.plans.find(p => p.name === 'Flyer-Beweglichkeit');
    if (flex) { flex.exercises = flex.exercises.filter(e => !kond.includes(e.name)); flex.rest = 0; }
    if (!d.me.plans.some(p => p.name === 'Tabata')) {
      const t = { id: uid(), name: 'Tabata', rest: 10, rounds: 1, count: false, bpm: 120, musicId: null, musicName: '',
        exercises: [...kond, 'Mountain Climbers', 'Ausfallschritte', 'High Knees', 'Sit-ups', 'Burpees']
          .map(name => ({ id: uid(), name, seconds: 20, sides: false })) };
      d.me.plans.unshift(t);
    }
  }
  return d;
}
function planDefaults(p) {
  if (p.rest === undefined) p.rest = 10;
  if (p.rounds === undefined) p.rounds = 1;
  if (p.count === undefined) p.count = false;
  if (p.bpm === undefined) p.bpm = 120;
  if (p.musicId === undefined) { p.musicId = null; p.musicName = ''; }
}
// Wünsche der Trainerin (Nov. 2026): Tabata, 20 Sek., neue Tumbling- und Sprung-Skills
function patchTabata(d) {
  d.patches = d.patches || [];
  if (d.patches.includes('tabata-1')) return;
  d.patches.push('tabata-1');
  const me = d.me;
  me.plans = me.plans.filter(p => p.name !== 'Balance & Körperspannung');
  const flex = me.plans.find(p => p.name === 'Flyer-Beweglichkeit');
  if (flex) {
    flex.exercises = flex.exercises.filter(e => !['Spagat', 'Scorpion-Zug mit Band'].includes(e.name));
    flex.exercises.forEach(e => { if (e.name === 'Heel Stretch mit Band') e.name = 'Heel Stretch'; });
    ['Plank halten', 'Squats', 'Jumping Jacks'].forEach(n => {
      if (!flex.exercises.some(e => e.name === n)) flex.exercises.unshift({ id: uid(), name: n, seconds: 20, sides: false });
    });
    flex.exercises.forEach(e => { e.seconds = 20; });
  }
  const drop = ['Round-off', 'Flick-Flack (Back Handspring)', 'Salto rückwärts (Back Tuck)'];
  me.skills = me.skills.filter(s => !(s.cat === 'Tumbling' && drop.includes(s.name)));
  const addSkill = (name, cat) => { if (!me.skills.some(s => s.name.toLowerCase() === name.toLowerCase())) me.skills.push({ id: uid(), name, cat, status: 0, date: '' }); };
  ['Handstand', 'Handstand abrollen', 'Vorwärtsrolle', 'Rückwärtsrolle', 'Radwende'].forEach(n => addSkill(n, 'Tumbling'));
  ['Tuck', 'Spread Eagle', 'T-Sprung'].forEach(n => addSkill(n, 'Sprünge'));
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(db)); }
  catch (e) { toast('Speichern fehlgeschlagen – Speicher voll?', 4000); }
}
db = load();
save();
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

// Musik in IndexedDB (für localStorage zu groß)
const idb = {
  _db: null,
  open() {
    if (this._db) return Promise.resolve(this._db);
    return new Promise((res, rej) => {
      const r = indexedDB.open('cheerplan-music', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('music');
      r.onsuccess = () => { this._db = r.result; res(r.result); };
      r.onerror = () => rej(r.error);
    });
  },
  async run(mode, fn) {
    const d = await this.open();
    return new Promise((res, rej) => {
      const tx = d.transaction('music', mode);
      const req = fn(tx.objectStore('music'));
      tx.oncomplete = () => res(req && req.result);
      tx.onerror = () => rej(tx.error);
    });
  },
  put(id, blob) { return this.run('readwrite', s => s.put(blob, id)); },
  get(id) { return this.run('readonly', s => s.get(id)); },
  del(id) { return this.run('readwrite', s => s.delete(id)); },
};

// ---------- Zugriffe ----------
const routine = id => db.routines.find(r => r.id === id);
const session = id => db.sessions.find(s => s.id === id);
const plan = id => db.me.plans.find(p => p.id === id);
const athlete = id => db.athletes.find(a => a.id === id);
const team = id => db.teams.find(t => t.id === id);
const teamChip = id => { const t = id && team(id); return t ? ` <span class="chip" style="background:${t.color}">${esc(t.name)}</span>` : ''; };
const teamAthletes = id => (id && team(id) ? db.athletes.filter(a => a.teamId === id) : db.athletes);
const teamSelect = (key, sel) => db.teams.length ? `<label class="f">Team</label><select data-in="${key}">
  <option value="">Alle / kein bestimmtes Team</option>${db.teams.map(t => `<option value="${t.id}" ${t.id === sel ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}</select>` : '';
const roleColor = role => ROLES[role] || '#7c8799';
const eightSec = r => 8 * 60 / (r.bpm || 144);
const routineDuration = r => r.eights.length * eightSec(r);
const newEight = (section = 'dance') => ({ id: uid(), section, counts: ['', '', '', '', '', '', '', ''], note: '', formation: null, gName: '', groups: [] });

function effectiveFormation(r, idx) {
  for (let i = Math.min(idx, r.eights.length - 1); i >= 0; i--) {
    if (r.eights[i].formation) return { pos: r.eights[i].formation, from: i };
  }
  return { pos: {}, from: -1 };
}
function ownFormation(r, idx) {
  const e = r.eights[idx];
  if (!e.formation) e.formation = clone(effectiveFormation(r, idx).pos);
  return e.formation;
}
// Wunsch Nov. 2026: mehrere Aufstellungen (Matten) pro Routine, z. B. „Opening“ für Achter 1–2,
// „Stunt“ für Achter 3–5. Eine Aufstellung beginnt bei einem Achter mit eigener Aufstellung
// und gilt, bis ein späterer Achter eine neue bekommt.
function formationSegments(r) {
  const segs = [];
  r.eights.forEach((e, i) => {
    if (e.formation || i === 0) segs.push({ start: i, end: i, eight: e, empty: !e.formation });
    else segs[segs.length - 1].end = i;
  });
  let n = 0;
  segs.forEach(s => { if (!s.empty) n++; s.name = s.empty ? 'Ohne Aufstellung' : (s.eight.fName || `Aufstellung ${n}`); });
  return segs;
}
const segmentOf = (r, idx) => formationSegments(r).find(s => idx >= s.start && idx <= s.end);
const eightRange = s => s.start === s.end ? `${s.start + 1}. Achter` : `Achter ${s.start + 1}–${s.end + 1}`;
// Wunsch Nov. 2026: mehrere Stuntgruppen im selben Achter (z. B. Group Miley / Group Lina)
const newGroup = (name = '') => ({ id: uid(), name, counts: ['', '', '', '', '', '', '', ''] });
const eightRows = e => [{ name: e.gName || '', counts: e.counts }, ...(e.groups || [])];
function countText(e, k) {
  const rows = eightRows(e).filter(g => g.counts[k]);
  if (!e.groups || !e.groups.length) return rows.length ? rows[0].counts[k] : '';
  return rows.map(g => (g.name ? g.name + ': ' : '') + g.counts[k]).join(' · ');
}

// ---------- Navigation ----------
const state = { teamFilter: null, view: 'home', id: null, tab: 'counts', eightIdx: 0, stack: [], editSkills: false };
const ROOT_TITLES = { home: 'CheerPlan', routines: 'Routinen', training: 'Training', team: 'Team', me: 'Mein Training' };

function go(view, id = null, tab = null) {
  state.stack.push({ view: state.view, id: state.id, tab: state.tab, y: window.scrollY });
  leaveView();
  Object.assign(state, { view, id, tab: tab || (view === 'routine' ? 'counts' : null) });
  if (view === 'routine') state.eightIdx = 0;
  render(); window.scrollTo(0, 0);
}
function back() {
  const p = state.stack.pop(); if (!p) return;
  leaveView();
  Object.assign(state, { view: p.view, id: p.id, tab: p.tab });
  render(); window.scrollTo(0, p.y || 0);
}
function tabTo(v) { leaveView(); state.stack = []; Object.assign(state, { view: v, id: null, tab: null }); render(); window.scrollTo(0, 0); }
function leaveView() { stopPlayer(); stopPreview(); }

function render() {
  let title = ROOT_TITLES[state.view], html = '';
  const root = state.stack.length ? state.stack[0].view : state.view;
  switch (state.view) {
    case 'home': html = vHome(); break;
    case 'routines': html = vRoutines(); break;
    case 'routine': { const r = routine(state.id); if (!r) return back(); title = r.name || 'Routine'; html = vRoutine(r); break; }
    case 'training': html = vTraining(); break;
    case 'session': { const s = session(state.id); if (!s) return back(); title = s.title || 'Training'; html = vSession(s); break; }
    case 'team': html = vTeam(); break;
    case 'me': html = vMe(); break;
    case 'plan': { const p = plan(state.id); if (!p) return back(); title = p.name || 'Plan'; html = vPlan(p); break; }
  }
  $('#title').textContent = title;
  $('#backBtn').hidden = !state.stack.length;
  const v = $('#view'), key = state.view + state.id + state.tab;
  v.innerHTML = html;
  v.classList.remove('enter');
  if (key !== render.key) { void v.offsetWidth; v.classList.add('enter'); render.key = key; }
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.v === root));
  if (state.view === 'routine' && state.tab === 'play') initPlayer(routine(state.id));
}

const empty = (t, s, art = '') => `<div class="card empty">${art ? ART[art] : ''}<b>${t}</b>${s}</div>`;

// ---------- Ansicht: Start ----------
function greeting() { const h = new Date().getHours(); return h < 11 ? 'Guten Morgen' : h < 17 ? 'Hallo' : 'Guten Abend'; }
function ring(pct) {
  const c = 2 * Math.PI * 34;
  return `<svg class="ring" viewBox="0 0 84 84"><circle cx="42" cy="42" r="34" stroke="#e3e8f2" stroke-width="9" fill="none"/>
    <circle class="ringv" cx="42" cy="42" r="34" stroke="url(#rg)" stroke-width="9" fill="none" stroke-linecap="round"
      stroke-dasharray="${c.toFixed(1)}" style="--off:${(c * (1 - pct)).toFixed(1)};--full:${c.toFixed(1)}" transform="rotate(-90 42 42)"/>
    <defs><linearGradient id="rg"><stop offset="0" stop-color="#2f5fd0"/><stop offset="1" stop-color="#e2337f"/></linearGradient></defs>
    <text x="42" y="48" text-anchor="middle" font-size="18" font-weight="800" fill="#141b2d">${Math.round(pct * 100)}%</text></svg>`;
}
function vHome() {
  const t = today(), name = db.profile.name.trim();
  const next = db.sessions.filter(s => s.date >= t).sort((a, b) => (a.date < b.date ? -1 : 1))[0];
  const sk = db.me.skills, done = sk.filter(s => s.status === 2).length, working = sk.filter(s => s.status === 1);
  const day = Math.floor(Date.now() / 864e5);
  const routines = db.routines.slice(0, 8).map(r => `
    <button class="rmini" data-a="openRoutine" data-id="${r.id}" style="--c:${SECTIONS[r.eights[0]?.section || 'dance'].color}">
      <b>${esc(r.name || 'Ohne Namen')}</b><span>${r.eights.length} Achter · ${fmtTime(routineDuration(r))}</span>${teamChip(r.teamId)}</button>`).join('');
  return `
    <div class="hero">${SPARKLES}
      <div class="heroIn">
        <img class="heroLogo" src="icons/logo.jpg" alt="ACU Athletics Cheer Unit">
        <div class="heroBig">${greeting()}${name ? ', ' + esc(name) : ''}!</div>
        <div class="heroSub">${MOTTOS[day % MOTTOS.length]}</div>
      </div>${ART.pompoms}
    </div>
    <h2>Nächstes Training</h2>
    ${next ? `<button class="card" data-a="openSession" data-id="${next.id}"><div class="row">
        <div class="cal"><small>${WD[new Date(next.date + 'T12:00').getDay()]}</small>${Number(next.date.slice(8))}</div>
        <div class="grow"><div class="title">${esc(next.title || 'Training')}${teamChip(next.teamId)}</div>
        <div class="sub">${next.date === t ? 'Heute' : fmtDate(next.date)} · ${sessionMinutes(next)} Min</div></div><span class="chev">›</span></div></button>`
      : `<div class="card row"><div class="grow sub" style="margin:0">Noch kein Training geplant.</div><button class="btn small primary" data-a="newSession">Planen</button></div>`}
    <h2>Meine Skills</h2>
    <button class="card" data-a="tab" data-v="me"><div class="row">${ring(sk.length ? done / sk.length : 0)}
      <div class="grow"><div class="title">${done} von ${sk.length} Skills sitzen</div>
      <div class="sub">${working.length ? 'Gerade dran: ' + working.slice(0, 3).map(s => esc(s.name)).join(', ') : 'Tippe hier, um Skills abzuhaken.'}</div></div></div></button>
    <h2>Routinen</h2>
    <div class="hscroll">${routines}<button class="rmini add" data-a="newRoutine"><b>+</b><span>Neue Routine</span></button></div>
    <h2>Schnellstart</h2>
    <div class="quick">${db.me.plans.slice(0, 4).map(p => `<button data-a="runPlan" data-id="${p.id}" ${p.exercises.length ? '' : 'disabled'}><span>▶︎</span>${esc(p.name)}<small>${fmtTime(planSeconds(p))} Min</small></button>`).join('')}</div>`;
}

function showWelcome() {
  const o = $('#overlay'); o.hidden = false; o.classList.add('welcome');
  o.innerHTML = `<div class="rMain">${SPARKLES}<img class="wLogo" src="icons/logo.jpg" alt="ACU Athletics Cheer Unit">${ART.pompoms}
    <div class="wTitle">${esc(WELCOME.title)}</div>
    <div class="wText">${esc(WELCOME.text)}</div>
    <div class="wFrom">– ${esc(WELCOME.from)}</div>
    <label class="f" style="color:#c9d2e3;margin-top:26px">Wie dürfen wir dich nennen?</label>
    <input id="wName" placeholder="Dein Vorname" autocomplete="given-name" style="text-align:center">
  </div><button class="btn block wGo" data-a="wGo">Los geht’s! ✨</button>`;
  setTimeout(() => confetti(110), 350);
}

// ---------- Ansicht: Routinen ----------
function vRoutines() {
  const list = db.routines.map(r => `
    <button class="card" data-a="openRoutine" data-id="${r.id}"><div class="row">
      <div class="grow"><div class="title">${esc(r.name || 'Ohne Namen')}</div>
      <div class="sub">${r.eights.length} Achter · ${fmtTime(routineDuration(r))} Min${r.musicName ? ' · ♪ Musik' : ''}${teamChip(r.teamId)}</div></div>
      <span class="chev">›</span></div></button>`).join('');
  return `<h2>Meine Routinen</h2>
    ${list || empty('Noch keine Routine', 'Eine Routine wird in Achtern (8-Counts) geplant. Zu jedem Count schreibst du, was passiert.', 'megaphone')}
    <button class="btn primary block" data-a="newRoutine">+ Neue Routine</button>`;
}

function vRoutine(r) {
  const seg = ['counts:Counts', 'formation:Aufstellung', 'play:Abspielen'].map(x => {
    const [k, l] = x.split(':'); return `<button class="${state.tab === k ? 'on' : ''}" data-a="rTab" data-t="${k}">${l}</button>`;
  }).join('');
  const body = state.tab === 'formation' ? vFormation(r) : state.tab === 'play' ? vPlay(r) : vCounts(r);
  return `<div class="seg">${seg}</div>${body}`;
}

function sectionOptions(sel) {
  return Object.entries(SECTIONS).map(([k, s]) => `<option value="${k}" ${k === sel ? 'selected' : ''}>${s.label}</option>`).join('');
}

function vCounts(r) {
  const es = eightSec(r), dur = routineDuration(r);
  const segs = formationSegments(r);
  const countInputs = (e, counts, g) => `<div class="counts">${counts.map((c, k) => `<label><span>${k + 1}</span><input data-in="${g === undefined ? 'eCount' : 'gCount'}" data-id="${e.id}" ${g === undefined ? '' : `data-g="${g}"`} data-k="${k}" value="${esc(c)}" autocomplete="off"></label>`).join('')}</div>`;
  const eights = r.eights.map((e, i) => {
    const groups = e.groups || [], seg = segs.find(s => i >= s.start && i <= s.end);
    return `
    <div class="card eight" style="border-left-color:${SECTIONS[e.section]?.color}" data-eid="${e.id}">
      <div class="eh">
        <div class="num">${i + 1}. Achter<small>ab ${fmtTime((r.offset || 0) + i * es)}</small></div>
        <select data-in="eSection" data-id="${e.id}">${sectionOptions(e.section)}</select>
      </div>
      ${groups.length ? `<input class="gname" data-in="eGName" data-id="${e.id}" value="${esc(e.gName)}" placeholder="Gruppe, z. B. Group Miley" list="grpNames" autocomplete="off">` : ''}
      ${countInputs(e, e.counts)}
      ${groups.map((g, gi) => `<div class="grp">
        <div class="gh"><input data-in="gName" data-id="${e.id}" data-g="${gi}" value="${esc(g.name)}" placeholder="Gruppe, z. B. Group Lina" list="grpNames" autocomplete="off">
          <button class="icon" data-a="gDel" data-i="${i}" data-g="${gi}" aria-label="Gruppe entfernen">✕</button></div>
        ${countInputs(e, g.counts, gi)}</div>`).join('')}
      <input class="note" data-in="eNote" data-id="${e.id}" value="${esc(e.note)}" placeholder="Notiz zu diesem Achter (optional)">
      <div class="tools">
        <button class="btn small" data-a="gAdd" data-i="${i}">+ Gruppe</button>
        <button class="btn small fbtn" data-a="eFormation" data-i="${i}">${seg && !seg.empty ? (seg.start === i ? '▦ ' : '') + esc(seg.name) : 'Aufstellung'}</button>
        <button class="icon" data-a="eUp" data-i="${i}" ${i === 0 ? 'disabled' : ''} aria-label="nach oben">↑</button>
        <button class="icon" data-a="eDown" data-i="${i}" ${i === r.eights.length - 1 ? 'disabled' : ''} aria-label="nach unten">↓</button>
        <button class="icon" data-a="eDup" data-i="${i}" aria-label="kopieren">${I.copy}</button>
        <button class="icon" data-a="eDel" data-i="${i}" aria-label="löschen">✕</button>
      </div>
    </div>`;
  }).join('');
  const names = [...new Set([...r.eights.flatMap(e => [e.gName, ...(e.groups || []).map(g => g.name)]),
    ...teamAthletes(r.teamId).map(a => 'Group ' + a.name)].filter(Boolean))];
  return `
    <div class="card">
      <label class="f" style="margin-top:0">Name der Routine</label>
      <input data-in="rName" value="${esc(r.name)}" placeholder="z. B. Regionals 2027">
      ${teamSelect('rTeam', r.teamId)}
      <div class="grid2">
        <div><label class="f">Tempo (Schläge pro Minute)</label><input data-in="rBpm" type="number" inputmode="numeric" min="60" max="220" value="${r.bpm}"></div>
        <div><label class="f">Count 1 beginnt bei (Sek.)</label><input data-in="rOffset" type="number" inputmode="decimal" step="0.1" min="0" value="${r.offset || 0}"></div>
      </div>
      <label class="f">Musik</label>
      <div class="row">
        <div class="grow sub" style="margin:0">${r.musicName ? '♪ ' + esc(r.musicName) : 'Keine Musik hinterlegt'}</div>
        <button class="btn small" data-a="pickMusic">${r.musicName ? 'Ändern' : 'Hinzufügen'}</button>
        ${r.musicName ? '<button class="icon" data-a="delMusic" aria-label="Musik entfernen">✕</button>' : ''}
      </div>
      <p class="hint" style="margin:10px 0 0">Länge: <b>${fmtTime(dur)} Min</b> bei ${r.eights.length} Achtern${dur > 150 ? ' · <span style="color:var(--warn)">länger als 2:30</span>' : ''}.
      Tempo und Startpunkt kannst du beim Abspielen bequem antippen.</p>
    </div>
    <h2>Count-Sheet</h2>
    <p class="hint">Machen mehrere Stuntgruppen im selben Achter etwas anderes? Tippe beim Achter auf „+ Gruppe“.</p>
    ${eights || empty('Noch keine Achter', 'Füge den ersten Achter hinzu.')}
    <datalist id="grpNames">${names.map(n => `<option value="${esc(n)}">`).join('')}</datalist>
    <div class="row gap" style="margin-top:6px">
      <button class="btn primary grow" data-a="eAdd">+ Achter hinzufügen</button>
    </div>
    <div class="row gap" style="margin-top:28px">
      <button class="btn small" data-a="rDup">Routine kopieren</button>
      <button class="btn small danger" data-a="rDel">Routine löschen</button>
    </div>`;
}

function matHTML(pos, mode) {
  const dots = Object.entries(pos).map(([aid, p]) => {
    const a = athlete(aid); if (!a) return '';
    return `<div class="dot nm" data-aid="${aid}" style="left:${p.x}%;top:${p.y}%;background:${roleColor(a.role)}">${esc(a.name)}</div>`;
  }).join('');
  return `<div class="mat ${mode || ''}" ${mode === 'edit' ? 'id="matEdit"' : ''}>${dots}<div class="matfront">VORNE · Publikum / Jury</div></div>`;
}

function vFormation(r) {
  if (!r.eights.length) return empty('Noch keine Achter', 'Lege zuerst unter „Counts“ Achter an.');
  if (!teamAthletes(r.teamId).length) return empty('Noch keine Sportlerinnen', `Lege zuerst unter „Team“ ${r.teamId ? 'für ' + esc(team(r.teamId).name) + ' ' : ''}deine Sportlerinnen an. Dann kannst du sie hier auf der Matte aufstellen.`, 'pompoms')
    + `<button class="btn primary block" data-a="tab" data-v="team">Zum Team</button>`;
  const i = state.eightIdx = clamp(state.eightIdx, 0, r.eights.length - 1);
  const e = r.eights[i], eff = effectiveFormation(r, i);
  const sec = SECTIONS[e.section];
  const segs = formationSegments(r), seg = segs.find(s => i >= s.start && i <= s.end);
  const status = e.formation ? `„${esc(seg.name)}“ gilt für ${eightRange(seg)}`
    : eff.from >= 0 ? `Gleiche Aufstellung wie ${eff.from + 1}. Achter („${esc(seg.name)}“). Für eine neue Matte tippe auf „Neue Aufstellung ab hier“.`
    : 'Noch keine Aufstellung – tippe unten auf Namen, um sie auf die Matte zu stellen';
  const segBar = segs.length > 1 || !segs[0].empty ? `<div class="fsegs">${segs.map(s => `<button class="${s === seg ? 'on' : ''}" data-a="fGo" data-i="${s.start}"><b>${esc(s.name)}</b>${eightRange(s)}</button>`).join('')}</div>` : '';
  const tray = teamAthletes(r.teamId).map(a => {
    const on = !!eff.pos[a.id];
    return `<button class="${on ? 'on' : ''}" style="${on ? 'background:' + roleColor(a.role) : ''}" data-a="fToggle" data-aid="${a.id}">${esc(a.name)}</button>`;
  }).join('');
  return `
    <div class="eightnav">
      <button class="icon" data-a="fPrev" ${i === 0 ? 'disabled' : ''}>‹</button>
      <div class="mid">${i + 1}. Achter <span class="chip" style="background:${sec.color}">${sec.label}</span></div>
      <button class="icon" data-a="fNext" ${i === r.eights.length - 1 ? 'disabled' : ''}>›</button>
    </div>
    ${segBar}
    ${e.formation ? `<input class="fname" data-in="fName" data-id="${e.id}" value="${esc(e.fName)}" placeholder="Name der Aufstellung, z. B. Opening" autocomplete="off">` : ''}
    <p class="hint" id="fStatus">${status}</p>
    ${matHTML(eff.pos, 'edit')}
    <div class="tray">${tray}</div>
    <p class="hint">Namen mit dem Finger verschieben. Eine Aufstellung gilt ab ihrem Achter, bis ein späterer Achter eine neue bekommt.</p>
    <div class="row gap">
      ${!e.formation && eff.from >= 0 ? '<button class="btn small primary" data-a="fNew">+ Neue Aufstellung ab hier</button>' : ''}
      ${e.formation && i > 0 ? '<button class="btn small" data-a="fReset">Aufstellung entfernen (wie davor)</button>' : ''}
      ${e.formation && i === 0 ? '<button class="btn small danger" data-a="fReset">Aufstellung leeren</button>' : ''}
    </div>`;
}

function vPlay(r) {
  if (!r.eights.length) return empty('Noch keine Achter', 'Lege zuerst unter „Counts“ Achter an.');
  return `<div class="play card">
    <div class="pTop"><div class="pEight" id="pEight">–</div><span class="chip" id="pSec"></span></div>
    <div class="pBeat wait" id="pBeat">Bereit?</div>
    <div class="pText" id="pText"></div>
    <div class="pNext" id="pNext"></div>
    ${db.athletes.length ? '<div id="pMat"></div>' : ''}
    <div class="pBar"><div id="pBar"></div></div>
    <div class="pTime" id="pTime">0:00</div>
    <div class="pctl">
      <button class="icon" data-a="pJump" data-d="-1" aria-label="Achter zurück">${I.prev}</button>
      <button class="round" data-a="pToggle" id="pToggle">▶︎</button>
      <button class="icon" data-a="pJump" data-d="1" aria-label="Achter vor">${I.next}</button>
    </div>
    <div class="row gap" style="justify-content:center">
      ${r.musicName ? '<button class="btn small" data-a="pRate" id="pRate">Tempo 100 %</button>' : ''}
      <button class="btn small" data-a="pRestart">Von vorne</button>
    </div>
  </div>
  ${r.musicName ? `<div class="card">
      <div class="title">Musik einmessen</div>
      <p class="hint" style="margin:6px 0 10px">Tippe bei laufender Musik genau auf dem ersten Count auf „Count 1 ist jetzt“.
      Für das Tempo tippst du 8-mal im Takt auf „Im Takt tippen“.</p>
      <div class="row gap"><button class="btn small" data-a="pSetOne">Count 1 ist jetzt</button>
      <button class="btn small" data-a="pTap" id="pTap">Im Takt tippen</button></div>
    </div>`
    : '<p class="hint">Ohne Musik zählt ein Metronom-Klick mit. Musik fügst du unter „Counts“ hinzu.</p>'}`;
}

// ---------- Abspielen ----------
let player = null;
let audioCtx = null;
function ctx() {
  if (!audioCtx) {
    // iPhone: Ton auch bei Stummschalter (Musik + Ansagen sollen in der Halle zu hören sein)
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* älteres iOS */ }
    const C = window.AudioContext || window.webkitAudioContext; if (C) audioCtx = new C();
  }
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}
function beep(freq = 880, dur = 0.08, vol = 0.25) {
  const c = ctx(); if (!c) return;
  const o = c.createOscillator(), g = c.createGain();
  o.frequency.value = freq; o.connect(g); g.connect(c.destination);
  const t = c.currentTime;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.start(t); o.stop(t + dur + 0.02);
}
// Englische Ansagen (audio/*.mp3, erzeugt mit Piper)
const VOICE = {};
let voiceLoading = null;
function loadVoice() {
  const c = ctx(); if (!c) return Promise.resolve();
  if (!voiceLoading) {
    voiceLoading = Promise.all(['1', '2', '3', '4', '5', '6', '7', '8', 'rest', 'go', 'ready', 'done'].map(n =>
      fetch(`audio/${n}.mp3`).then(r => r.arrayBuffer())
        .then(b => new Promise((res, rej) => c.decodeAudioData(b, res, rej)))
        .then(buf => { VOICE[n] = buf; }).catch(() => {})));
  }
  return voiceLoading;
}
function say(name, when) {
  const c = ctx(), buf = VOICE[name]; if (!c || !buf) return null;
  const src = c.createBufferSource(); src.buffer = buf; src.connect(c.destination);
  src.start(when || c.currentTime); return src;
}
// 8er-Zähler „One … Eight“ im eingestellten Tempo
const counter = {
  k: null,
  start(bpm, dur = 3600) {
    this.stop(); const c = ctx(); if (!c || !bpm) return;
    const spb = 60 / bpm, t0 = c.currentTime + 0.08;
    this.k = { spb, start: t0, next: t0, n: 0, end: t0 + dur - 0.1, srcs: [] };
    this.k.timer = setInterval(() => this.fill(), 50); this.fill();
  },
  fill() {
    const k = this.k, c = ctx(); if (!k) return;
    while (k.next < c.currentTime + 0.25 && k.next < k.end) {
      const src = say(String(k.n % 8 + 1), k.next); if (src) k.srcs.push(src);
      k.n++; k.next += k.spb;
    }
    if (k.srcs.length > 12) k.srcs.splice(0, k.srcs.length - 12);
  },
  stop() { const k = this.k; if (!k) return; clearInterval(k.timer); k.srcs.forEach(s => { try { s.stop(); } catch (e) { /* schon fertig */ } }); this.k = null; },
  idx() { const k = this.k; if (!k) return -1; const t = ctx().currentTime - k.start; return t < 0 ? -1 : Math.floor(t / k.spb) % 8; },
};
// Musik für Tabata: ein festes Audio-Element (iPhone erlaubt Abspielen nur nach Antippen),
// leiser gemischt, damit die Ansagen hörbar bleiben
const musicCache = {};
let tabAudio = null, musicGain = null;
function tabataAudio() {
  if (tabAudio) return tabAudio;
  tabAudio = new Audio(); tabAudio.loop = true; tabAudio.preload = 'auto';
  try {
    const c = ctx(); const src = c.createMediaElementSource(tabAudio);
    musicGain = c.createGain(); musicGain.gain.value = 0.55; src.connect(musicGain); musicGain.connect(c.destination);
  } catch (e) { /* dann eben volle Lautstärke */ }
  return tabAudio;
}
async function cacheMusic() {
  for (const p of db.me.plans) {
    if (p.musicId && !musicCache[p.musicId]) {
      try { const blob = await idb.get(p.musicId); if (blob) musicCache[p.musicId] = URL.createObjectURL(blob); } catch (e) { /* fehlt */ }
    }
  }
}
function playMusic(id, from0) {
  const a = tabataAudio(), url = id && musicCache[id];
  if (!url) { a.pause(); return; }
  if (a.dataset.id !== id) { a.src = url; a.dataset.id = id; from0 = true; }
  if (from0) { try { a.currentTime = 0; } catch (e) { /* noch nicht geladen */ } }
  a.play().catch(() => {});
}
function pauseMusic() { if (tabAudio) tabAudio.pause(); }
const musicInUse = id => db.routines.some(x => x.musicId === id) || db.me.plans.some(x => x.musicId === id);

let wakeLock = null;
async function keepAwake(on) {
  try {
    if (on && 'wakeLock' in navigator && !wakeLock) { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => { wakeLock = null; }); }
    if (!on && wakeLock) { await wakeLock.release(); wakeLock = null; }
  } catch (e) { /* nicht unterstützt */ }
}

async function initPlayer(r) {
  stopPlayer();
  player = { r, audio: null, url: null, playing: false, metroPos: 0, metroStart: 0, lastCount: null, lastEight: null, rate: 1, taps: [], raf: 0 };
  if (r.musicId) {
    try {
      const blob = await idb.get(r.musicId);
      if (blob && player && player.r === r) {
        player.url = URL.createObjectURL(blob);
        player.audio = new Audio(player.url);
        player.audio.preload = 'auto';
        player.audio.addEventListener('ended', () => { if (player) { player.playing = false; updateToggle(); keepAwake(false); } });
      }
    } catch (e) { toast('Musik konnte nicht geladen werden'); }
  }
  paint();
}
function stopPlayer() {
  if (!player) return;
  cancelAnimationFrame(player.raf);
  if (player.audio) { player.audio.pause(); player.audio.src = ''; }
  if (player.url) URL.revokeObjectURL(player.url);
  player = null; keepAwake(false);
}
function pos() {
  if (!player) return 0;
  if (player.audio) return player.audio.currentTime;
  return player.playing ? player.metroPos + (performance.now() - player.metroStart) / 1000 : player.metroPos;
}
function setPos(t) {
  t = Math.max(0, t);
  if (player.audio) player.audio.currentTime = t;
  else { player.metroPos = t; player.metroStart = performance.now(); }
  player.lastCount = null; paint();
}
function updateToggle() { const b = $('#pToggle'); if (b && player) b.textContent = player.playing ? '❚❚' : '▶︎'; }
function togglePlay() {
  if (!player) return;
  ctx();
  if (player.playing) {
    if (player.audio) player.audio.pause(); else player.metroPos = pos();
    player.playing = false; keepAwake(false);
  } else {
    if (player.audio) { player.audio.playbackRate = player.rate; player.audio.play().catch(() => toast('Musik startet nicht – Lautlos-Schalter?')); }
    else player.metroStart = performance.now();
    player.playing = true; keepAwake(true); loop();
  }
  updateToggle();
}
function loop() {
  if (!player || !player.playing) return;
  paint();
  player.raf = requestAnimationFrame(loop);
}
function paint() {
  if (!player || !$('#pBeat')) return;
  const r = player.r, t = pos(), off = r.offset || 0, spb = 60 / (r.bpm || 144);
  const total = off + routineDuration(r);
  const bar = $('#pBar'); if (bar) bar.style.width = clamp(t / total * 100, 0, 100) + '%';
  $('#pTime').textContent = `${fmtTime(t)} / ${fmtTime(total)}`;
  const beatEl = $('#pBeat');
  let count = Math.floor((t - off) / spb + 1e-6);
  if (t < off) {
    beatEl.className = 'pBeat wait';
    beatEl.textContent = player.playing ? `gleich… ${Math.ceil(off - t)}` : 'Bereit?';
    $('#pEight').textContent = '1. Achter'; $('#pText').textContent = countText(r.eights[0], 0);
    $('#pNext').textContent = ''; setSec(r.eights[0]); drawMiniMat(0);
    return;
  }
  const ei = Math.floor(count / 8);
  if (ei >= r.eights.length) {
    beatEl.className = 'pBeat wait'; beatEl.textContent = 'Ende ✨';
    $('#pText').textContent = ''; $('#pNext').textContent = '';
    if (!player.audio && player.playing) togglePlay();
    return;
  }
  const k = count % 8, e = r.eights[ei];
  if (count !== player.lastCount) {
    player.lastCount = count;
    beatEl.className = 'pBeat'; void beatEl.offsetWidth; beatEl.className = 'pBeat pop' + (k === 0 ? ' one' : '');
    const pc = $('.play'); if (pc && k === 0 && player.playing) { pc.classList.remove('flash'); void pc.offsetWidth; pc.classList.add('flash'); }
    if (!player.audio && player.playing) beep(k === 0 ? 1320 : 880, 0.05, k === 0 ? 0.3 : 0.18);
  }
  if (beatEl.classList.contains('wait')) beatEl.className = 'pBeat'; beatEl.textContent = k + 1;
  $('#pEight').textContent = `${ei + 1}. Achter`;
  $('#pText').textContent = countText(e, k) || (k === 0 ? e.note : '') || '';
  let next = '';
  for (let j = count + 1; j < count + 8; j++) {
    const ne = r.eights[Math.floor(j / 8)]; if (!ne) break;
    const nt = countText(ne, j % 8); if (nt) { next = `Gleich (${j % 8 + 1}): ${nt}`; break; }
  }
  $('#pNext').textContent = next;
  setSec(e); drawMiniMat(ei);
}
function setSec(e) { const s = $('#pSec'), sec = SECTIONS[e.section]; s.textContent = sec.label; s.style.background = sec.color; }
function drawMiniMat(ei) {
  const m = $('#pMat'); if (!m || player.lastEight === ei) return;
  player.lastEight = ei;
  m.innerHTML = matHTML(effectiveFormation(player.r, ei).pos, 'mini');
}
function tapTempo() {
  const now = performance.now(), taps = player.taps;
  if (taps.length && now - taps[taps.length - 1] > 2000) taps.length = 0;
  taps.push(now); if (taps.length > 12) taps.shift();
  const b = $('#pTap');
  if (taps.length < 4) { b.textContent = `Weiter tippen… (${taps.length})`; return; }
  const bpm = Math.round(60000 * (taps.length - 1) / (taps[taps.length - 1] - taps[0]) / (player.rate || 1));
  if (bpm >= 60 && bpm <= 220) { player.r.bpm = bpm; save(); b.textContent = `Tempo: ${bpm} ✓`; player.lastCount = null; }
}

// ---------- Ansicht: Training ----------
// Wunsch Nov. 2026: Die Zeit ist bei jedem Baustein frei einstellbar – auch mit Plan (z. B. 15 Min Tabata).
// Der Plan läuft dann so oft hintereinander, bis die eingestellte Zeit voll ist.
function blockMinutes(b) { return Math.max(1, Number(b.minutes) || 1); }
function planFill(p, totalSec) {
  const one = planSteps(p), oneSec = one.reduce((a, st) => a + st.seconds, 0);
  const avail = Math.max(5, totalSec - 10); // 10 Sek. „Mach dich bereit“
  const passes = Math.max(1, Math.ceil(avail / oneSec - 0.05));
  const rest = Math.max(0, Number(p.rest) || 0);
  const steps = [];
  for (let n = 0; n < passes; n++) {
    if (n > 0 && rest) steps.push({ pass: n, title: 'Pause', kind: 'rest', seconds: rest, music: p.musicId || null, voice: p.count !== false, tag: 'Durchatmen', color: '#2fa564', note: 'Gleich: ' + one[0].title });
    planSteps(p).forEach(st => {
      st.pass = n; steps.push(st);
    });
  }
  // auf die eingestellte Zeit kürzen (letzte Übung wird ggf. verkürzt, keine Pause am Ende)
  let t = 0; const out = [];
  for (const st of steps) {
    if (t >= avail) break;
    const sec = Math.min(st.seconds, Math.round(avail - t));
    if (sec < 5) break;
    out.push({ ...st, seconds: sec }); t += sec;
  }
  while (out.length > 1 && out[out.length - 1].kind === 'rest') out.pop();
  const used = out.length ? out[out.length - 1].pass + 1 : 1;
  if (used > 1) out.forEach(st => { if (st.kind === 'work') st.tag = [st.tag === 'Los!' ? '' : st.tag, `Durchgang ${st.pass + 1}/${used}`].filter(Boolean).join(' · '); });
  return { steps: out, passes: used, oneSec };
}
function planHint(b) {
  const p = b.planId && plan(b.planId); if (!p || !p.exercises.length) return '';
  const f = planFill(p, blockMinutes(b) * 60), one = fmtTime(f.oneSec);
  return f.passes > 1 ? `„${esc(p.name)}“ dauert ${one} Min und läuft ${f.passes}× hintereinander.`
    : f.oneSec + 10 > blockMinutes(b) * 60 ? `„${esc(p.name)}“ dauert ${one} Min – wird nach ${blockMinutes(b)} Min beendet.`
    : `„${esc(p.name)}“ dauert ${one} Min.`;
}
function sessionMinutes(s) { return s.blocks.reduce((a, b) => a + blockMinutes(b), 0); }
function vTraining() {
  const t = today();
  const sorted = [...db.sessions].sort((a, b) => (a.date < b.date ? 1 : -1));
  const up = sorted.filter(s => s.date >= t).reverse(), past = sorted.filter(s => s.date < t);
  const item = s => `<button class="card" data-a="openSession" data-id="${s.id}"><div class="row">
      <div class="grow"><div class="title">${esc(s.title || 'Training')}</div>
      <div class="sub">${fmtDate(s.date)} · ${s.blocks.length} Bausteine · ${sessionMinutes(s)} Min${attSummary(s)}${teamChip(s.teamId)}</div></div>
      <span class="chev">›</span></div></button>`;
  return `<h2>Geplant</h2>
    ${up.map(item).join('') || empty('Nichts geplant', 'Plane dein nächstes Training aus Bausteinen wie Aufwärmen, Stunts und Dehnen.', 'stopwatch')}
    <button class="btn primary block" data-a="newSession">+ Training planen</button>
    <h2>Tabata & Übungspläne</h2>
    ${planCards() || '<p class="hint">Noch keine Pläne.</p>'}
    <button class="btn block" data-a="newPlan">+ Neuer Plan</button>
    <p class="hint">Tipp: Im Training kannst du einem Baustein einen Plan zuordnen, z. B. Tabata beim Aufwärmen. Dann läuft er dort mit Musik.</p>
    ${past.length ? `<h2>Vergangen</h2>${past.map(item).join('')}` : ''}`;
}
function attSummary(s) {
  const keys = Object.keys(s.attendance || {}).filter(id => athlete(id));
  if (!keys.length) return '';
  return ` · ${keys.filter(id => s.attendance[id]).length}/${keys.length} da`;
}
function blockOptions(sel) { return Object.entries(BLOCKS).map(([k, b]) => `<option value="${k}" ${k === sel ? 'selected' : ''}>${b.label}</option>`).join(''); }

function vSession(s) {
  const blocks = s.blocks.map((b, i) => `
    <div class="card tblock" style="border-left-color:${BLOCKS[b.type]?.color}">
      <div class="bh">
        <select data-in="bType" data-id="${b.id}">${blockOptions(b.type)}</select>
        <input class="min" data-in="bMin" data-id="${b.id}" type="number" inputmode="numeric" min="1" value="${blockMinutes(b)}" aria-label="Minuten">
        <span class="sub" style="margin:0">Min</span>
      </div>
      ${db.me.plans.length ? `<select data-in="bPlan" data-id="${b.id}" style="margin-top:8px">
        <option value="">Ohne Plan (nur Timer)</option>
        ${db.me.plans.map(p => `<option value="${p.id}" ${p.id === b.planId ? 'selected' : ''}>Plan: ${esc(p.name)}</option>`).join('')}</select>` : ''}
      <p class="hint" data-hint="${b.id}" style="margin:6px 0 0">${planHint(b)}</p>
      <input data-in="bNote" data-id="${b.id}" value="${esc(b.note)}" placeholder="Was genau? z. B. Extensions, Full Downs" style="margin-top:8px">
      <div class="tools" style="display:flex;gap:6px;justify-content:flex-end;margin-top:8px">
        <button class="icon" data-a="bUp" data-i="${i}" ${i === 0 ? 'disabled' : ''}>↑</button>
        <button class="icon" data-a="bDown" data-i="${i}" ${i === s.blocks.length - 1 ? 'disabled' : ''}>↓</button>
        <button class="icon" data-a="bDel" data-i="${i}">✕</button>
      </div>
    </div>`).join('');
  const att = teamAthletes(s.teamId).map(a => {
    const v = (s.attendance || {})[a.id];
    return `<button class="${v === true ? 'yes' : v === false ? 'no' : ''}" data-a="att" data-aid="${a.id}">${esc(a.name)}</button>`;
  }).join('');
  return `
    <div class="card">
      <label class="f" style="margin-top:0">Titel</label>
      <input data-in="sTitle" value="${esc(s.title)}" placeholder="z. B. Stunt-Training">
      ${teamSelect('sTeam', s.teamId)}
      <label class="f">Datum</label>
      <input data-in="sDate" type="date" value="${s.date}">
    </div>
    <h2>Ablauf · <span id="sTotal">${sessionMinutes(s)}</span> Min</h2>
    ${blocks || empty('Noch leer', 'Füge Bausteine hinzu.')}
    <button class="btn block" data-a="bAdd">+ Baustein</button>
    <button class="btn primary block" data-a="sRun" ${s.blocks.length ? '' : 'disabled'}>▶︎ Training starten (Timer)</button>
    <h2>Anwesenheit</h2>
    <div class="card">${att ? `<div class="att">${att}</div><p class="hint" style="margin:10px 0 0">Antippen: einmal = da, zweimal = fehlt, dreimal = offen.</p>`
      : '<p class="hint" style="margin:0">Lege unter „Team“ deine Sportlerinnen an, dann kannst du hier abhaken, wer da war.</p>'}</div>
    <h2>Notizen nach dem Training</h2>
    <div class="card"><textarea data-in="sNotes" placeholder="Was lief gut? Was müssen wir nächstes Mal üben?">${esc(s.notes)}</textarea></div>
    <div class="row gap" style="margin-top:20px">
      <button class="btn small" data-a="sDup">Als neues Training kopieren</button>
      <button class="btn small danger" data-a="sDel">Löschen</button>
    </div>`;
}

// ---------- Ansicht: Team ----------
function vTeam() {
  const f = state.teamFilter && team(state.teamFilter) ? state.teamFilter : null;
  const stats = id => {
    const rec = db.sessions.filter(s => s.attendance && s.attendance[id] !== undefined);
    return rec.length ? `${rec.filter(s => s.attendance[id]).length} von ${rec.length} Trainings da` : 'noch keine Anwesenheit';
  };
  const roleOpts = sel => Object.keys(ROLES).map(r => `<option ${r === sel ? 'selected' : ''}>${r}</option>`).join('');
  const teamOpts = sel => `<option value="">kein Team</option>` + db.teams.map(t => `<option value="${t.id}" ${t.id === sel ? 'selected' : ''}>${esc(t.name)}</option>`).join('');
  const people = f ? db.athletes.filter(a => a.teamId === f) : db.athletes;
  const chips = `<div class="teamchips">
    <button class="${f ? '' : 'on'}" data-a="tSel" data-id="">Alle · ${db.athletes.length}</button>
    ${db.teams.map(t => `<button class="${f === t.id ? 'on' : ''}" data-a="tSel" data-id="${t.id}"><i style="background:${t.color}"></i>${esc(t.name)} · ${db.athletes.filter(a => a.teamId === t.id).length}</button>`).join('')}
  </div>`;
  const sugg = TEAM_SUGGEST.filter(n => !db.teams.some(t => t.name.toLowerCase() === n.toLowerCase()));
  const list = people.map(a => `
    <div class="card"><div class="row">
      <div class="dot" style="position:static;margin:0;background:${roleColor(a.role)};flex:none">${esc(initials(a.name))}</div>
      <div class="grow">
        <input data-in="aName" data-id="${a.id}" value="${esc(a.name)}" style="padding:6px 8px;font-weight:600">
        <div class="sub">${stats(a.id)}</div>
      </div>
      <button class="icon" data-a="aDel" data-id="${a.id}" aria-label="entfernen">✕</button>
    </div>
    <div class="row" style="margin-top:8px">
      <select data-in="aRole" data-id="${a.id}" style="padding:7px">${roleOpts(a.role)}</select>
      ${db.teams.length ? `<select data-in="aTeam" data-id="${a.id}" style="padding:7px">${teamOpts(a.teamId)}</select>` : ''}
    </div></div>`).join('');
  const t = f && team(f);
  return `<h2>Teams</h2>${chips}
    ${t ? '' : `<div class="card">
      <div class="row"><input id="newTeam" placeholder="Neues Team, z. B. Sassys" autocomplete="off" enterkeyhint="done"><button class="btn" data-a="tAdd">+</button></div>
      ${sugg.length ? `<div class="sugg"><span>Schnell hinzufügen:</span>${sugg.map(n => `<button data-a="tQuick" data-n="${n}">+ ${n}</button>`).join('')}</div>` : ''}
    </div>`}
    <h2>${t ? esc(t.name) : 'Alle Sportlerinnen'} · ${people.length}</h2>
    ${list || empty('Noch niemand hier', 'Trage deine Sportlerinnen ein. Ein Vorname oder Spitzname reicht.', 'pompoms')}
    <div class="card"><div class="row">
      <input id="newAthlete" placeholder="Name" autocomplete="off" enterkeyhint="done">
      <select id="newRole" style="width:auto">${roleOpts('Base')}</select>
    </div><button class="btn primary block" data-a="aAdd">+ Hinzufügen${t ? ' zu ' + esc(t.name) : ''}</button></div>
    ${t ? `<h2>Team bearbeiten</h2><div class="card">
      <label class="f" style="margin-top:0">Name</label><input data-in="tName" data-id="${t.id}" value="${esc(t.name)}">
      <label class="f">Farbe</label>
      <div class="colors">${TEAM_COLORS.map(c => `<button class="${t.color === c ? 'on' : ''}" style="background:${c}" data-a="tColor" data-c="${c}" aria-label="Farbe wählen"></button>`).join('')}</div>
      <button class="btn small danger" data-a="tDel" style="margin-top:14px">Team löschen</button></div>` : ''}
    <p class="hint">Die Namen bleiben nur auf diesem iPhone gespeichert.</p>`;
}

// ---------- Ansicht: Ich (Flyer) ----------
function planSteps(p) {
  const rounds = clamp(Number(p.rounds) || 1, 1, 20), rest = Math.max(0, Number(p.rest) || 0), voice = p.count !== false;
  const work = [];
  p.exercises.forEach(e => {
    const sec = Math.max(5, Number(e.seconds) || 20), name = e.name || 'Übung';
    if (e.sides) work.push({ title: name, side: 'Links', seconds: sec }, { title: name, side: 'Rechts', seconds: sec });
    else work.push({ title: name, seconds: sec });
  });
  const steps = [];
  for (let r = 0; r < rounds; r++) {
    work.forEach((w, i) => {
      steps.push({
        title: w.title, kind: 'work', seconds: w.seconds, music: p.musicId || null, voice, bpm: voice ? (p.bpm || 120) : 0,
        tag: [w.side, rounds > 1 ? `Runde ${r + 1}/${rounds}` : ''].filter(Boolean).join(' · ') || 'Los!',
        color: w.side === 'Rechts' ? '#7b3fe4' : '#e2337f',
      });
      const last = r === rounds - 1 && i === work.length - 1;
      if (rest && !last) {
        const nx = work[(i + 1) % work.length];
        steps.push({ title: 'Pause', kind: 'rest', seconds: rest, music: p.musicId || null, voice, tag: 'Durchatmen', color: '#2fa564',
          note: 'Gleich: ' + nx.title + (nx.side ? ` (${nx.side})` : '') });
      }
    });
  }
  return steps;
}
const planSeconds = p => planSteps(p).reduce((a, st) => a + st.seconds, 0);
function planCards() {
  return db.me.plans.map(p => `
    <div class="card"><div class="row">
      <button class="grow" data-a="openPlan" data-id="${p.id}" style="border:0;background:none;text-align:left;padding:0;cursor:pointer">
        <div class="title">${esc(p.name)}</div><div class="sub">${p.exercises.length} Übungen${p.rest ? ` · ${Math.max(5, ...p.exercises.map(e => Number(e.seconds) || 20))}/${p.rest} Sek.` : ''}${p.rounds > 1 ? ` · ${p.rounds} Runden` : ''} · ${fmtTime(planSeconds(p))} Min${p.musicName ? ' · ♪' : ''}</div></button>
      <button class="btn small primary" data-a="runPlan" data-id="${p.id}" ${p.exercises.length ? '' : 'disabled'}>▶︎ Start</button>
    </div></div>`).join('');
}
function vMe() {
  const plans = planCards();
  const sk = db.me.skills, done = sk.filter(s => s.status === 2).length;
  const cats = [...new Set(sk.map(s => s.cat))];
  const skills = cats.map(c => `<div class="card"><div class="title">${esc(c)}</div>
    ${sk.filter(s => s.cat === c).map(s => `<div class="skill">
      <div class="grow">${esc(s.name)}${s.status === 2 && s.date ? `<div class="sub">seit ${fmtDate(s.date)}</div>` : ''}</div>
      ${state.editSkills ? `<button class="icon" data-a="skDel" data-id="${s.id}">✕</button>`
        : `<button class="pill s${s.status}" data-a="skCycle" data-id="${s.id}">${SKILL_STATUS[s.status]}</button>`}
    </div>`).join('')}</div>`).join('');
  const diary = [...db.me.diary].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 30).map(d => `
    <div class="card"><div class="row"><div class="grow"><div class="sub" style="margin:0">${fmtDate(d.date)}</div></div>
      <span style="font-size:22px">${MOODS[d.mood] || ''}</span>
      <button class="icon" data-a="dDel" data-id="${d.id}">✕</button></div>
      <div style="white-space:pre-wrap;margin-top:6px">${esc(d.text)}</div></div>`).join('');
  return `
    <h2>Tabata & Übungspläne</h2>
    ${plans}
    <button class="btn block" data-a="newPlan">+ Neuer Plan</button>
    <h2>Meine Skills · ${done} von ${sk.length}</h2>
    <div class="prog"><div style="width:${sk.length ? done / sk.length * 100 : 0}%"></div></div>
    <p class="hint">Antippen wechselt: Ziel → Übe ich → Sitzt ✓</p>
    ${skills}
    <div class="card" ${state.editSkills ? '' : 'hidden'}>
      <input id="newSkill" placeholder="Neuer Skill, z. B. Rewind" autocomplete="off">
      <select id="newSkillCat" style="margin-top:8px">${[...new Set([...cats, 'Stunts', 'Beweglichkeit', 'Sprünge', 'Tumbling'])].map(c => `<option>${esc(c)}</option>`).join('')}</select>
      <button class="btn primary block" data-a="skAdd">+ Skill hinzufügen</button>
    </div>
    <button class="btn small" data-a="skEdit">${state.editSkills ? 'Fertig' : 'Skills bearbeiten'}</button>
    <h2>Trainingstagebuch</h2>
    <div class="card">
      <div class="row"><input id="dDate" type="date" value="${today()}" style="width:auto">
        <div class="row" style="gap:2px" id="dMood">${MOODS.map((m, i) => `<button class="icon" data-a="dMood" data-m="${i}" style="background:${i === 3 ? '#dbe4fb' : '#edf0f7'}">${m}</button>`).join('')}</div></div>
      <textarea id="dText" placeholder="Wie lief das Training? Was hat geklappt?" style="margin-top:8px"></textarea>
      <button class="btn primary block" data-a="dAdd">Eintrag speichern</button>
    </div>
    ${diary}
    <h2>Einstellungen</h2>
    <div class="card"><label class="f" style="margin-top:0">Dein Name (für die Begrüßung)</label>
      <input data-in="profName" value="${esc(db.profile.name)}" placeholder="Vorname" autocomplete="given-name"></div>
    <h2>Sicherung</h2>
    <div class="card">
      <p class="hint" style="margin:0 0 10px">Alle Daten liegen nur auf diesem iPhone. Speichere ab und zu eine Sicherung, z. B. in iCloud Drive.
      Musikdateien sind nicht enthalten.</p>
      <div class="row gap"><button class="btn small primary" data-a="export">Sicherung speichern</button>
      <button class="btn small" data-a="import">Sicherung laden</button></div>
    </div>
    <p class="hint" style="text-align:center;margin-top:24px">CheerPlan · Athletics Cheer Unit · mit ♥ gemacht<br>Version ${APP_VERSION}</p>`;
}
let diaryMood = 3;

function vPlan(p) {
  const ex = p.exercises.map((e, i) => `
    <div class="card">
      <input data-in="xName" data-id="${e.id}" value="${esc(e.name)}" placeholder="Übung" style="font-weight:600">
      <div class="row" style="margin-top:8px">
        <input data-in="xSec" data-id="${e.id}" type="number" inputmode="numeric" min="5" value="${e.seconds}" style="width:80px;text-align:center">
        <span class="sub" style="margin:0">Sek.</span>
        <label class="row grow" style="gap:6px;font-size:14px;justify-content:flex-end"><input type="checkbox" data-in="xSides" data-id="${e.id}" ${e.sides ? 'checked' : ''} style="width:20px;height:20px">links + rechts</label>
      </div>
      <div style="display:flex;gap:6px;justify-content:flex-end;margin-top:8px">
        <button class="icon" data-a="xUp" data-i="${i}" ${i === 0 ? 'disabled' : ''}>↑</button>
        <button class="icon" data-a="xDown" data-i="${i}" ${i === p.exercises.length - 1 ? 'disabled' : ''}>↓</button>
        <button class="icon" data-a="xDel" data-i="${i}">✕</button>
      </div>
    </div>`).join('');
  return `<div class="card"><label class="f" style="margin-top:0">Name des Plans</label><input data-in="pName" value="${esc(p.name)}"></div>
    <h2>Ablauf & Musik</h2>
    <div class="card">
      <div class="grid2">
        <div><label class="f" style="margin-top:0">Pause nach jeder Übung (Sek., 0 = keine)</label><input data-in="pRest" type="number" inputmode="numeric" min="0" value="${p.rest}"></div>
        <div><label class="f" style="margin-top:0">Runden</label><input data-in="pRounds" type="number" inputmode="numeric" min="1" max="20" value="${p.rounds}"></div>
      </div>
      <label class="f">Musik</label>
      <div class="row">
        <div class="grow sub" style="margin:0">${p.musicName ? '♪ ' + esc(p.musicName) : 'Keine Musik'}</div>
        <button class="btn small" data-a="pickPlanMusic">${p.musicName ? 'Ändern' : 'Hinzufügen'}</button>
        ${p.musicName ? '<button class="icon" data-a="delPlanMusic" aria-label="Musik entfernen">✕</button>' : ''}
      </div>
      <label class="row" style="gap:8px;margin-top:14px;font-weight:600"><input type="checkbox" data-in="pCount" ${p.count !== false ? 'checked' : ''} style="width:22px;height:22px">Auf Englisch mitzählen (One … Eight)</label>
      <div class="row" style="margin-top:10px">
        <div class="grow"><label class="f" style="margin-top:0">Zähl-Tempo (Schläge pro Minute)</label>
          <input data-in="pBpm" id="pBpm" type="number" inputmode="numeric" min="60" max="180" value="${p.bpm}"></div>
      </div>
      <div class="row gap" style="margin-top:10px">
        <button class="btn small primary" data-a="pPreview" id="pPreview">▶︎ Probehören</button>
        <button class="btn small" data-a="pTapPlan" id="pTapPlan">Im Takt tippen</button>
      </div>
      <p class="hint" style="margin:8px 0 0">Starte „Probehören“ und tippe 8-mal im Takt der Musik auf „Im Takt tippen“. Dann zählt die Stimme passend zur Musik.</p>
    </div>
    <h2>Übungen · <span id="pTotal">${fmtTime(planSeconds(p))}</span> Min</h2>
    ${ex || empty('Noch keine Übungen', 'Füge die erste Übung hinzu.')}
    <button class="btn block" data-a="xAdd">+ Übung</button>
    <button class="btn primary block" data-a="runPlan" data-id="${p.id}" ${p.exercises.length ? '' : 'disabled'}>▶︎ Plan starten</button>
    <button class="btn small danger" data-a="pDel" style="margin-top:24px">Plan löschen</button>`;
}

// ---------- Timer (Training und Übungspläne) ----------
let runner = null;
function startRunner(title, steps) {
  if (!steps.length) return;
  ctx();
  stopPreview(); loadVoice();
  runner = { title, steps, i: 0, left: steps[0].seconds, endAt: Date.now() + steps[0].seconds * 1000, running: true, lastWhole: null, iv: 0, raf: 0, musicId: null };
  runner.iv = setInterval(tick, 200);
  keepAwake(true);
  $('#overlay').hidden = false; drawRunner(); enterStep(true);
  countLoop();
}
function enterStep(cue) {
  counter.stop();
  const s = runner.steps[runner.i];
  if (cue && s.voice) say(s.kind === 'work' ? 'go' : s.kind === 'rest' ? 'rest' : 'ready');
  if (s.music !== runner.musicId) { runner.musicId = s.music; if (s.music) playMusic(s.music, true); else pauseMusic(); }
  else if (s.music && runner.running) playMusic(s.music);
  if (musicGain) musicGain.gain.value = s.voice ? 0.55 : 1;
  if (runner.running && s.kind === 'work' && s.bpm) {
    const wait = cue && s.voice ? 0.75 : 0;
    setTimeout(() => { if (runner && runner.running && runner.steps[runner.i] === s) counter.start(s.bpm, runnerLeft()); }, wait * 1000);
  }
}
function countLoop() {
  if (!runner) return;
  const el = $('#cdots');
  if (el) { const idx = counter.idx(); [...el.children].forEach((d, i) => d.classList.toggle('on', i === idx)); }
  runner.raf = requestAnimationFrame(countLoop);
}
function runnerLeft() { return runner.running ? (runner.endAt - Date.now()) / 1000 : runner.left; }
function tick() {
  if (!runner || !runner.running) return;
  const left = runnerLeft(), whole = Math.ceil(left);
  const cur = runner.steps[runner.i], nx = runner.steps[runner.i + 1];
  if (whole !== runner.lastWhole && whole <= 3 && whole > 0 && !(cur.kind === 'work' && cur.bpm)) beep(660, 0.09, 0.2);
  runner.lastWhole = whole;
  if (left <= 0) { if (!(nx ? nx.voice : cur.voice)) beep(1046, 0.35, 0.3); stepTo(runner.i + 1, true); return; }
  updRunner();
}
function stepTo(i, cue = false) {
  if (i >= runner.steps.length) {
    counter.stop(); pauseMusic();
    if (runner.steps[runner.steps.length - 1].voice) say('done');
    runner.done = true; runner.running = false; drawRunner(); confetti(120); return;
  }
  runner.i = Math.max(0, i);
  runner.left = runner.steps[runner.i].seconds;
  runner.endAt = Date.now() + runner.left * 1000;
  runner.lastWhole = null; drawRunner(); enterStep(cue);
}
function closeRunner() {
  if (!runner) return;
  clearInterval(runner.iv); cancelAnimationFrame(runner.raf); counter.stop(); pauseMusic();
  runner = null; $('#overlay').hidden = true; keepAwake(false);
}
function drawRunner() {
  const o = $('#overlay');
  if (runner.done) {
    o.innerHTML = `<div class="rTop"><span>${esc(runner.title)}</span><span></span></div>
      <div class="rMain"><div style="font-size:64px">🎉</div><div class="rStep">Geschafft!</div>
      <div class="rNote">${runner.steps.length} Abschnitte · ${fmtTime(runner.steps.reduce((a, s) => a + s.seconds, 0))} Min</div></div>
      <button class="btn primary block" data-a="rClose">Fertig</button>`;
    keepAwake(false); return;
  }
  const s = runner.steps[runner.i], n = runner.steps[runner.i + 1];
  o.innerHTML = `<div class="rTop"><span>${esc(runner.title)} · ${runner.i + 1}/${runner.steps.length}</span><button data-a="rClose">Beenden</button></div>
    <div class="rMain">
      ${s.tag ? `<div><span class="chip" style="background:${s.color || '#ffffff33'}">${esc(s.tag)}</span></div>` : ''}
      <div class="rStep" style="margin-top:10px">${esc(s.title)}</div>
      ${s.note ? `<div class="rNote">${esc(s.note)}</div>` : ''}
      <div class="rClock" id="rClock"></div>
      ${s.kind === 'work' && s.bpm ? `<div class="cdots" id="cdots">${[1, 2, 3, 4, 5, 6, 7, 8].map(n => `<span>${n}</span>`).join('')}</div>` : ''}
      <div class="rBar"><div id="rBar"></div></div>
      <div class="rNext">${n ? 'Danach: ' + esc(n.title) : 'Letzter Abschnitt'}</div>
    </div>
    <div class="rCtl">
      <button class="icon" data-a="rPrev" aria-label="zurück">${I.prev}</button>
      <button class="round" data-a="rToggle" id="rToggle">${runner.running ? '❚❚' : '▶︎'}</button>
      <button class="icon" data-a="rNext" aria-label="weiter">${I.next}</button>
    </div>`;
  updRunner();
}
function updRunner() {
  const c = $('#rClock'); if (!c) return;
  const left = Math.max(0, runnerLeft()), s = runner.steps[runner.i];
  c.textContent = fmtTime(Math.ceil(left)); c.classList.toggle('low', left <= 5);
  $('#rBar').style.width = (100 - left / s.seconds * 100) + '%';
}
const prepStep = p => ({ title: p.name, note: 'Mach dich bereit', seconds: 10, kind: 'prep', tag: 'Gleich geht’s los', music: p.musicId || null, voice: p.count !== false });
function runSession(s) {
  const steps = s.blocks.flatMap(b => {
    const p = b.planId && plan(b.planId);
    if (p && p.exercises.length) return [prepStep(p), ...planFill(p, blockMinutes(b) * 60).steps];
    return [{ title: b.note || BLOCKS[b.type].label, tag: BLOCKS[b.type].label, color: BLOCKS[b.type].color,
      seconds: Math.max(1, Number(b.minutes) || 1) * 60 }];
  });
  startRunner(s.title || 'Training', steps);
}
function runPlan(p) { startRunner(p.name, [prepStep(p), ...planSteps(p)]); }

// Probehören im Plan-Editor
let preview = null;
function stopPreview() {
  if (!preview) return;
  preview = null; counter.stop(); pauseMusic();
  const b = $('#pPreview'); if (b) b.textContent = '▶︎ Probehören';
}
async function startPreview(p) {
  ctx(); preview = { p, taps: [] };
  $('#pPreview').textContent = '❚❚ Stopp';
  if (p.musicId) { if (!musicCache[p.musicId]) await cacheMusic(); if (musicGain) musicGain.gain.value = p.count !== false ? 0.55 : 1; playMusic(p.musicId, true); }
  await loadVoice();
  if (preview && p.count !== false) counter.start(p.bpm || 120);
}

// ---------- Sicherung ----------
async function exportData() {
  const name = `CheerPlan-Sicherung-${today()}.json`;
  const json = JSON.stringify({ app: 'cheerplan', exported: new Date().toISOString(), data: db });
  const file = new File([json], name, { type: 'application/json' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: 'CheerPlan-Sicherung' }); return; }
    catch (e) { if (e.name === 'AbortError') return; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file); a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
}
async function importData(file) {
  try {
    const obj = JSON.parse(await file.text());
    if (obj.app !== 'cheerplan' || !obj.data || obj.data.v !== 1) throw new Error('falsch');
    if (!confirm('Sicherung laden? Die aktuellen Daten in der App werden dabei ersetzt.')) return;
    db = upgrade(obj.data); save(); state.stack = []; state.view = 'me'; render();
    toast('Sicherung geladen ✓');
  } catch (e) { toast('Das ist keine gültige CheerPlan-Sicherung.', 3500); }
}

// ---------- Klicks ----------
function move(arr, i, d) { const j = i + d; if (j < 0 || j >= arr.length) return; [arr[i], arr[j]] = [arr[j], arr[i]]; }

function addTeam(name) {
  const t = { id: uid(), name, color: TEAM_COLORS[db.teams.length % TEAM_COLORS.length] };
  db.teams.push(t); state.teamFilter = t.id; save(); render(); toast(`Team ${name} angelegt`);
}

const actions = {
  back, tab: el => tabTo(el.dataset.v),
  // Routinen
  newRoutine() {
    const r = { id: uid(), name: 'Neue Routine', bpm: 144, offset: 0, musicId: null, musicName: '', eights: [newEight('dance')] };
    db.routines.unshift(r); save(); go('routine', r.id);
  },
  openRoutine: el => go('routine', el.dataset.id),
  rTab(el) { stopPlayer(); state.tab = el.dataset.t; render(); },
  eAdd() { const r = routine(state.id), last = r.eights[r.eights.length - 1]; r.eights.push(newEight(last ? last.section : 'dance')); save(); render(); window.scrollTo(0, document.body.scrollHeight); },
  eUp(el) { const r = routine(state.id); move(r.eights, +el.dataset.i, -1); save(); render(); },
  eDown(el) { const r = routine(state.id); move(r.eights, +el.dataset.i, 1); save(); render(); },
  eDup(el) { const r = routine(state.id), i = +el.dataset.i, c = clone(r.eights[i]); c.id = uid(); (c.groups || []).forEach(g => { g.id = uid(); }); r.eights.splice(i + 1, 0, c); save(); render(); },
  eDel(el) {
    const r = routine(state.id), i = +el.dataset.i, e = r.eights[i];
    if ((eightRows(e).some(g => g.counts.some(Boolean)) || e.note) && !confirm(`${i + 1}. Achter löschen?`)) return;
    r.eights.splice(i, 1); save(); render();
  },
  gAdd(el) {
    const r = routine(state.id), e = r.eights[+el.dataset.i]; e.groups = e.groups || [];
    e.groups.push(newGroup()); save(); const y = window.scrollY; render(); window.scrollTo(0, y);
    const ins = document.querySelectorAll(`[data-eid="${e.id}"] .grp .gh input`); if (ins.length) ins[ins.length - 1].focus();
  },
  gDel(el) {
    const r = routine(state.id), e = r.eights[+el.dataset.i], g = e.groups[+el.dataset.g];
    if ((g.counts.some(Boolean) || g.name) && !confirm(`Gruppe ${g.name ? '„' + g.name + '“ ' : ''}aus diesem Achter entfernen?`)) return;
    e.groups.splice(+el.dataset.g, 1); save(); const y = window.scrollY; render(); window.scrollTo(0, y);
  },
  eFormation(el) { state.tab = 'formation'; state.eightIdx = +el.dataset.i; render(); window.scrollTo(0, 0); },
  rDup() { const r = clone(routine(state.id)); r.id = uid(); r.name += ' (Kopie)'; r.eights.forEach(e => { e.id = uid(); }); db.routines.unshift(r); save(); state.stack.pop(); go('routine', r.id); },
  async rDel() {
    const r = routine(state.id); if (!confirm(`Routine „${r.name}“ wirklich löschen?`)) return;
    db.routines = db.routines.filter(x => x !== r); save();
    if (r.musicId && !musicInUse(r.musicId)) idb.del(r.musicId).catch(() => {});
    back();
  },
  pickMusic() { musicTarget = 'routine'; $('#musicInput').click(); },
  delMusic() {
    const r = routine(state.id); if (!confirm('Musik aus dieser Routine entfernen?')) return;
    const old = r.musicId; r.musicId = null; r.musicName = ''; save(); if (old && !musicInUse(old)) idb.del(old).catch(() => {}); render();
  },
  // Aufstellung
  fPrev() { state.eightIdx--; render(); },
  fNext() { state.eightIdx++; render(); },
  fToggle(el) {
    const r = routine(state.id), f = ownFormation(r, state.eightIdx), id = el.dataset.aid;
    if (f[id]) delete f[id];
    else { const n = Object.keys(f).length; f[id] = { x: 14 + (n % 4) * 24, y: 12 + (Math.floor(n / 4) * 14) % 78 }; }
    save(); render();
  },
  fReset() {
    const r = routine(state.id), e = r.eights[state.eightIdx];
    if (state.eightIdx > 0 && !confirm('Diese Aufstellung entfernen? Der Achter übernimmt dann wieder die Aufstellung davor.')) return;
    e.formation = null; e.fName = ''; save(); render();
  },
  fNew() { const r = routine(state.id); ownFormation(r, state.eightIdx); save(); render(); const n = $('.fname'); if (n) n.focus(); },
  fGo(el) { state.eightIdx = +el.dataset.i; render(); },
  // Abspielen
  pToggle: togglePlay,
  pJump(el) {
    if (!player) return;
    const r = player.r, es = eightSec(r), off = r.offset || 0, t = pos();
    const cur = Math.floor((t - off) / es + 1e-6);
    setPos(off + clamp(cur + Number(el.dataset.d), 0, r.eights.length - 1) * es);
  },
  pRestart() { if (player) setPos(0); },
  pRate() {
    if (!player || !player.audio) return;
    player.rate = player.rate === 1 ? 0.75 : player.rate === 0.75 ? 0.5 : 1;
    player.audio.playbackRate = player.rate; $('#pRate').textContent = `Tempo ${player.rate * 100} %`;
  },
  pSetOne() {
    if (!player || !player.audio) return;
    if (!player.playing) { toast('Starte zuerst die Musik'); return; }
    player.r.offset = Math.round(player.audio.currentTime * 100) / 100; save(); player.lastCount = null;
    toast(`Count 1 bei ${player.r.offset.toFixed(1)} Sek. ✓`);
  },
  pTap() { if (!player) return; if (!player.playing) { toast('Starte zuerst die Musik'); return; } tapTempo(); },
  // Training
  newSession() {
    const s = { id: uid(), teamId: state.teamFilter || null, title: 'Training', date: today(), notes: '', attendance: {}, blocks: [
      { id: uid(), type: 'warmup', minutes: 15, note: '' },
      { id: uid(), type: 'stunts', minutes: 30, note: '' },
      { id: uid(), type: 'routine', minutes: 20, note: '' },
      { id: uid(), type: 'stretch', minutes: 10, note: '' },
    ] };
    db.sessions.push(s); save(); go('session', s.id);
  },
  openSession: el => go('session', el.dataset.id),
  bAdd() { session(state.id).blocks.push({ id: uid(), type: 'other', minutes: 10, note: '' }); save(); render(); },
  bUp(el) { move(session(state.id).blocks, +el.dataset.i, -1); save(); render(); },
  bDown(el) { move(session(state.id).blocks, +el.dataset.i, 1); save(); render(); },
  bDel(el) { session(state.id).blocks.splice(+el.dataset.i, 1); save(); render(); },
  sRun() { runSession(session(state.id)); },
  att(el) {
    const s = session(state.id); s.attendance = s.attendance || {};
    const id = el.dataset.aid, v = s.attendance[id];
    if (v === undefined) s.attendance[id] = true; else if (v === true) s.attendance[id] = false; else delete s.attendance[id];
    save(); render();
  },
  sDup() {
    const s = clone(session(state.id)); s.id = uid(); s.date = today(); s.notes = ''; s.attendance = {};
    s.blocks.forEach(b => { b.id = uid(); }); db.sessions.push(s); save(); state.stack.pop(); go('session', s.id); toast('Kopie für heute angelegt');
  },
  sDel() { if (!confirm('Dieses Training löschen?')) return; db.sessions = db.sessions.filter(s => s.id !== state.id); save(); back(); },
  // Team
  aAdd() {
    const n = $('#newAthlete'), name = n.value.trim(); if (!name) { n.focus(); return; }
    db.athletes.push({ id: uid(), name, role: $('#newRole').value, teamId: state.teamFilter || null }); save(); render(); $('#newAthlete').focus();
  },
  aDel(el) {
    const a = athlete(el.dataset.id); if (!confirm(`${a.name} aus dem Team entfernen? Sie verschwindet auch aus allen Aufstellungen.`)) return;
    db.athletes = db.athletes.filter(x => x !== a);
    db.routines.forEach(r => r.eights.forEach(e => { if (e.formation) delete e.formation[a.id]; }));
    db.sessions.forEach(s => { if (s.attendance) delete s.attendance[a.id]; });
    save(); render();
  },
  // Teams
  tSel(el) { state.teamFilter = el.dataset.id || null; render(); },
  tAdd() { const n = $('#newTeam'), name = n.value.trim(); if (!name) { n.focus(); return; } addTeam(name); },
  tQuick(el) { addTeam(el.dataset.n); },
  tColor(el) { team(state.teamFilter).color = el.dataset.c; save(); render(); },
  tDel() {
    const t = team(state.teamFilter); if (!confirm(`Team „${t.name}“ löschen? Die Sportlerinnen bleiben erhalten, nur ohne Team.`)) return;
    db.teams = db.teams.filter(x => x !== t);
    [...db.athletes, ...db.routines, ...db.sessions].forEach(x => { if (x.teamId === t.id) x.teamId = null; });
    state.teamFilter = null; save(); render();
  },
  wGo() {
    const n = $('#wName').value.trim(); if (n) db.profile.name = n;
    db.welcomed = true; save();
    const o = $('#overlay'); o.hidden = true; o.classList.remove('welcome'); render();
  },
  // Ich
  openPlan: el => go('plan', el.dataset.id),
  runPlan: el => runPlan(plan(el.dataset.id)),
  newPlan() { const p = { id: uid(), name: 'Neuer Plan', exercises: [{ id: uid(), name: '', seconds: 20, sides: false }] }; planDefaults(p); db.me.plans.push(p); save(); go('plan', p.id); },
  xAdd() { plan(state.id).exercises.push({ id: uid(), name: '', seconds: 20, sides: false }); save(); render(); },
  pickPlanMusic() { musicTarget = 'plan'; $('#musicInput').click(); },
  delPlanMusic() {
    const p = plan(state.id); if (!confirm('Musik aus diesem Plan entfernen?')) return;
    stopPreview(); const old = p.musicId; p.musicId = null; p.musicName = ''; save();
    if (old && !musicInUse(old)) idb.del(old).catch(() => {});
    render();
  },
  pPreview() { const p = plan(state.id); if (preview) stopPreview(); else startPreview(p); },
  pTapPlan() {
    if (!preview) { toast('Starte zuerst „Probehören“'); return; }
    const now = performance.now(), taps = preview.taps, b = $('#pTapPlan');
    if (taps.length && now - taps[taps.length - 1] > 2000) taps.length = 0;
    taps.push(now); if (taps.length > 12) taps.shift();
    if (taps.length < 4) { b.textContent = `Weiter tippen… (${taps.length})`; return; }
    const bpm = Math.round(60000 * (taps.length - 1) / (taps[taps.length - 1] - taps[0]));
    if (bpm >= 60 && bpm <= 180) {
      preview.p.bpm = bpm; save(); $('#pBpm').value = bpm; b.textContent = `Tempo: ${bpm} ✓`;
      if (preview.p.count !== false) counter.start(bpm);
    }
  },
  xUp(el) { move(plan(state.id).exercises, +el.dataset.i, -1); save(); render(); },
  xDown(el) { move(plan(state.id).exercises, +el.dataset.i, 1); save(); render(); },
  xDel(el) { plan(state.id).exercises.splice(+el.dataset.i, 1); save(); render(); },
  pDel() { if (!confirm('Diesen Plan löschen?')) return; db.me.plans = db.me.plans.filter(p => p.id !== state.id); save(); back(); },
  skCycle(el) {
    const s = db.me.skills.find(x => x.id === el.dataset.id); s.status = (s.status + 1) % 3;
    s.date = s.status === 2 ? today() : ''; save();
    if (s.status === 2) { toast(`${s.name} sitzt! 🎉`); confetti(); }
    const y = window.scrollY; render(); window.scrollTo(0, y);
  },
  skEdit() { state.editSkills = !state.editSkills; const y = window.scrollY; render(); window.scrollTo(0, y); },
  skAdd() {
    const n = $('#newSkill'), name = n.value.trim(); if (!name) { n.focus(); return; }
    db.me.skills.push({ id: uid(), name, cat: $('#newSkillCat').value, status: 0, date: '' }); save();
    const y = window.scrollY; render(); window.scrollTo(0, y);
  },
  skDel(el) { db.me.skills = db.me.skills.filter(s => s.id !== el.dataset.id); save(); const y = window.scrollY; render(); window.scrollTo(0, y); },
  dMood(el) { diaryMood = +el.dataset.m; document.querySelectorAll('#dMood button').forEach((b, i) => { b.style.background = i === diaryMood ? '#dbe4fb' : '#edf0f7'; }); },
  dAdd() {
    const t = $('#dText').value.trim(); if (!t) { $('#dText').focus(); return; }
    db.me.diary.push({ id: uid(), date: $('#dDate').value || today(), mood: diaryMood, text: t }); save();
    const y = window.scrollY; render(); window.scrollTo(0, y); toast('Eintrag gespeichert');
  },
  dDel(el) { if (!confirm('Eintrag löschen?')) return; db.me.diary = db.me.diary.filter(d => d.id !== el.dataset.id); save(); const y = window.scrollY; render(); window.scrollTo(0, y); },
  export: exportData,
  import() { $('#importInput').click(); },
  // Timer
  rClose() { if (runner && !runner.done && !confirm('Timer beenden?')) return; closeRunner(); },
  rToggle() {
    if (runner.running) { runner.left = runnerLeft(); runner.running = false; counter.stop(); pauseMusic(); }
    else {
      runner.endAt = Date.now() + runner.left * 1000; runner.running = true;
      const st = runner.steps[runner.i];
      if (st.music) playMusic(st.music);
      if (st.kind === 'work' && st.bpm) counter.start(st.bpm, runner.left);
    }
    $('#rToggle').textContent = runner.running ? '❚❚' : '▶︎';
  },
  rPrev() { stepTo(runnerLeft() < runner.steps[runner.i].seconds - 3 ? runner.i : runner.i - 1); },
  rNext() { stepTo(runner.i + 1); },
};

document.addEventListener('click', e => {
  const el = e.target.closest('[data-a]'); if (!el || el.disabled) return;
  const fn = actions[el.dataset.a]; if (fn) { e.preventDefault(); fn(el); }
});
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  if (e.target.id === 'newAthlete') actions.aAdd();
  if (e.target.id === 'newTeam') actions.tAdd();
  if (e.target.id === 'wName') actions.wGo();
  if (e.target.id === 'newSkill') actions.skAdd();
});

// ---------- Eingaben (speichern ohne neu zu zeichnen, damit der Fokus bleibt) ----------
function onInput(e) {
  const el = e.target, k = el.dataset.in; if (!k) return;
  const v = el.type === 'checkbox' ? el.checked : el.value, id = el.dataset.id;
  const r = state.view === 'routine' ? routine(state.id) : null;
  const s = state.view === 'session' ? session(state.id) : null;
  const p = state.view === 'plan' ? plan(state.id) : null;
  const eight = () => r.eights.find(x => x.id === id);
  const block = () => s.blocks.find(x => x.id === id);
  const exer = () => p.exercises.find(x => x.id === id);
  switch (k) {
    case 'rName': r.name = v; $('#title').textContent = v || 'Routine'; break;
    case 'rBpm': { const n = Number(v); if (n >= 40 && n <= 260) r.bpm = n; break; }
    case 'rOffset': r.offset = Math.max(0, Number(v) || 0); break;
    case 'eSection': eight().section = v; el.closest('.eight').style.borderLeftColor = SECTIONS[v].color; break;
    case 'eCount': eight().counts[+el.dataset.k] = v; break;
    case 'eNote': eight().note = v; break;
    case 'eGName': eight().gName = v; break;
    case 'gName': eight().groups[+el.dataset.g].name = v; break;
    case 'gCount': eight().groups[+el.dataset.g].counts[+el.dataset.k] = v; break;
    case 'fName': eight().fName = v; break;
    case 'sTitle': s.title = v; $('#title').textContent = v || 'Training'; break;
    case 'sDate': if (v) s.date = v; break;
    case 'sNotes': s.notes = v; break;
    case 'bType': block().type = v; el.closest('.tblock').style.borderLeftColor = BLOCKS[v].color; break;
    case 'bMin': { const b = block(); b.minutes = Math.max(1, Number(v) || 1); $('#sTotal').textContent = sessionMinutes(s); const h = $(`[data-hint="${b.id}"]`); if (h) h.innerHTML = planHint(b); break; }
    case 'bNote': block().note = v; break;
    case 'aName': { const a = athlete(id); if (v.trim()) a.name = v.trim(); break; }
    case 'aRole': athlete(id).role = v; break;
    case 'aTeam': athlete(id).teamId = v || null; break;
    case 'tName': if (v.trim()) team(id).name = v.trim(); break;
    case 'rTeam': r.teamId = v || null; break;
    case 'sTeam': s.teamId = v || null; break;
    case 'profName': db.profile.name = v; break;
    case 'pName': p.name = v; $('#title').textContent = v || 'Plan'; break;
    case 'xName': exer().name = v; break;
    case 'xSec': exer().seconds = Math.max(5, Number(v) || 30); $('#pTotal').textContent = fmtTime(planSeconds(p)); break;
    case 'xSides': exer().sides = v; $('#pTotal').textContent = fmtTime(planSeconds(p)); break;
    case 'pRest': p.rest = Math.max(0, Number(v) || 0); $('#pTotal').textContent = fmtTime(planSeconds(p)); break;
    case 'pRounds': p.rounds = clamp(Number(v) || 1, 1, 20); $('#pTotal').textContent = fmtTime(planSeconds(p)); break;
    case 'pCount': p.count = v; if (preview) { stopPreview(); } break;
    case 'pBpm': { const n = Number(v); if (n >= 60 && n <= 180) { p.bpm = n; if (preview && p.count !== false) counter.start(n); } break; }
    case 'bPlan': block().planId = v || null; break;
    default: return;
  }
  save();
}
document.addEventListener('input', onInput);
document.addEventListener('change', e => {
  onInput(e);
  // Längen-/Zeitangaben neu berechnen, wenn das Feld verlassen wird
  if (['rBpm', 'rOffset', 'aRole', 'aTeam', 'tName', 'sTeam', 'bPlan', 'fName'].includes(e.target.dataset.in)) render();
});

$('#musicInput').addEventListener('change', async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  const r = musicTarget === 'plan' ? plan(state.id) : routine(state.id); if (!r) return;
  try {
    stopPreview();
    const old = r.musicId, id = uid();
    await idb.put(id, f);
    r.musicId = id; r.musicName = f.name; save();
    if (musicTarget === 'plan') musicCache[id] = URL.createObjectURL(f);
    if (old && !musicInUse(old)) idb.del(old).catch(() => {});
    toast('Musik gespeichert ♪'); render();
  } catch (err) { toast('Musik konnte nicht gespeichert werden', 3500); }
});
$('#importInput').addEventListener('change', e => { const f = e.target.files[0]; e.target.value = ''; if (f) importData(f); });

// ---------- Aufstellung: Punkte verschieben ----------
let musicTarget = 'routine';
let drag = null;
document.addEventListener('pointerdown', e => {
  const dot = e.target.closest('#matEdit .dot'); if (!dot) return;
  e.preventDefault();
  drag = { dot, aid: dot.dataset.aid, mat: dot.parentElement.getBoundingClientRect(), moved: false };
  dot.setPointerCapture(e.pointerId);
});
document.addEventListener('pointermove', e => {
  if (!drag) return;
  const x = clamp((e.clientX - drag.mat.left) / drag.mat.width * 100, 3, 97);
  const y = clamp((e.clientY - drag.mat.top) / drag.mat.height * 100, 4, 92);
  drag.dot.style.left = x + '%'; drag.dot.style.top = y + '%'; drag.x = x; drag.y = y; drag.moved = true;
});
function endDrag() {
  if (!drag) return;
  if (drag.moved) {
    const r = routine(state.id), f = ownFormation(r, state.eightIdx);
    f[drag.aid] = { x: Math.round(drag.x * 10) / 10, y: Math.round(drag.y * 10) / 10 }; save();
    if (!$('[data-a="fReset"]')) { drag = null; render(); return; }
  }
  drag = null;
}
document.addEventListener('pointerup', endDrag);
document.addEventListener('pointercancel', endDrag);

// Nach Rückkehr aus dem Hintergrund Timer sofort aktualisieren
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') { if (runner && runner.running) { keepAwake(true); tick(); } if (player && player.playing) keepAwake(true); }
});

// Offline-Unterstützung
// Updates sofort laden: Service Worker ohne Browser-Zwischenspeicher prüfen und bei jedem Öffnen nachsehen.
// Kommt eine neue Version, lädt die App einmal neu (nicht, während ein Timer oder die Musik läuft).
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  const hadController = !!navigator.serviceWorker.controller;
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloading) return;
    if (runner || (player && player.playing)) { toast('Neue Version da – sie lädt beim nächsten Öffnen.', 3500); return; }
    reloading = true; location.reload();
  });
  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(reg => {
    reg.update().catch(() => {});
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
  }).catch(() => {});
}

render();
if (!db.welcomed) showWelcome();
cacheMusic();
