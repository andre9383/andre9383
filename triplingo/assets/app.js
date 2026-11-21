/* TriLingo — app principal (vanilla JS). Funciona dentro del WebView de Android (puente window.Android)
   y también en un navegador normal (usa Web Speech API y fetch como respaldo). */
(function () {
'use strict';

const NATIVE = typeof window.Android !== 'undefined';
const LANGS = ['en', 'pt', 'ja'];
const MONTHS = ['Mes 1 · A1 Fundamentos', 'Mes 2 · A1+ Supervivencia', 'Mes 3 · A2 Pasado y futuro', 'Mes 4 · B1 Independiente', 'Mes 5 · B2 Avanzado', 'Mes 6 · C1 Dominio y fluidez'];
const CEFR = ['A1', 'A1+', 'A2', 'B1', 'B2', 'C1'];
const $app = document.getElementById('app');
const $nav = document.getElementById('nav');

// ------------------------------------------------------------------ estado
const DEF = {
  v: 2, started: null, name: '', langs: ['en', 'pt', 'ja'], goal: 150, rate: 0.9,
  xp: 0, streak: 0, best: 0, lastDay: null, today: { d: null, xp: 0 }, hist: {},
  units: {}, srs: {}, kana: {}, stats: { answers: 0, correct: 0, spoken: 0, convs: 0, lessons: 0, minutes: 0 },
  mode: 'adult', kids: {}, mistakes: [], font: 100, sfx: true, write: {}, kanji: {}
};
const NU = () => COURSE.en.units.length; // 32 unidades: Básico, A1, A2, B1, B2, C1, C2
let S = load();
function load() {
  try {
    const s = JSON.parse(localStorage.getItem('tl_state'));
    if (s && s.v) {
      if (s.v < 2) { // v1 tenía 24 unidades (A1–C1); ahora hay 4 de Básico delante
        const u = {}; Object.keys(s.units || {}).forEach(k => { const [l, i] = k.split('-'); u[l + '-' + (+i + 4)] = s.units[k]; });
        ['en', 'pt', 'ja'].forEach(l => { if (u[l + '-4']) for (let i = 0; i < 4; i++) u[l + '-' + i] = { steps: {}, best: 0, done: true, skipped: true }; });
        s.units = u; s.v = 2;
      }
      return Object.assign(JSON.parse(JSON.stringify(DEF)), s);
    }
  } catch (e) { }
  return JSON.parse(JSON.stringify(DEF));
}
function save() { try { localStorage.setItem('tl_state', JSON.stringify(S)); } catch (e) { } }
const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const dayNum = (s) => Math.floor(new Date(s + 'T12:00:00').getTime() / 864e5);
function touchDay() {
  const t = today();
  if (S.today.d !== t) S.today = { d: t, xp: 0 };
}
function addXP(n) {
  touchDay();
  S.xp += n; S.today.xp += n; S.hist[S.today.d] = S.today.xp;
  const t = S.today.d;
  if (S.lastDay !== t) {
    if (S.lastDay && dayNum(t) - dayNum(S.lastDay) === 1) S.streak++; else S.streak = 1;
    S.lastDay = t; S.best = Math.max(S.best, S.streak);
  }
  save();
}
function streakAlive() { if (!S.lastDay) return 0; const d = dayNum(today()) - dayNum(S.lastDay); return d <= 1 ? S.streak : 0; }
function weekIndex() { if (!S.started) return 0; return Math.min(25, Math.max(0, Math.floor((dayNum(today()) - dayNum(S.started)) / 7))); }
// Plan de 26 semanas: Básico → C1 (28 unidades); C2 es la extensión de maestría
function planUnit() { if (!S.started) return 0; return Math.min(NU() - 1, Math.floor((dayNum(today()) - dayNum(S.started)) * 28 / 182)); }
const LV = (i) => LEVELS[levelIdx(i)];
const U = (l, i) => S.units[l + '-' + i] || (S.units[l + '-' + i] = { steps: {}, best: 0, done: false });
function unitUnlocked(l, i) { return i === 0 || (S.units[l + '-' + (i - 1)] && S.units[l + '-' + (i - 1)].done) || (S.units[l + '-' + i] && S.units[l + '-' + i].open); }
function curUnit(l) { const n = COURSE[l].units.length; for (let i = 0; i < n; i++) if (!(S.units[l + '-' + i] && S.units[l + '-' + i].done)) return i; return n - 1; }
function doneCount(l) { return COURSE[l].units.filter((_, i) => S.units[l + '-' + i] && S.units[l + '-' + i].done).length; }

// ------------------------------------------------------------------ utilidades
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = (a, n) => shuffle(a).slice(0, n);
const disp = (l, s) => l === 'ja' ? String(s).replace(/ /g, '') : s;
function toast(msg, ms) { const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), ms || 2200); }
function vib(ms) { try { if (NATIVE) Android.vibrate(ms); else if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { } }
function confetti() {
  const c = document.createElement('div'); c.className = 'confetti';
  const cols = ['#6366f1', '#22c55e', '#facc15', '#ef4444', '#22d3ee', '#ec4899'];
  for (let i = 0; i < 60; i++) { const p = document.createElement('i'); p.style.left = Math.random() * 100 + '%'; p.style.background = cols[i % cols.length]; p.style.animationDelay = Math.random() * .6 + 's'; p.style.animationDuration = 1.2 + Math.random() + 's'; c.appendChild(p); }
  document.body.appendChild(c); setTimeout(() => c.remove(), 2600);
}
function md(t) { // mini‑markdown seguro
  t = esc(t || '');
  t = t.replace(/^### (.*)$/gm, '<h3>$1</h3>').replace(/^## (.*)$/gm, '<h2>$1</h2>').replace(/^# (.*)$/gm, '<h1>$1</h1>');
  t = t.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/(^|[^*])\*(?!\s)(.+?)\*/g, '$1<i>$2</i>').replace(/`([^`]+)`/g, '<code>$1</code>');
  t = t.replace(/^(?:\s*[-*•] .*(?:\n|$))+/gm, m => '<ul>' + m.trim().split(/\n/).map(x => '<li>' + x.replace(/^\s*[-*•] /, '') + '</li>').join('') + '</ul>');
  t = t.split(/\n{2,}/).map(p => /^<(h\d|ul)/.test(p) ? p : '<p>' + p.replace(/\n/g, '<br>') + '</p>').join('');
  return t;
}
function norm(s, l) {
  s = String(s || '').toLowerCase().trim();
  if (l === 'ja') { s = s.replace(/[ā]/g, 'aa').replace(/[ō]/g, 'o').replace(/[ū]/g, 'u').replace(/ou/g, 'o').replace(/oo/g, 'o').replace(/uu/g, 'u'); return s.replace(/[\s。、！？!?.,'"「」・ー\-]/g, ''); }
  s = s.normalize('NFD').replace(/[̀-ͯ]/g, '');
  s = s.replace(/[’']/g, "'").replace(/[^a-z0-9' ]/g, ' ').replace(/\s+/g, ' ').trim();
  if (l === 'en') s = s.replace(/\bi'm\b/g, 'i am').replace(/\byou're\b/g, 'you are').replace(/\bit's\b/g, 'it is').replace(/\bdon't\b/g, 'do not').replace(/\bi'll\b/g, 'i will').replace(/\bi'd\b/g, 'i would').replace(/\bdoesn't\b/g, 'does not').replace(/\bcan't\b/g, 'cannot').replace(/\bwe're\b/g, 'we are').replace(/'/g, '');
  return s;
}
function lev(a, b) {
  const m = a.length, n = b.length; if (!m) return n; if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) { const cur = [i]; for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = cur; }
  return prev[n];
}
const sim = (a, b) => { if (!a && !b) return 1; return 1 - lev(a, b) / Math.max(a.length, b.length); };

// ---- Conversor romaji → kana (teclado japonés integrado)
const RK = {};
(function () {
  const V = ['a', 'i', 'u', 'e', 'o'], H = 'あいうえお';
  const rows = { '': 'あいうえお', k: 'かきくけこ', s: 'さしすせそ', t: 'たちつてと', n: 'なにぬねの', h: 'はひふへほ', m: 'まみむめも', y: 'や_ゆ_よ', r: 'らりるれろ', w: 'わ__を', g: 'がぎぐげご', z: 'ざじずぜぞ', d: 'だぢづでど', b: 'ばびぶべぼ', p: 'ぱぴぷぺぽ' };
  Object.keys(rows).forEach(c => V.forEach((v, k) => { if (rows[c][k] !== '_') RK[c + v] = rows[c][k]; }));
  Object.assign(RK, { shi: 'し', chi: 'ち', tsu: 'つ', fu: 'ふ', ji: 'じ', wo: 'を', nn: 'ん', "n'": 'ん', xtsu: 'っ', ltsu: 'っ', xya: 'ゃ', xyu: 'ゅ', xyo: 'ょ', la: 'ぁ', li: 'ぃ', lu: 'ぅ', le: 'ぇ', lo: 'ぉ', xa: 'ぁ', xi: 'ぃ', xu: 'ぅ', xe: 'ぇ', xo: 'ぉ', '-': 'ー' });
  const yo = { ky: 'き', sh: 'し', ch: 'ち', ny: 'に', hy: 'ひ', my: 'み', ry: 'り', gy: 'ぎ', j: 'じ', by: 'び', py: 'ぴ', sy: 'し', ty: 'ち', zy: 'じ', dy: 'ぢ', jy: 'じ', cy: 'ち' };
  Object.keys(yo).forEach(c => { RK[c + 'a'] = yo[c] + 'ゃ'; RK[c + 'u'] = yo[c] + 'ゅ'; RK[c + 'o'] = yo[c] + 'ょ'; });
  RK.she = 'しぇ'; RK.je = 'じぇ'; RK.che = 'ちぇ'; RK.fa = 'ふぁ'; RK.fi = 'ふぃ'; RK.fe = 'ふぇ'; RK.fo = 'ふぉ'; RK.ti = 'てぃ'; RK.di = 'でぃ'; RK.wi = 'うぃ'; RK.we = 'うぇ'; RK.va = 'ゔぁ'; RK.vi = 'ゔぃ'; RK.vu = 'ゔ';
})();
const hira2kata = (s) => s.replace(/[ぁ-ゖ]/g, c => String.fromCharCode(c.charCodeAt(0) + 0x60));
const kata2hira = (s) => s.replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));
function toKana(str, kata, fold) {
  let s = String(str).toLowerCase(); if (kata) s = s.replace(/([āīūēō])/g, (m) => ({ ā: 'a', ī: 'i', ū: 'u', ē: 'e', ō: 'o' })[m] + '-');
  s = s.replace(/ā/g, 'aa').replace(/ī/g, 'ii').replace(/ū/g, 'uu').replace(/ē/g, 'ei').replace(/ō/g, 'ou');
  let out = '', i = 0;
  while (i < s.length) {
    const c = s[i];
    if (!/[a-z'\-]/.test(c)) { out += c; i++; continue; }
    if (c === s[i + 1] && /[bcdfghjkmpqrstvwxyz]/.test(c)) { out += 'っ'; i++; continue; }
    if (c === 'n' && s[i + 1] === 'n' && /[aiueoy]/.test(s[i + 2] || '')) { out += 'ん'; i++; continue; }
    if (c === 'n' && (i + 1 >= s.length ? fold : !/[aiueoyn']/.test(s[i + 1]))) { out += 'ん'; i++; continue; }
    let hit = false;
    for (let L = 4; L >= 1; L--) { const seg = s.substr(i, L); if (RK[seg]) { out += RK[seg]; i += L; hit = true; break; } }
    if (!hit) { out += c; i++; }
  }
  if (fold) return kata2hira(out);
  return kata ? hira2kata(out) : out;
}
window.toKana = toKana;

// ---- Efectos de sonido (Web Audio, sin archivos)
let AC = null;
function sfx(t) {
  if (!S.sfx) return;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    const seq = { ok: [[660, .07], [880, .1]], bad: [[220, .16]], combo: [[660, .06], [880, .06], [1175, .12]], win: [[523, .1], [659, .1], [784, .1], [1047, .25]], tap: [[500, .04]] }[t] || [];
    let at = AC.currentTime;
    seq.forEach(([f, d]) => { const o = AC.createOscillator(), g = AC.createGain(); o.type = t === 'bad' ? 'sawtooth' : 'sine'; o.frequency.value = f; g.gain.setValueAtTime(.12, at); g.gain.exponentialRampToValueAtTime(.001, at + d); o.connect(g); g.connect(AC.destination); o.start(at); o.stop(at + d); at += d * .9; });
  } catch (e) { }
}
function openUrl(u) { try { if (NATIVE && Android.openUrl) Android.openUrl(u); else window.open(u, '_blank'); } catch (e) { window.open(u, '_blank'); } }

// ------------------------------------------------------------------ voz (TTS + STT)
const BCP = { en: 'en-US', pt: 'pt-BR', ja: 'ja-JP', es: 'es-ES' };
function speak(text, l, rate) {
  text = disp(l, text);
  const r = rate || S.rate || 0.9;
  if (NATIVE) { try { Android.speak(text, l, r); } catch (e) { } return; }
  if (!window.speechSynthesis) return;
  speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = BCP[l]; u.rate = r;
  const v = speechSynthesis.getVoices().find(v => v.lang && v.lang.replace('_', '-').startsWith(BCP[l].slice(0, 2))); if (v) u.voice = v;
  speechSynthesis.speak(u);
}
window.__say = (i) => { const x = SAY[i]; if (x) speak(x[0], x[1], x[2]); };
let SAY = [];
const sayBtn = (text, l, rate) => { SAY.push([text, l, rate]); return `<button class="say" onclick="event.stopPropagation();__say(${SAY.length - 1})">🔊</button>`; };

let listenCb = {}, listenN = 0;
window.__onSpeech = (id, ok, data) => { const cb = listenCb[id]; delete listenCb[id]; if (cb) cb(ok, data); };
function listen(l) {
  return new Promise((res) => {
    const id = 's' + (++listenN);
    listenCb[id] = (ok, data) => res(ok ? { ok: true, alts: data } : { ok: false, err: data });
    if (NATIVE) { Android.listen(id, l); return; }
    const R = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!R) { window.__onSpeech(id, false, 'Tu navegador no soporta reconocimiento de voz.'); return; }
    const r = new R(); r.lang = BCP[l]; r.maxAlternatives = 5; r.interimResults = false;
    r.onresult = (e) => window.__onSpeech(id, true, Array.from(e.results[0]).map(x => x.transcript));
    r.onerror = (e) => window.__onSpeech(id, false, 'Error: ' + e.error);
    r.onend = () => setTimeout(() => window.__onSpeech(id, false, 'No escuché nada.'), 300);
    r.start();
  });
}
function scoreSpeech(alts, target, l, pron) {
  const t = norm(target, l), tp = pron ? norm(pron, l) : null;
  let best = 0, heard = alts[0] || '';
  for (const a of alts) { let s = sim(norm(a, l), t); if (tp) s = Math.max(s, sim(norm(a, l), tp)); if (s > best) { best = s; heard = a; } }
  return { score: Math.round(best * 100), heard };
}
function diffHTML(target, heard, l) {
  if (l === 'ja') return esc(disp(l, target));
  const hw = new Set(norm(heard, l).split(' '));
  return target.split(/\s+/).map(w => `<span class="${hw.has(norm(w, l)) ? 'm' : 'x'}">${esc(w)}</span>`).join(' ');
}

// ------------------------------------------------------------------ Gemini
let aiCb = {}, aiN = 0;
window.__onGemini = (id, ok, text) => { const cb = aiCb[id]; delete aiCb[id]; if (cb) ok ? cb.res(text) : cb.rej(new Error(text)); };
function getKey() { try { return NATIVE ? Android.getKey() : (localStorage.getItem('tl_key') || ''); } catch (e) { return ''; } }
function setKey(k) { if (NATIVE) Android.setKey(k); else localStorage.setItem('tl_key', k); }
function getModel() { try { return NATIVE ? Android.getModel() : (localStorage.getItem('tl_model') || 'gemini-flash-latest'); } catch (e) { return 'gemini-flash-latest'; } }
function setModel(m) { if (NATIVE) Android.setModel(m); else localStorage.setItem('tl_model', m); }
function ai(opts) {
  const body = {
    contents: opts.messages.map(m => ({ role: m.role === 'model' ? 'model' : 'user', parts: [{ text: m.text }] })),
    generationConfig: { temperature: opts.temp == null ? 0.7 : opts.temp }
  };
  if (opts.system) body.systemInstruction = { parts: [{ text: opts.system }] };
  if (opts.json) body.generationConfig.responseMimeType = 'application/json';
  return new Promise((res, rej) => {
    const id = 'g' + (++aiN); aiCb[id] = { res, rej };
    if (NATIVE) { Android.gemini(id, JSON.stringify(body)); return; }
    const key = getKey(); if (!key) { window.__onGemini(id, false, 'Configura tu clave de Gemini en Ajustes.'); return; }
    const models = [getModel(), 'gemini-flash-latest', 'gemini-flash-lite-latest'].filter((v, i, a) => v && a.indexOf(v) === i);
    (async () => {
      let err = 'Sin respuesta';
      for (const m of models) {
        try {
          const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + m + ':generateContent', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key }, body: JSON.stringify(body) });
          const j = await r.json();
          if (!r.ok) { err = (j.error && j.error.message) || ('HTTP ' + r.status); continue; }
          const txt = j.candidates[0].content.parts.filter(p => !p.thought).map(p => p.text || '').join('');
          window.__onGemini(id, true, txt); return;
        } catch (e) { err = e.message; }
      }
      window.__onGemini(id, false, err);
    })();
  });
}
function parseJSON(t) {
  t = String(t).trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  try { return JSON.parse(t); } catch (e) { const m = t.match(/[\[{][\s\S]*[\]}]/); if (m) return JSON.parse(m[0]); throw e; }
}
function levelOf(l) { const i = curUnit(l); return LV(i).cefr + ' (unidad ' + (i + 1) + ': ' + COURSE[l].units[i].t + ')'; }
const LNAME = { en: 'inglés', pt: 'portugués de Brasil', ja: 'japonés' };
const aiErr = (e) => `<div class="card"><b>⚠️ No pude contactar a la IA.</b><p class="mut">${esc(e.message || e)}</p><p class="mut">Revisa tu conexión o tu clave en <b>Más → Ajustes</b>. Si dice "high demand", vuelve a intentarlo en unos segundos.</p></div>`;

// ------------------------------------------------------------------ navegación
let stack = [];
let view = null;
function go(name, arg, replace) {
  if (window.speechSynthesis) speechSynthesis.cancel();
  if (view && !replace) stack.push(view);
  view = { name, arg };
  render();
}
window.goBack = function () {
  if (document.querySelector('.fb')) { document.querySelector('.fb').remove(); }
  if (!stack.length) { const root = S.mode === 'kids' ? 'kidsHome' : 'home'; if (view && view.name !== root) { view = { name: root }; render(); return 'stay'; } return 'exit'; }
  view = stack.pop(); render(); return 'stay';
};
function tabGo(name) { stack = []; view = { name }; render(); }
$nav.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) tabGo(b.dataset.v); });
function setNav(show, on) {
  $nav.style.display = show ? 'flex' : 'none';
  document.body.style.paddingBottom = show ? '84px' : '24px';
  $nav.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === on));
}
function top(title, back) {
  return `<div class="top">${back !== false ? '<button class="back" onclick="goBack()">←</button>' : ''}<h1>${title}</h1><span class="pill">🔥 ${streakAlive()}</span><span class="pill">⭐ ${S.xp}</span></div>`;
}
function render() {
  SAY = [];
  document.querySelectorAll('.fb,.composer').forEach(x => x.remove());
  if (!S.started) { setNav(false); return V.onboard(); }
  const v = view || { name: 'home' }; view = v;
  const fn = V[v.name] || V.home;
  const navTabs = { home: 'home', courses: 'courses', review: 'review', talk: 'talk', more: 'more' };
  setNav(!!navTabs[v.name], navTabs[v.name]);
  fn(v.arg);
  window.scrollTo(0, 0);
}

// ------------------------------------------------------------------ vistas
const V = {};
window.App = {};
const A = window.App;

V.onboard = function () {
  const sel = new Set(S.langs);
  const lv = { en: 0, pt: 0, ja: 0 }; let mode = 'adult';
  function draw() {
    $app.innerHTML = `
    <div class="hero"><h2>¡Bienvenido a TriLingo! 🌍</h2><p>Inglés 🇬🇧, portugués 🇧🇷 y japonés 🇯🇵 en 6 meses, de cero a nivel avanzado, con teoría, práctica, voz e IA.</p></div>
    <div class="card"><h3>¿Cómo te llamas?</h3><input id="nm" placeholder="Tu nombre" value="${esc(S.name)}"></div>
    <div class="card"><h3>¿Qué idiomas vas a aprender?</h3><p class="mut">✅ = incluido · toca para quitar o añadir</p><div class="row wrap">
      ${LANGS.map(l => `<button class="lang-chip ${sel.has(l) ? 'on' : ''}" onclick="App.obT('${l}')">${sel.has(l) ? '✅' : '➕'} ${COURSE[l].flag} ${COURSE[l].name}</button>`).join('')}
    </div></div>
    <div class="card"><h3>Tu nivel actual</h3>
      ${LANGS.filter(l => sel.has(l)).map(l => `<div class="row" style="margin:8px 0"><span class="grow">${COURSE[l].flag} ${COURSE[l].name}</span>
        <select style="width:auto" onchange="App.obL('${l}',this.value)">
        ${LEVELS.slice(0, 5).map((L, k) => { const v = k ? LEVELS[k - 1].to + 1 : 0; return `<option value="${v}" ${lv[l] == v ? 'selected' : ''}>${k ? 'Ya domino ' + LEVELS[k - 1].n + ' → empiezo en ' + L.n : 'Desde cero (Básico)'}</option>`; }).join('')}</select></div>`).join('')}
      <p class="mut">¿No estás seguro? Luego puedes hacer el <b>Test de nivel</b> en Cursos.</p>
    </div>
    <div class="card"><h3>¿Quién va a aprender?</h3><div class="row"><button class="lang-chip ${mode === 'adult' ? 'on' : ''}" onclick="App.obM('adult')">🧑 Joven / adulto</button><button class="lang-chip ${mode === 'kids' ? 'on' : ''}" onclick="App.obM('kids')">🧸 Niño/a (3‑10 años)</button></div></div>
    <div class="card"><h3>Meta diaria</h3><select id="goal"><option value="90">Relajada · 90 XP (~20 min)</option><option value="150" selected>Seria · 150 XP (~35 min)</option><option value="250">Intensa · 250 XP (~60 min)</option><option value="400">Modo 3× · 400 XP (~90 min)</option></select></div>
    <div class="card"><h3>Clave de Gemini (IA)</h3><p class="mut">Activa conversaciones, tutor y ejercicios ilimitados. ${getKey() ? '✅ Ya está configurada.' : 'Puedes ponerla después en Ajustes.'}</p>
      ${getKey() ? '' : '<input id="key" placeholder="Pega tu API key de Gemini">'}</div>
    <button class="btn full" onclick="App.obGo()">Empezar mi plan de 6 meses 🚀</button>`;
  }
  A.obT = (l) => { sel.has(l) ? sel.size > 1 && sel.delete(l) : sel.add(l); S.name = document.getElementById('nm').value; draw(); };
  A.obL = (l, v) => { lv[l] = +v; };
  A.obM = (m) => { mode = m; S.name = document.getElementById('nm').value; draw(); };
  A.obGo = () => {
    S.name = document.getElementById('nm').value.trim();
    S.langs = LANGS.filter(l => sel.has(l)); S.goal = +document.getElementById('goal').value;
    const k = document.getElementById('key'); if (k && k.value.trim()) setKey(k.value.trim());
    S.langs.forEach(l => { for (let i = 0; i < lv[l]; i++) { const u = U(l, i); u.done = true; u.skipped = true; } });
    S.mode = mode; S.started = today(); touchDay(); save(); view = { name: mode === 'kids' ? 'kidsHome' : 'home' }; render();
  };
  draw();
};

V.home = function () {
  touchDay();
  const w = weekIndex(), pct = Math.min(100, Math.round(S.today.xp / S.goal * 100));
  const due = dueCards().length;
  const hello = S.name ? 'Hola, ' + esc(S.name) : 'Hola';
  $app.innerHTML = `${top('TriLingo', false)}
  <div class="hero row">
    <div class="grow"><h2>${hello} 👋</h2><div>Semana <b>${w + 1}</b> de 26 · plan Básico → C1</div>
      <div class="mut" style="color:#e0e7ff">Hoy: ${S.today.xp}/${S.goal} XP</div></div>
    <div class="ring" style="background:conic-gradient(#fff ${pct * 3.6}deg,#ffffff33 0)"><div class="ring" style="width:66px;height:66px;background:#5b21b6">${pct}%</div></div>
  </div>
  ${LANGS.filter(x => !S.langs.includes(x)).map(x => `<button class="unit" style="border:2px dashed var(--pri2)" onclick="App.addLang('${x}')"><div class="n">➕</div><div class="grow"><b>Activar ${COURSE[x].flag} ${COURSE[x].name}</b><div class="mut">Este idioma está desactivado. Tócalo para añadirlo a tu plan.</div></div></button>`).join('')}
  <div class="card"><h2>🎯 Misión de hoy (método 3×)</h2>
    ${S.langs.map(l => {
      const i = curUnit(l), plan = planUnit(), u = COURSE[l].units[i];
      const st = U(l, i).steps; const n = ['theory', 'vocab', 'practice', 'speak', 'quiz'].filter(k => st[k]).length;
      const late = i < plan ? `<span class="badge" style="color:var(--warn)">${plan - i} unid. de atraso</span>` : (i > plan ? '<span class="badge" style="color:var(--ok)">adelantado</span>' : '<span class="badge">al día</span>');
      return `<button class="unit" onclick="App.openUnit('${l}',${i})"><div class="n" style="background:${COURSE[l].color}33">${COURSE[l].flag}</div>
        <div class="grow"><b>${esc(u.t)}</b><div class="mut">${LV(i).ic} ${LV(i).n} · unidad ${i + 1} · ${n}/5 pasos ${late}</div><div class="bar" style="margin-top:6px"><i style="width:${n * 20}%"></i></div></div><span>›</span></button>`;
    }).join('')}
    <div class="grid2" style="margin-top:6px">
      <button class="tile" onclick="tabGo('review')"><span class="ic">🧠</span><b>Repaso espaciado</b><span class="mut">${due} tarjetas pendientes</span></button>
      <button class="tile" onclick="tabGo('talk')"><span class="ic">💬</span><b>Conversación IA</b><span class="mut">5‑10 min hablando</span></button>
    </div>
  </div>
  <div class="month">Explorar</div>
  <div class="grid3">
    <button class="tile" onclick="go('songs')"><span class="ic">🎵</span><b>Canciones</b></button>
    <button class="tile" onclick="go('books')"><span class="ic">📚</span><b>Libros</b></button>
    <button class="tile" onclick="go('pron')"><span class="ic">🎙️</span><b>Pronunciación</b></button>
    ${S.langs.includes('ja') ? `<button class="tile" onclick="go('jwrite')"><span class="ic">✍️</span><b>Escribir japonés</b></button><button class="tile" onclick="go('kanji')"><span class="ic">漢</span><b>Kanji</b></button>` : `<button class="tile" onclick="go('reading')"><span class="ic">📖</span><b>Lectura IA</b></button>`}
    <button class="tile" onclick="go('mistakes')"><span class="ic">📒</span><b>Mis errores</b><span class="mut">${S.mistakes.length}</span></button>
    <button class="tile" onclick="go('tutor')"><span class="ic">🧑‍🏫</span><b>Tutor IA</b></button>
    <button class="tile" onclick="App.toKids()"><span class="ic">🧸</span><b>Modo niños</b></button>
  </div>
  <div class="card" style="margin-top:12px"><h3>📈 Progreso del plan</h3>
    ${S.langs.map(l => { const d = doneCount(l); return `<div class="row" style="margin:8px 0"><span style="width:28px">${COURSE[l].flag}</span><div class="grow bar"><i style="width:${d / NU() * 100}%;background:${COURSE[l].color}"></i></div><span class="mut" style="width:56px;text-align:right">${d}/${NU()}</span></div>`; }).join('')}
  </div>
  <div class="card"><h3>💡 Consejo del día</h3><p>${SKILLS[(dayNum(today())) % SKILLS.length].ic} <b>${SKILLS[(dayNum(today())) % SKILLS.length].t}:</b> ${SKILLS[(dayNum(today())) % SKILLS.length].d}</p></div>`;
};
A.openUnit = (l, i) => go('unit', { l, i });
A.addLang = (l) => { if (!S.langs.includes(l)) S.langs = LANGS.filter(x => x === l || S.langs.includes(x)); save(); toast(COURSE[l].flag + " " + COURSE[l].name + " activado ✓"); render(); };

let courseTab = null;
V.courses = function () {
  const l = courseTab && S.langs.includes(courseTab) ? courseTab : S.langs[0]; courseTab = l;
  const C = COURSE[l], cur = curUnit(l);
  let h = top('Cursos') + `<div class="tabs">${S.langs.map(x => `<button class="${x === l ? 'on' : ''}" onclick="App.cTab('${x}')">${COURSE[x].flag} ${COURSE[x].name}</button>`).join('')}</div>`;
  h += `<div class="card"><div class="row"><div class="grow"><b>${C.flag} ${C.name}</b><div class="mut">${doneCount(l)}/${NU()} unidades · nivel actual ${LV(cur).cefr}</div></div><button class="btn sm sec" onclick="App.placement('${l}')">Test de nivel</button><button class="btn sm sec" onclick="go('method')">Método</button></div></div>`;
  const openLv = A._olv != null ? A._olv : levelIdx(cur);
  LEVELS.forEach((L, li) => {
    const n = L.to - L.from + 1, d = C.units.slice(L.from, L.to + 1).filter((_, k) => S.units[l + '-' + (L.from + k)] && S.units[l + '-' + (L.from + k)].done).length;
    const isCur = li === levelIdx(cur);
    h += `<button class="lvl ${isCur ? 'cur' : ''} ${d === n ? 'done' : ''}" onclick="App.olv(${li})"><span class="lic">${L.ic}</span><div class="grow"><b>Nivel ${L.n}</b> <span class="badge">${L.cefr}</span><div class="mut">${L.can}</div><div class="bar" style="margin-top:6px"><i style="width:${d / n * 100}%;background:${C.color}"></i></div></div><span class="mut">${d}/${n}</span></button>`;
    if (li !== openLv) return;
    h += `<div class="path">`;
    for (let i = L.from; i <= L.to; i++) {
      const u = C.units[i], st = S.units[l + '-' + i], done = st && st.done, open = unitUnlocked(l, i);
      const nst = st ? ['theory', 'vocab', 'practice', 'speak', 'quiz'].filter(k => st.steps[k]).length : 0;
      h += `<button class="node ${done ? 'done' : ''} ${i === cur ? 'cur' : ''} ${open ? '' : 'lock'}" style="margin-left:${[0, 10, 20, 10][(i - L.from) % 4]}%" onclick="App.tryUnit('${l}',${i})">
        <div class="disc" style="--p:${nst * 20}%"><span>${done ? '★' : open ? i + 1 : '🔒'}</span></div><div class="nt"><b>${esc(u.t)}</b><span class="mut">${done ? (st.skipped ? 'saltada' : 'quiz ' + st.best + '%') : nst + '/5 pasos'}</span></div></button>`;
    }
    h += `</div>`;
  });
  $app.innerHTML = h;
};
A.cTab = (l) => { courseTab = l; A._olv = null; render(); };
A.olv = (li) => { A._olv = A._olv === li ? -1 : li; render(); };
// Test de nivel: 3 preguntas por nivel; se detiene al fallar 2 de 3 y desbloquea hasta ahí
A.placement = (l) => {
  const qs = [];
  LEVELS.forEach((L, li) => { pick(Array.from({ length: L.to - L.from + 1 }, (_, k) => L.from + k), 3).forEach(i => { const v = pick(COURSE[l].units[i].v, 1)[0]; qs.push({ type: 'mc', prompt: 'Nivel ' + L.n + ' · ¿Qué significa?', big: v[0], sub: '', say: v[0], options: distract(l, i, 2, v[2]), answer: v[2], lvl: li }); }); });
  go('ex', { l, i: 0, kind: 'placement', qs });
};
A.tryUnit = (l, i) => {
  if (unitUnlocked(l, i)) return go('unit', { l, i });
  if (confirm('Esta unidad está bloqueada. ¿Quieres hacer el examen para saltar hasta aquí? (necesitas 80%)')) startQuiz(l, i, true);
};

V.method = function () {
  $app.innerHTML = top('Método 3×') + `<div class="card theory">${METHOD}</div><h3>Técnicas para aprender más rápido</h3>` +
    SKILLS.map(s => `<div class="card"><h3>${s.ic} ${s.t}</h3><div class="theory">${s.d}</div></div>`).join('');
};

// ------------- unidad
V.unit = function ({ l, i }) {
  const C = COURSE[l], u = C.units[i], st = U(l, i);
  const steps = [
    ['theory', '📘', 'Teoría', 'Explicación clara de la gramática'],
    ['vocab', '🗂️', 'Vocabulario', u.v.length + ' palabras + frases clave'],
    ['practice', '✍️', 'Práctica', 'Ejercicios interactivos'],
    ['speak', '🎙️', 'Voz', 'Pronuncia y repite (shadowing)'],
    ['quiz', '🏆', 'Quiz final', 'Aprueba con 80% para avanzar']
  ];
  $app.innerHTML = top(`${C.flag} Unidad ${i + 1}`) + `
  <div class="card" style="border-left:5px solid ${C.color}"><div class="mut">${LV(i).ic} Nivel ${LV(i).n} · ${LV(i).cefr}</div><h2>${esc(u.t)}</h2>
   <div class="bar"><i style="width:${steps.filter(s => st.steps[s[0]]).length * 20}%"></i></div></div>
  <div class="steps">${steps.map(s => `<button class="unit ${st.steps[s[0]] ? 'done' : ''}" onclick="App.step('${s[0]}')"><div class="n">${st.steps[s[0]] ? '✓' : s[1]}</div><div class="grow"><b>${s[2]}</b><div class="mut">${s[3]}</div></div><span>›</span></button>`).join('')}</div>
  <div class="month">✨ Potenciado con IA</div>
  <div class="grid2">
    <button class="tile" onclick="App.aiExplain()"><span class="ic">🧑‍🏫</span><b>Explícamelo mejor</b><span class="mut">Más ejemplos y trucos</span></button>
    <button class="tile" onclick="App.aiExercises()"><span class="ic">♾️</span><b>Ejercicios nuevos</b><span class="mut">Generados para ti</span></button>
    <button class="tile" onclick="App.feynman()"><span class="ic">👶</span><b>Técnica Feynman</b><span class="mut">Explica y te evalúo</span></button>
    <button class="tile" onclick="App.writeLab()"><span class="ic">📝</span><b>Escribe y corrijo</b><span class="mut">Producción escrita</span></button>
  </div>
  <button class="btn sec full" style="margin-top:12px" onclick="App.talkUnit()">💬 Conversar usando esta unidad</button>${l === 'ja' ? `<button class="btn sec full" style="margin-top:10px" onclick="App._jt='${i < 12 ? 'hira' : 'n5'}';go('jwrite')">✍️ Practicar escritura japonesa (${i < 12 ? 'hiragana y katakana' : 'kanji'})</button>` : ''}`;
  A.step = (k) => {
    if (k === 'theory') go('theory', { l, i });
    else if (k === 'vocab') go('vocab', { l, i });
    else if (k === 'practice') startPractice(l, i);
    else if (k === 'speak') startSpeak(l, i);
    else if (k === 'quiz') startQuiz(l, i, false);
  };
  A.aiExplain = () => go('aiExplain', { l, i });
  A.aiExercises = () => aiExercises(l, i);
  A.feynman = () => go('feynman', { l, i });
  A.writeLab = () => go('writeLab', { l, i });
  A.talkUnit = () => go('chat', { l, sc: { id: 'unit', ic: '📘', t: u.t, d: 'Conversación para practicar el tema y vocabulario de la unidad "' + u.t + '": ' + u.v.map(v => v[0]).join(', ') } });
};
function markStep(l, i, k, xp) { const st = U(l, i); if (!st.steps[k]) { st.steps[k] = true; addXP(xp || 10); } save(); }

V.theory = function ({ l, i }) {
  const C = COURSE[l], u = C.units[i];
  $app.innerHTML = top('📘 Teoría') + `<div class="card theory"><h2>${esc(u.t)}</h2>${u.g}</div>
  <div class="card"><h3>Ejemplos</h3>${u.s.map(s => `<div class="vocab">${sayBtn(s[0], l)}<div class="grow"><div class="w">${esc(disp(l, s[0]))}</div>${s[1] ? `<div class="mut">${esc(s[1])}</div>` : ''}<div class="mut">${esc(s[2])}</div></div></div>`).join('')}</div>
  <button class="btn full" onclick="App.thDone()">Entendido ✓</button>`;
  A.thDone = () => { markStep(l, i, 'theory', 15); goBack(); };
};

V.vocab = function ({ l, i }) {
  const C = COURSE[l], u = C.units[i];
  let k = 0, flipped = false;
  function draw() {
    if (k >= u.v.length) {
      $app.innerHTML = top('🗂️ Vocabulario') + `<div class="card"><h3>Lista completa</h3>${u.v.map(v => `<div class="vocab">${sayBtn(v[0], l)}<div class="grow"><div class="w">${esc(v[0])}</div><div class="mut">${esc(v[1])}</div></div><div>${esc(v[2])}</div></div>`).join('')}</div>
      <button class="btn full" onclick="App.vDone()">Añadir al repaso y continuar ✓</button>`;
      return;
    }
    const v = u.v[k];
    $app.innerHTML = top('🗂️ Vocabulario ' + (k + 1) + '/' + u.v.length) + `<div class="bar" style="margin-bottom:12px"><i style="width:${k / u.v.length * 100}%"></i></div>
    <div class="card flash" onclick="App.vFlip()"><div class="big">${esc(v[0])}</div>${v[1] ? `<div class="mut">${esc(v[1])}</div>` : ''}
      ${flipped ? `<hr style="width:60%"><div class="q">${esc(v[2])}</div>` : '<div class="mut" style="margin-top:14px">Piensa el significado y toca para ver</div>'}</div>
    <div class="row">${sayBtn(v[0], l)}<button class="btn sec grow" onclick="App.vSlow()">🐢 Lento</button><button class="btn grow" onclick="App.vNext()">${flipped ? 'Siguiente →' : 'Mostrar'}</button></div>`;
    speak(v[0], l);
  }
  A.vFlip = () => { flipped = !flipped; draw(); };
  A.vSlow = () => speak(u.v[k][0], l, 0.6);
  A.vNext = () => { if (!flipped) { flipped = true; draw(); return; } flipped = false; k++; draw(); };
  A.vDone = () => { u.v.forEach(v => srsAdd(l, v)); u.s.forEach(s => srsAdd(l, [disp(l, s[0]), s[1], s[2]])); markStep(l, i, 'vocab', 20); goBack(); };
  draw();
};

// ------------- motor de ejercicios
function distract(l, i, field, correct, n) {
  let pool = COURSE[l].units[i].v.map(v => v[field]);
  for (let d = 1; pool.length < 12 && d < NU(); d++) { [i - d, i + d].forEach(j => { if (j >= 0 && j < NU()) pool = pool.concat(COURSE[l].units[j].v.map(v => v[field])); }); }
  pool = [...new Set(pool)].filter(x => x !== correct);
  return shuffle([correct].concat(pick(pool, n || 3)));
}
function buildQs(l, i, kind) {
  const u = COURSE[l].units[i], qs = [];
  u.v.forEach((v, k) => {
    qs.push({ type: 'mc', prompt: '¿Qué significa?', big: v[0], sub: v[1], say: v[0], options: distract(l, i, 2, v[2]), answer: v[2] });
    if (k % 2 === 0) qs.push({ type: 'mc', prompt: '¿Cómo se dice "' + v[2] + '"?', options: distract(l, i, 0, v[0]), answer: v[0], sayAns: true });
    if (k % 2 === 1) qs.push({ type: 'mc', listen: true, prompt: 'Escucha y elige el significado', say: v[0], options: distract(l, i, 2, v[2]), answer: v[2] });
  });
  pick(u.v, 3).forEach(v => qs.push({ type: 'write', prompt: 'Escribe en ' + COURSE[l].name.toLowerCase() + ':', big: v[2], answer: v[0], pron: v[1], say: v[0] }));
  u.s.forEach(s => {
    const toks = s[0].replace(/[.,!?。、！？]/g, m => l === 'ja' ? m : '').split(/\s+/).filter(Boolean);
    let extra = []; COURSE[l].units[(i + 1) % NU()].s.forEach(x => extra = extra.concat(x[0].replace(/[.,!?。、！？]/g, '').split(/\s+/)));
    extra = pick(extra.filter(w => !toks.includes(w)), 2);
    qs.push({ type: 'build', prompt: 'Traduce ordenando las piezas:', big: s[2], answer: toks, tokens: shuffle(toks.concat(extra)), say: s[0] });
  });
  // Huecos (cloze): quita una pieza de cada frase de ejemplo
  u.s.forEach(s => {
    const toks = s[0].split(/\s+/).filter(Boolean); if (toks.length < 3) return;
    const clean = (w) => w.replace(/[.,!?。、！？"]/g, '');
    const cands = toks.map((w, k) => [clean(w), k]).filter(x => x[0].length > 1);
    if (!cands.length) return;
    const [ans, k] = cands[Math.floor(Math.random() * cands.length)];
    let pool = []; u.s.concat(COURSE[l].units[(i + 1) % NU()].s).forEach(x => x[0].split(/\s+/).forEach(w => { w = clean(w); if (w && w !== ans) pool.push(w); }));
    const shown = toks.map((w, j) => j === k ? w.replace(clean(w), '____') : w).join(l === 'ja' ? '' : ' ');
    qs.push({ type: 'mc', prompt: 'Completa la frase', big: shown, sub: s[2], options: shuffle([ans].concat(pick([...new Set(pool)], 3))), answer: ans, say: s[0], small: true });
  });
  // Parejas y dictado
  qs.push({ type: 'pairs', pairs: pick(u.v, 4).map(v => [v[0], v[2]]) });
  pick(u.v, 2).forEach(v => qs.push({ type: 'write', listen: true, prompt: 'Dictado: escucha y escribe', answer: v[0], pron: v[1], say: v[0], es: v[2] }));
  if (kind === 'practice') { pick(u.v, 2).concat([u.s[0]]).forEach(v => qs.push({ type: 'speak', text: v[0], pron: v[1], es: v[2] })); }
  return kind === 'quiz' ? pick(qs.filter(q => q.type !== 'speak' && q.type !== 'pairs'), 12) : shuffle(qs);
}
function startPractice(l, i) { go('ex', { l, i, kind: 'practice', qs: buildQs(l, i, 'practice') }); }
function startQuiz(l, i, skip) { go('ex', { l, i, kind: skip ? 'skip' : 'quiz', qs: buildQs(l, i, 'quiz') }); }
function startSpeak(l, i) {
  const u = COURSE[l].units[i];
  const qs = u.v.slice(0, 5).map(v => ({ type: 'speak', text: v[0], pron: v[1], es: v[2] })).concat(u.s.map(s => ({ type: 'speak', text: s[0], pron: s[1], es: s[2] })));
  go('ex', { l, i, kind: 'speak', qs });
}
async function aiExercises(l, i) {
  const u = COURSE[l].units[i];
  $app.innerHTML = top('♾️ Ejercicios IA') + '<div class="card center"><div class="spin"></div><p>Creando ejercicios a tu medida…</p></div>';
  try {
    const t = await ai({
      json: true, temp: 0.9,
      system: 'Eres un profesor experto de ' + LNAME[l] + ' para hispanohablantes. Respondes SOLO JSON válido.',
      messages: [{ role: 'user', text: `Crea 8 ejercicios variados de opción múltiple sobre la unidad "${u.t}" (gramática: ${u.g.replace(/<[^>]+>/g, ' ').slice(0, 600)}). Vocabulario: ${u.v.map(v => v[0] + '=' + v[2]).join(', ')}. Mezcla: completar huecos, traducir, elegir la frase correcta, detectar el error, comprensión de minidiálogo. ${l === 'ja' ? 'Usa kana (y romaji entre paréntesis en las opciones si ayuda).' : ''}
Formato: [{"q":"enunciado en español con la parte en ${LNAME[l]}","options":["a","b","c","d"],"answer":0,"explain":"explicación breve en español"}]` }]
    });
    const arr = parseJSON(t);
    const qs = arr.filter(x => x && x.options && x.options.length >= 2).map(x => ({ type: 'mc', prompt: x.q, options: shuffle(x.options), answer: x.options[x.answer | 0], explain: x.explain }));
    if (!qs.length) throw new Error('Respuesta vacía');
    go('ex', { l, i, kind: 'ai', qs }, true);
  } catch (e) { $app.innerHTML = top('♾️ Ejercicios IA') + aiErr(e); }
}

V.ex = function (arg) {
  const { l, i, kind } = arg;
  const qs = arg.qs.slice(); const total = qs.length;
  let idx = 0, right = 0, firstTry = 0, answered = new Set(), streak = 0; const plc = {};
  const t0 = Date.now();
  window.__curQ = () => qs[idx];
  function next() {
    document.querySelectorAll('.fb').forEach(x => x.remove());
    if (idx >= qs.length) return finish();
    drawQ(qs[idx]);
  }
  function header() {
    return `<div class="top"><button class="back" onclick="goBack()">✕</button><div class="grow bar"><i style="width:${Math.min(100, answered.size / total * 100)}%"></i></div><span class="pill">${streak >= 3 ? '🔥' + streak : '✓' + right}</span></div>`;
  }
  function drawQ(q) {
    let h = header();
    if (q.type === 'mc') {
      h += `<div class="mut">${esc(q.prompt)}</div>`;
      if (q.listen) h += `<div class="center" style="margin:20px 0"><button class="speak-btn" style="width:96px;height:96px;font-size:40px" onclick="App.exSay()">🔊</button><button class="btn sm sec" onclick="App.exSlow()">🐢 Más lento</button></div>`;
      else if (q.big) h += `<div class="row" style="justify-content:center"><div class="big" style="${q.small ? 'font-size:24px' : ''}">${esc(q.big)}</div>${q.say && !q.small ? sayBtn(q.say, l) : ''}</div>${q.sub ? `<div class="center mut">${esc(q.sub)}</div>` : ''}`;
      if (q.pic) h += `<div class="pics">${q.options.map((o, k) => `<button class="opt pic" data-k="${k}" onclick="App.exMC(${k})">${esc(o)}</button>`).join('')}</div>`;
      else h += `<div class="opts">${q.options.map((o, k) => `<button class="opt" data-k="${k}" onclick="App.exMC(${k})">${esc(o)}</button>`).join('')}</div>`;
    } else if (q.type === 'pairs') {
      q.left = shuffle(q.pairs.map((p, k) => k)); q.right = shuffle(q.pairs.map((p, k) => k)); q.done = []; q.sel = null; q.err = 0;
      h += `<div class="mut">Toca las parejas</div><div class="q">Une cada palabra con su significado</div><div class="pairs">
        <div>${q.left.map(k => `<button class="opt" id="pl${k}" onclick="App.exP('l',${k})">${esc(q.pairs[k][0])}</button>`).join('')}</div>
        <div>${q.right.map(k => `<button class="opt" id="pr${k}" onclick="App.exP('r',${k})">${esc(q.pairs[k][1])}</button>`).join('')}</div></div>`;
    } else if (q.type === 'write') {
      h += `<div class="mut">${esc(q.prompt)}</div>${q.listen ? `<div class="center" style="margin:16px 0"><button class="speak-btn" style="width:90px;height:90px;font-size:38px" onclick="App.exSay()">🔊</button><button class="btn sm sec" onclick="App.exSlow()">🐢 Más lento</button></div>` : `<div class="big">${esc(q.big)}</div>`}
       <input id="wr" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${l === 'ja' ? 'Escribe en romaji → se convierte a kana' : 'Escribe aquí'}" onkeydown="if(event.key==='Enter')App.exW()" ${l === 'ja' ? 'oninput="App.ime(this)"' : ''}>
       ${l === 'ja' ? `<div class="row" style="margin-top:6px"><span class="mut grow">Teclado: <b id="imel">${S.ime === 'off' ? 'libre' : S.ime === 'kata' ? 'katakana' : 'hiragana'}</b></span><button class="btn sm sec" onclick="App.imeMode()">Cambiar</button></div>` : ''}
       <button class="btn full" style="margin-top:12px" onclick="App.exW()">Comprobar</button>`;
    } else if (q.type === 'build') {
      q.picked = [];
      h += `<div class="mut">${esc(q.prompt)}</div><div class="q">${esc(q.big)}</div><div class="tokens" id="ans"></div>
       <div class="row wrap" id="bank">${q.tokens.map((t, k) => `<button class="tok" data-k="${k}" onclick="App.exT(${k})">${esc(t)}</button>`).join('')}</div>
       <button class="btn full" style="margin-top:16px" onclick="App.exB()">Comprobar</button>`;
    } else if (q.type === 'speak') {
      h += `<div class="mut">Escucha y repite en voz alta</div><div class="row" style="justify-content:center;margin-top:10px">${sayBtn(q.text, l)}<button class="say" onclick="App.exSlow()">🐢</button></div>
       <div class="big" style="font-size:28px">${esc(disp(l, q.text))}</div>${q.pron ? `<div class="center mut">${esc(q.pron)}</div>` : ''}<div class="center mut">${esc(q.es)}</div>
       <button class="speak-btn" id="mic" onclick="App.exMic()">🎙️</button><div class="center mut" id="heard">Toca el micrófono y habla</div>
       <button class="btn sec full" style="margin-top:14px" onclick="App.exSkip()">No puedo hablar ahora</button>`;
    }
    $app.innerHTML = h;
    if (q.say && (q.listen || q.type === 'mc' && q.big)) setTimeout(() => speak(q.say, l), 250);
    if (q.type === 'speak') setTimeout(() => speak(q.text, l), 250);
    const w = document.getElementById('wr'); if (w) w.focus();
  }
  function feedback(ok, q, extra) {
    S.stats.answers++;
    const first = !answered.has(idx) && !q.retry;
    if (ok) { right++; streak++; S.stats.correct++; if (first) firstTry++; addXP(streak >= 5 ? 15 : 10); vib(30); sfx(streak >= 5 ? 'combo' : 'ok'); if (q.lvl != null) plc[q.lvl] = (plc[q.lvl] || 0) + 1; }
    else {
      streak = 0; vib(120); sfx('bad');
      if (['practice', 'speak', 'ai', 'kids', 'mistakes', 'pron'].includes(kind)) qs.push(Object.assign({}, q, { retry: true }));
      if (kind !== 'kids' && kind !== 'placement' && q.type !== 'speak' && q.type !== 'pairs' && l !== 'kana') {
        const m = { l, q: Object.assign({}, q, { retry: false, picked: undefined }), t: Date.now() };
        S.mistakes = [m].concat(S.mistakes.filter(x => JSON.stringify(x.q.answer) !== JSON.stringify(q.answer))).slice(0, 150);
      }
    }
    if (ok && kind === 'mistakes') S.mistakes = S.mistakes.filter(x => JSON.stringify(x.q.answer) !== JSON.stringify(q.answer));
    answered.add(idx); save();
    const ans = q.type === 'build' ? q.answer.join(l === 'ja' ? '' : ' ') : q.type === 'speak' ? q.text : q.type === 'pairs' ? q.pairs.map(p => p[0] + ' = ' + p[1]).join(' · ') : q.answer + (q.es ? ' (' + q.es + ')' : '');
    const fb = document.createElement('div'); fb.className = 'fb ' + (ok ? 'ok' : 'bad');
    fb.innerHTML = `<div class="in"><div class="q">${ok ? ['¡Excelente! 🎉', '¡Correcto! ✨', '¡Muy bien! 💪', '¡Perfecto! 🌟'][Math.floor(Math.random() * 4)] : 'Respuesta correcta:'}</div>
      ${!ok ? `<div style="font-size:18px;font-weight:700;margin-bottom:6px">${esc(disp(l, ans))}</div>` : ''}${extra || ''}
      ${q.explain ? `<div class="mut" style="margin-bottom:8px">${esc(q.explain)}</div>` : ''}
      <button class="btn full ${ok ? 'ok' : 'bad'}" onclick="App.exNext()">Continuar</button></div>`;
    document.body.appendChild(fb);
    if (q.say && q.type !== 'mc') speak(q.say, l); else if (q.sayAns) speak(q.answer, l);
  }
  A.exNext = () => { idx++; next(); };
  A.exP = (side, k) => {
    const q = qs[idx]; if (document.querySelector('.fb') || q.done.includes(k + side)) return;
    if (side === 'l') speak(q.pairs[k][0], l);
    if (!q.sel || q.sel[0] === side) { document.querySelectorAll('.pairs .sel').forEach(b => b.classList.remove('sel')); q.sel = [side, k]; document.getElementById('p' + side + k).classList.add('sel'); return; }
    const a = q.sel, other = side === 'l' ? 'r' : 'l'; q.sel = null;
    document.querySelectorAll('.pairs .sel').forEach(b => b.classList.remove('sel'));
    if (a[1] === k) {
      q.done.push(k + 'l', k + 'r'); ['l', 'r'].forEach(s => { const b = document.getElementById('p' + s + k); b.classList.add('right'); b.disabled = true; }); sfx('ok');
      if (q.done.length === q.pairs.length * 2) setTimeout(() => feedback(q.err <= 1, q, q.err ? `<div class="mut">${q.err} error(es)</div>` : ''), 250);
    } else { q.err++; sfx('bad'); vib(80); [['p' + a[0] + a[1]], ['p' + side + k]].forEach(([id]) => { const b = document.getElementById(id); b.classList.add('wrong'); setTimeout(() => b.classList.remove('wrong'), 450); }); }
  };
  A.exSay = () => speak(qs[idx].say || qs[idx].text, l);
  A.exSlow = () => speak(qs[idx].say || qs[idx].text, l, 0.55);
  A.exMC = (k) => {
    if (document.querySelector('.fb')) return;
    const q = qs[idx], o = q.options[k], ok = o === q.answer;
    document.querySelectorAll('.opt').forEach(b => { const v = q.options[+b.dataset.k]; if (v === q.answer) b.classList.add('right'); else if (+b.dataset.k === k) b.classList.add('wrong'); });
    feedback(ok, q);
  };
  A.exW = () => {
    if (document.querySelector('.fb')) return;
    const q = qs[idx]; let val = document.getElementById('wr').value;
    if (!val.trim()) return;
    const raw = val; if (l === 'ja') val = toKana(val, false, true);
    const s = Math.max(sim(norm(val, l), norm(q.answer, l)), q.pron ? sim(norm(raw, l), norm(q.pron, l)) : 0,
      l === 'ja' ? sim(norm(val, l), norm(toKana(q.answer, false, true), l)) : 0, l === 'ja' && q.pron ? sim(norm(val, l), norm(toKana(q.pron, false, true), l)) : 0);
    feedback(s >= 0.85, q, s >= 0.85 && s < 1 ? `<div class="mut">Casi perfecto: <b>${esc(q.answer)}</b></div>` : '');
  };
  A.exT = (k) => {
    const q = qs[idx]; if (document.querySelector('.fb')) return;
    const pos = q.picked.indexOf(k);
    if (pos >= 0) q.picked.splice(pos, 1); else q.picked.push(k);
    document.getElementById('ans').innerHTML = q.picked.map(j => `<button class="tok" onclick="App.exT(${j})">${esc(q.tokens[j])}</button>`).join('');
    document.querySelectorAll('#bank .tok').forEach(b => b.classList.toggle('used', q.picked.includes(+b.dataset.k)));
    speak(q.tokens[k], l);
  };
  A.exB = () => {
    const q = qs[idx]; if (document.querySelector('.fb') || !q.picked.length) return;
    const got = q.picked.map(j => q.tokens[j]).join(' ');
    feedback(norm(got, l) === norm(q.answer.join(' '), l), q);
  };
  let listening = false;
  A.exMic = async () => {
    if (listening || document.querySelector('.fb')) return;
    const q = qs[idx]; listening = true;
    const mic = document.getElementById('mic'); mic.classList.add('live');
    document.getElementById('heard').textContent = 'Escuchando… habla ahora';
    const r = await listen(l); listening = false;
    const m = document.getElementById('mic'); if (m) m.classList.remove('live');
    if (!r.ok) { const hd = document.getElementById('heard'); if (hd) hd.textContent = '⚠️ ' + r.err; return; }
    S.stats.spoken++;
    const sc = scoreSpeech(r.alts, q.text, l, q.pron);
    const ok = sc.score >= (l === 'ja' ? 60 : 70);
    feedback(ok, q, `<div>Escuché: <i>"${esc(sc.heard)}"</i></div><div class="diff" style="margin:4px 0">${diffHTML(disp(l, q.text), sc.heard, l)}</div><div><b>Precisión: ${sc.score}%</b></div>`);
  };
  A.exSkip = () => { answered.add(idx); idx++; next(); };
  window.__onSpeechPartial = (t) => { const hd = document.getElementById('heard'); if (hd) hd.textContent = '… ' + t; };
  function finish() {
    const pct = Math.round(firstTry / total * 100);
    S.stats.minutes += Math.round((Date.now() - t0) / 60000);
    let msg = '', pass = true;
    if (kind === 'quiz' || kind === 'skip') {
      pass = pct >= 80; const st = U(l, i); st.best = Math.max(st.best || 0, pct);
      if (pass) {
        st.steps.quiz = true; if (!st.done) { st.done = true; S.stats.lessons++; addXP(50); }
        if (kind === 'skip') { for (let j = 0; j < i; j++) { const s2 = U(l, j); if (!s2.done) { s2.done = true; s2.skipped = true; } } }
        if (i + 1 < NU()) U(l, i + 1).open = true;
        COURSE[l].units[i].v.forEach(v => srsAdd(l, v));
      }
      msg = pass ? '¡Unidad superada! Se desbloqueó la siguiente.' : 'Necesitas 80%. Repasa la teoría y la práctica e inténtalo de nuevo.';
    } else if (kind === 'practice') { markStep(l, i, 'practice', 30); msg = 'Práctica completada. Los errores se repitieron hasta acertarlos.'; }
    else if (kind === 'speak') { markStep(l, i, 'speak', 30); msg = 'Has entrenado tu pronunciación. ¡Sigue haciendo shadowing!'; }
    else if (kind === 'review') { msg = 'Repaso terminado.'; }
    else if (kind === 'placement') {
      let lv = -1; for (let k = 0; k < LEVELS.length; k++) { if ((plc[k] || 0) >= 2) lv = k; else break; }
      if (lv >= 0) { for (let j = 0; j <= LEVELS[lv].to; j++) { const s2 = U(l, j); if (!s2.done) { s2.done = true; s2.skipped = true; } } if (LEVELS[lv].to + 1 < NU()) U(l, LEVELS[lv].to + 1).open = true; }
      msg = lv >= 0 ? `Tu nivel en ${COURSE[l].name.toLowerCase()}: <b>${LEVELS[lv].n}</b>. Desbloqueé todo hasta ahí; empieza en ${LEVELS[Math.min(lv + 1, LEVELS.length - 1)].n}.` : 'Empieza desde el nivel Básico. ¡Vas a avanzar rápido!';
    }
    else if (kind === 'kids') { const ku = S.kids[arg.key] || (S.kids[arg.key] = { stars: 0 }); const st = pct >= 90 ? 3 : pct >= 70 ? 2 : 1; ku.stars = Math.max(ku.stars, st); msg = '⭐'.repeat(st) + ' ¡Lo hiciste genial!'; }
    else if (kind === 'mistakes') { msg = 'Los errores que acertaste salieron de tu cuaderno.'; }
    else msg = '¡Buen trabajo!';
    sfx('win');
    save();
    if (pass) confetti();
    setNav(false);
    $app.innerHTML = `<div class="card center" style="margin-top:40px"><div style="font-size:64px">${pass ? '🏆' : '💪'}</div><h2>${kind === 'quiz' || kind === 'skip' ? (pass ? 'Aprobado' : 'Casi…') : '¡Completado!'}</h2>
      <div class="big">${pct}%</div><p class="mut">aciertos al primer intento · ${right} respuestas correctas</p><p>${msg}</p>
      <button class="btn full" onclick="goBack()">Continuar</button>
      ${!pass ? `<button class="btn sec full" style="margin-top:10px" onclick="App.retry()">Reintentar</button>` : ''}</div>`;
    A.retry = () => startQuiz(l, i, kind === 'skip');
    if (arg.onDone) arg.onDone(pct);
  }
  next();
};

// ------------- repaso espaciado (SM‑2 simplificado)
function srsAdd(l, v) {
  const k = l + '|' + v[0];
  if (!S.srs[k]) S.srs[k] = { l, w: v[0], p: v[1] || '', m: v[2], due: dayNum(today()), iv: 0, ef: 2.5, n: 0 };
  save();
}
function dueCards() { const d = dayNum(today()); return Object.values(S.srs).filter(c => S.langs.includes(c.l) && c.due <= d); }
function srsRate(c, g) { // g: 0 otra vez, 1 difícil, 2 bien, 3 fácil
  const d = dayNum(today());
  if (g === 0) { c.n = 0; c.iv = 0; c.due = d; c.ef = Math.max(1.3, c.ef - 0.2); return; }
  c.n++;
  c.iv = c.n === 1 ? (g === 3 ? 3 : 1) : c.n === 2 ? (g === 1 ? 2 : g === 3 ? 6 : 3) : Math.round(c.iv * (g === 1 ? 1.2 : g === 3 ? c.ef * 1.3 : c.ef));
  c.ef = Math.max(1.3, c.ef + (g === 1 ? -0.15 : g === 3 ? 0.15 : 0));
  c.due = d + c.iv;
}
V.review = function () {
  let cards = shuffle(dueCards()).slice(0, 40);
  const totalCards = Object.keys(S.srs).length;
  if (!cards.length) {
    $app.innerHTML = top('Repasar') + `<div class="card center"><div style="font-size:56px">🧠</div><h2>¡Todo al día!</h2><p class="mut">${totalCards ? 'No tienes tarjetas pendientes hoy. Tienes ' + totalCards + ' tarjetas en tu memoria a largo plazo.' : 'Completa el paso "Vocabulario" de una unidad para empezar a construir tu mazo.'}</p></div>
    <div class="card"><h3>Estadísticas de memoria</h3>${S.langs.map(l => { const c = Object.values(S.srs).filter(x => x.l === l); const m = c.filter(x => x.iv >= 21).length; return `<div class="row" style="margin:6px 0"><span>${COURSE[l].flag}</span><span class="grow">${c.length} tarjetas</span><span class="mut">${m} dominadas</span></div>`; }).join('')}</div>
    <button class="btn sec full" onclick="App.revMix()">Práctica libre mezclada (intercalado)</button>`;
    A.revMix = () => { const all = Object.values(S.srs).filter(c => S.langs.includes(c.l)); if (!all.length) return toast('Aún no hay tarjetas'); cards = shuffle(all).slice(0, 20); k = 0; flip = false; draw(); };
    var k = 0, flip = false;
    return;
  }
  var k = 0, flip = false; let ok = 0;
  function draw() {
    if (k >= cards.length) { save(); addXP(0); confetti(); $app.innerHTML = top('Repasar') + `<div class="card center"><div style="font-size:56px">🎉</div><h2>Repaso completado</h2><p>${ok}/${cards.length} recordadas</p><button class="btn full" onclick="tabGo('home')">Volver al inicio</button></div>`; return; }
    const c = cards[k], C = COURSE[c.l];
    $app.innerHTML = top('Repasar ' + (k + 1) + '/' + cards.length) + `<div class="bar" style="margin-bottom:12px"><i style="width:${k / cards.length * 100}%"></i></div>
    <div class="card flash" style="border-top:4px solid ${C.color}" onclick="App.rFlip()"><span class="badge">${C.flag} ${C.name}</span><div class="big">${esc(c.w)}</div>
      ${flip ? `${c.p ? `<div class="mut">${esc(c.p)}</div>` : ''}<hr style="width:60%"><div class="q">${esc(c.m)}</div>` : '<div class="mut">¿Qué significa? Respóndelo mentalmente o en voz alta, luego toca.</div>'}</div>
    ${flip ? `<div class="grid2" style="grid-template-columns:repeat(4,1fr)"><button class="btn bad sm" onclick="App.rRate(0)">Otra vez</button><button class="btn sec sm" onclick="App.rRate(1)">Difícil</button><button class="btn sm" onclick="App.rRate(2)">Bien</button><button class="btn ok sm" onclick="App.rRate(3)">Fácil</button></div>`
      : `<div class="row">${sayBtn(c.w, c.l)}<button class="btn full grow" onclick="App.rFlip()">Mostrar respuesta</button></div>`}`;
    if (!flip) speak(c.w, c.l);
  }
  A.rFlip = () => { if (!flip) { flip = true; draw(); } };
  A.rRate = (g) => { const c = cards[k]; srsRate(c, g); if (g > 0) { ok++; addXP(5); } else cards.push(c); k++; flip = false; save(); draw(); };
  draw();
};

// ------------- conversación IA
V.talk = function () {
  const l0 = A._tl && S.langs.includes(A._tl) ? A._tl : S.langs[0];
  $app.innerHTML = top('Hablar', false) + `<div class="tabs">${S.langs.map(x => `<button class="${x === l0 ? 'on' : ''}" onclick="App._tl='${x}';render()">${COURSE[x].flag} ${COURSE[x].name}</button>`).join('')}</div>
  <div class="card"><b>Nivel detectado:</b> ${esc(levelOf(l0))}<div class="mut">La IA ajusta vocabulario y velocidad a tu nivel, corrige tus errores y te sugiere respuestas.</div></div>
  <div class="grid2">${SCENARIOS.map((s, k) => `<button class="tile ${curUnit(l0) < s.min ? 'lock' : ''}" style="${curUnit(l0) < s.min ? 'opacity:.55' : ''}" onclick="App.tSc(${k})"><span class="ic">${s.ic}</span><b>${s.t}</b><span class="mut">${s.d}</span></button>`).join('')}</div>
  <button class="btn sec full" style="margin-top:12px" onclick="go('pron')">🎙️ Laboratorio de pronunciación</button>`;
  A.tSc = (k) => go('chat', { l: l0, sc: SCENARIOS[k] });
};
V.chat = function ({ l, sc }) {
  const C = COURSE[l];
  const hist = [];
  let showTr = true, busy = false, sugg = [];
  S.stats.convs++; save();
  const sys = `Eres un compañero de conversación y tutor de ${LNAME[l]} para un hispanohablante. Nivel del alumno: ${levelOf(l)}.
Escenario de role‑play: ${sc.t} — ${sc.d}. Interpreta tu personaje de forma natural y haz preguntas para mantener la conversación.
Reglas: frases cortas (1‑3 oraciones) adaptadas al nivel; ${l === 'ja' ? 'usa japonés sencillo con kana y pocos kanji; da la lectura en romaji en "reading";' : ''} si el alumno escribe en español, ayúdale a decirlo en ${LNAME[l]}.
Responde SIEMPRE con JSON: {"reply":"tu respuesta en ${LNAME[l]}","reading":"${l === 'ja' ? 'romaji de reply' : ''}","translation":"traducción al español","correction":"si el último mensaje del alumno tenía errores: versión corregida + explicación breve en español; si no, cadena vacía","suggestions":["2 o 3 respuestas cortas posibles para el alumno en ${LNAME[l]}"]}`;
  function draw() {
    $app.innerHTML = top(`${sc.ic} ${esc(sc.t)}`) + `<div class="row" style="margin-bottom:10px"><span class="badge">${C.flag} ${C.name}</span><span class="grow"></span><button class="btn sm sec" onclick="App.cTr()">${showTr ? 'Ocultar' : 'Ver'} traducción</button><button class="btn sm sec" onclick="App.cEnd()">Evaluar</button></div>
    <div class="chat" id="chat">${hist.map((m, k) => m.role === 'user' ? `<div class="msg me">${esc(m.text)}</div>` :
      `<div class="msg ai"><div class="row" style="align-items:flex-start"><div class="grow">${esc(m.d.reply)}${m.d.reading ? `<div class="mut">${esc(m.d.reading)}</div>` : ''}</div>${sayBtn(m.d.reply, l)}</div>${showTr && m.d.translation ? `<div class="tr">${esc(m.d.translation)}</div>` : ''}${m.d.correction ? `<div class="cor">✏️ ${esc(m.d.correction)}</div>` : ''}</div>`).join('')}
      ${busy ? '<div class="msg ai"><div class="spin" style="margin:4px"></div></div>' : ''}</div>`;
    const comp = document.querySelector('.composer') || document.createElement('div');
    comp.className = 'composer';
    comp.innerHTML = `<div class="in">${sugg.length ? `<div class="sugg">${sugg.map((s, k) => `<button onclick="App.cSug(${k})">${esc(s)}</button>`).join('')}</div>` : ''}
      <div class="row"><input id="cin" placeholder="Escribe en ${C.name.toLowerCase()} (o en español si te atascas)" onkeydown="if(event.key==='Enter')App.cSend()"><button class="say" id="cmic" style="width:48px;height:48px;background:var(--pri)" onclick="App.cMic()">🎙️</button><button class="say" style="width:48px;height:48px" onclick="App.cSend()">➤</button></div></div>`;
    document.body.appendChild(comp);
    window.scrollTo(0, document.body.scrollHeight);
  }
  async function send(text) {
    if (busy || !text.trim()) return;
    hist.push({ role: 'user', text: text.trim() }); busy = true; sugg = []; draw();
    try {
      const t = await ai({ system: sys, json: true, temp: 0.8, messages: [{ role: 'user', text: 'Empieza la conversación con un saludo acorde al escenario.' }].concat(hist.map(m => m.role === 'user' ? m : { role: 'model', text: JSON.stringify(m.d) })) });
      const d = parseJSON(t); d.reply = d.reply || '…';
      hist.push({ role: 'model', d }); sugg = (d.suggestions || []).slice(0, 3); addXP(8);
      busy = false; draw(); speak(d.reply, l);
    } catch (e) { busy = false; hist.pop(); draw(); toast('IA: ' + e.message, 4000); }
  }
  async function start() {
    busy = true; draw();
    try {
      const t = await ai({ system: sys, json: true, temp: 0.8, messages: [{ role: 'user', text: 'Empieza la conversación con un saludo acorde al escenario.' }] });
      const d = parseJSON(t); hist.push({ role: 'model', d }); sugg = (d.suggestions || []).slice(0, 3); busy = false; draw(); speak(d.reply, l);
    } catch (e) { busy = false; $app.innerHTML = top(`${sc.ic} ${esc(sc.t)}`) + aiErr(e); document.querySelectorAll('.composer').forEach(x => x.remove()); }
  }
  A.cTr = () => { showTr = !showTr; draw(); };
  A.cSug = (k) => { const s = sugg[k]; speak(s, l); document.getElementById('cin').value = s; };
  A.cSend = () => { const i = document.getElementById('cin'); const v = i.value; i.value = ''; send(v); };
  A.cMic = async () => {
    const b = document.getElementById('cmic'); b.classList.add('live'); b.style.background = 'var(--bad)';
    window.__onSpeechPartial = (t) => { const i = document.getElementById('cin'); if (i) i.value = t; };
    const r = await listen(l); b.style.background = 'var(--pri)';
    if (!r.ok) return toast(r.err, 3000);
    S.stats.spoken++; send(r.alts[0]);
  };
  A.cEnd = async () => {
    const userMsgs = hist.filter(m => m.role === 'user').map(m => m.text);
    if (!userMsgs.length) return toast('Primero conversa un poco 🙂');
    document.querySelectorAll('.composer').forEach(x => x.remove());
    $app.innerHTML = top('📊 Evaluación') + '<div class="card center"><div class="spin"></div><p>Analizando tu conversación…</p></div>';
    try {
      const t = await ai({ messages: [{ role: 'user', text: `Evalúa en español los mensajes de un estudiante de ${LNAME[l]} (nivel ${levelOf(l)}) en una conversación sobre "${sc.t}". Mensajes: ${JSON.stringify(userMsgs)}.
Da: 1) puntuación /10 en gramática, vocabulario, fluidez; 2) los 3 errores más importantes con la corrección; 3) 5 frases o chunks útiles que debería aprender para este escenario (con traducción); 4) un reto concreto para la próxima vez. Formato markdown breve.` }] });
      addXP(20);
      $app.innerHTML = top('📊 Evaluación') + `<div class="card md">${md(t)}</div><button class="btn full" onclick="goBack()">Volver</button>`;
    } catch (e) { $app.innerHTML = top('📊 Evaluación') + aiErr(e); }
  };
  start();
};

// ------------- laboratorio de pronunciación (shadowing)
V.pron = function () {
  const l = A._pl && S.langs.includes(A._pl) ? A._pl : S.langs[0];
  const max = curUnit(l);
  let items = []; for (let i = 0; i <= max; i++) COURSE[l].units[i].s.forEach(s => items.push(s));
  items = shuffle(items).slice(0, 10);
  $app.innerHTML = top('🎙️ Pronunciación') + `<div class="tabs">${S.langs.map(x => `<button class="${x === l ? 'on' : ''}" onclick="App._pl='${x}';render()">${COURSE[x].flag} ${COURSE[x].name}</button>`).join('')}</div>
  <div class="card"><h3>Shadowing</h3><p class="mut">1) Escucha la frase. 2) Repítela imitando ritmo y entonación. 3) Mira tu precisión palabra por palabra. Repite hasta superar el 85%.</p></div>
  <button class="btn full" onclick="App.prGo()">Empezar 10 frases</button>`;
  A.prGo = () => go('ex', { l, i: max, kind: 'pron', qs: items.map(s => ({ type: 'speak', text: s[0], pron: s[1], es: s[2] })) }, true);
};

// ------------- kana
V.kana = function () {
  const set = A._ks || 'hira'; const K = KANA[set];
  $app.innerHTML = top('あ Kana') + `<div class="tabs"><button class="${set === 'hira' ? 'on' : ''}" onclick="App._ks='hira';render()">Hiragana</button><button class="${set === 'kata' ? 'on' : ''}" onclick="App._ks='kata';render()">Katakana</button></div>
  <button class="btn full" style="margin-bottom:12px" onclick="App.kQuiz()">🎯 Entrenar (20 preguntas)</button>
  <div class="kgrid">${K.map((k, j) => { const s = S.kana[k[0]]; const c = s ? (s.ok / (s.ok + s.bad) >= .8 && s.ok >= 3 ? 'var(--ok)' : 'var(--warn)') : 'transparent'; return `<button style="border-bottom:3px solid ${c}" onclick="App.kSay(${j})">${k[0]}<small>${k[1]}</small></button>`; }).join('')}</div>`;
  A.kSay = (j) => speak(K[j][0], 'ja');
  A.kQuiz = () => {
    // Prioriza los kana con más fallos
    const w = K.map(k => { const s = S.kana[k[0]] || { ok: 0, bad: 0 }; return { k, w: 1 + s.bad * 2 - Math.min(s.ok, 5) * .15 + Math.random() }; }).sort((a, b) => b.w - a.w).slice(0, 20).map(x => x.k);
    const qs = w.map((k, n) => n % 2 ? { type: 'mc', prompt: '¿Cómo se lee?', big: k[0], say: k[0], options: shuffle([k[1]].concat(pick(K.filter(x => x[1] !== k[1]).map(x => x[1]), 3))), answer: k[1], kana: k[0] }
      : { type: 'mc', prompt: 'Elige el kana de "' + k[1] + '"', options: shuffle([k[0]].concat(pick(K.filter(x => x[0] !== k[0]).map(x => x[0]), 3))), answer: k[0], kana: k[0], sayAns: true });
    go('ex', { l: 'ja', i: 0, kind: 'kana', qs });
  };
};
// registro de aciertos de kana: envolvemos feedback mediante listener de clic
document.addEventListener('click', (e) => {
  const b = e.target.closest('.opt'); if (!b || !view || view.name !== 'ex' || view.arg.kind !== 'kana') return;
  setTimeout(() => { const right = b.classList.contains('right'); const q = view.arg.qs.find(x => x.options && x.options.includes(b.textContent) && (x.answer === b.textContent || right === false)); const kn = q && q.kana; if (kn) { const s = S.kana[kn] || (S.kana[kn] = { ok: 0, bad: 0 }); right ? s.ok++ : s.bad++; save(); } }, 0);
});

// ------------- tutor IA, explicación, Feynman, escritura, lectura
V.tutor = function () {
  const hist = []; let busy = false;
  const l = A._tul && S.langs.includes(A._tul) ? A._tul : S.langs[0];
  function draw() {
    $app.innerHTML = top('🧑‍🏫 Tutor IA') + `<div class="tabs">${S.langs.map(x => `<button class="${x === l ? 'on' : ''}" onclick="App._tul='${x}';render()">${COURSE[x].flag} ${COURSE[x].name}</button>`).join('')}</div>
    ${hist.length ? '' : `<div class="card"><p>Pregúntame lo que quieras sobre ${LNAME[l]}: gramática, diferencias entre palabras, cómo decir algo, trucos para memorizar, cultura…</p><div class="sugg" style="flex-wrap:wrap">${['¿Cuál es la diferencia entre ' + (l === 'en' ? 'make y do' : l === 'pt' ? 'ser y estar en portugués' : 'は y が') + '?', 'Dame un truco para memorizar el vocabulario de esta semana', 'Hazme 5 preguntas de repaso de mi nivel', '¿Cómo digo "me encantaría ir contigo"?'].map(s => `<button onclick="App.tuAsk(this.textContent)">${esc(s)}</button>`).join('')}</div></div>`}
    <div class="chat">${hist.map(m => `<div class="msg ${m.role === 'user' ? 'me' : 'ai md'}">${m.role === 'user' ? esc(m.text) : md(m.text)}</div>`).join('')}${busy ? '<div class="msg ai"><div class="spin" style="margin:4px"></div></div>' : ''}</div>`;
    const comp = document.querySelector('.composer') || document.createElement('div'); comp.className = 'composer';
    comp.innerHTML = `<div class="in row"><input id="tin" placeholder="Escribe tu pregunta…" onkeydown="if(event.key==='Enter')App.tuSend()"><button class="say" style="width:48px;height:48px;background:var(--pri)" onclick="App.tuSend()">➤</button></div>`;
    document.body.appendChild(comp); window.scrollTo(0, document.body.scrollHeight);
  }
  A.tuAsk = async (q) => {
    if (busy || !q.trim()) return; hist.push({ role: 'user', text: q }); busy = true; draw();
    try {
      const t = await ai({ system: `Eres un tutor experto, paciente y motivador de ${LNAME[l]} para hispanohablantes. Nivel del alumno: ${levelOf(l)}. Responde en español, claro y conciso, con ejemplos en ${LNAME[l]} ${l === 'ja' ? '(con romaji)' : ''} y su traducción. Usa markdown simple.`, messages: hist });
      hist.push({ role: 'model', text: t }); addXP(5);
    } catch (e) { hist.push({ role: 'model', text: '⚠️ ' + e.message }); }
    busy = false; draw();
  };
  A.tuSend = () => { const i = document.getElementById('tin'); const v = i.value; i.value = ''; A.tuAsk(v); };
  draw();
};
V.aiExplain = async function ({ l, i }) {
  const u = COURSE[l].units[i];
  $app.innerHTML = top('🧑‍🏫 Explicación IA') + '<div class="card center"><div class="spin"></div><p>Preparando una explicación a tu medida…</p></div>';
  try {
    const t = await ai({ messages: [{ role: 'user', text: `Explica a un hispanohablante (nivel ${LV(i).cefr}) el tema "${u.t}" de ${LNAME[l]}. Base: ${u.g.replace(/<[^>]+>/g, ' ')}.
Incluye: 1) explicación sencilla con analogía con el español, 2) tabla o lista de formas, 3) 6 ejemplos con traducción${l === 'ja' ? ' y romaji' : ''}, 4) los 3 errores típicos de hispanohablantes, 5) un truco mnemotécnico, 6) mini‑reto de 3 frases para traducir (con soluciones al final). Markdown breve y visual.` }] });
    $app.innerHTML = top('🧑‍🏫 Explicación IA') + `<div class="card md">${md(t)}</div><button class="btn full" onclick="App.aeOk()">Entendido ✓</button>`;
    A.aeOk = () => { addXP(10); goBack(); };
  } catch (e) { $app.innerHTML = top('🧑‍🏫 Explicación IA') + aiErr(e); }
};
V.feynman = function ({ l, i }) {
  const u = COURSE[l].units[i];
  $app.innerHTML = top('👶 Técnica Feynman') + `<div class="card"><h3>${esc(u.t)}</h3><p>Explica con tus propias palabras (en español) la regla principal de esta unidad, como si se la enseñaras a un niño de 12 años. Incluye al menos 2 ejemplos en ${LNAME[l]}.</p></div>
  <textarea id="fy" placeholder="Mi explicación…"></textarea><button class="btn full" style="margin-top:12px" onclick="App.fyGo()">Evaluar mi explicación</button><div id="fyr" style="margin-top:12px"></div>`;
  A.fyGo = async () => {
    const txt = document.getElementById('fy').value.trim(); if (txt.length < 20) return toast('Escribe un poco más 🙂');
    document.getElementById('fyr').innerHTML = '<div class="spin"></div>';
    try {
      const t = await ai({ messages: [{ role: 'user', text: `Un estudiante explica el tema "${u.t}" de ${LNAME[l]}. Referencia correcta: ${u.g.replace(/<[^>]+>/g, ' ')}. Su explicación: """${txt}""". Evalúa en español: nota /10, qué entendió bien, qué le falta o tiene mal, y corrige sus ejemplos. Breve, motivador, markdown.` }] });
      document.getElementById('fyr').innerHTML = `<div class="card md">${md(t)}</div>`; addXP(25);
    } catch (e) { document.getElementById('fyr').innerHTML = aiErr(e); }
  };
};
V.writeLab = function ({ l, i }) {
  const u = COURSE[l].units[i];
  $app.innerHTML = top('📝 Escribe y corrijo') + `<div class="card"><p>Escribe 3‑5 frases en ${LNAME[l]} sobre ti usando el tema <b>${esc(u.t)}</b> y al menos 3 de estas palabras:</p><p>${u.v.map(v => `<span class="badge" style="display:inline-block;margin:2px">${esc(v[0])}</span>`).join(' ')}</p></div>
  <textarea id="wl" placeholder="Escribe aquí…"></textarea><div class="row" style="margin-top:12px"><button class="btn sec" onclick="App.wlMic()">🎙️ Dictar</button><button class="btn grow" onclick="App.wlGo()">Corregir</button></div><div id="wlr" style="margin-top:12px"></div>`;
  A.wlMic = async () => { const r = await listen(l); if (r.ok) { const t = document.getElementById('wl'); t.value += (t.value ? ' ' : '') + r.alts[0]; } else toast(r.err); };
  A.wlGo = async () => {
    const txt = document.getElementById('wl').value.trim(); if (txt.length < 5) return;
    document.getElementById('wlr').innerHTML = '<div class="spin"></div>';
    try {
      const t = await ai({ messages: [{ role: 'user', text: `Corrige este texto de un estudiante de ${LNAME[l]} (nivel ${LV(i).cefr}): """${txt}""". Responde en español con: 1) versión corregida completa, 2) lista de cada error → corrección → por qué, 3) una versión más natural/nativa, 4) nota /10. Markdown breve.` }] });
      document.getElementById('wlr').innerHTML = `<div class="card md">${md(t)}</div>`; addXP(25);
    } catch (e) { document.getElementById('wlr').innerHTML = aiErr(e); }
  };
};
V.reading = function () {
  const l = A._rl && S.langs.includes(A._rl) ? A._rl : S.langs[0];
  $app.innerHTML = top('📖 Lectura IA') + `<div class="tabs">${S.langs.map(x => `<button class="${x === l ? 'on' : ''}" onclick="App._rl='${x}';render()">${COURSE[x].flag} ${COURSE[x].name}</button>`).join('')}</div>
  <div class="card"><p>Genero un texto corto a tu nivel exacto (${esc(levelOf(l))}) con preguntas de comprensión. Input comprensible = aprendizaje rápido.</p><input id="rt" placeholder="Tema opcional (ej: viajes, fútbol, comida…)"></div>
  <button class="btn full" onclick="App.rdGo()">Generar lectura</button><div id="rd" style="margin-top:12px"></div>`;
  A.rdGo = async () => {
    const topic = document.getElementById('rt').value.trim();
    document.getElementById('rd').innerHTML = '<div class="spin"></div>';
    try {
      const t = await ai({ json: true, temp: 0.9, messages: [{ role: 'user', text: `Escribe un texto breve (${curUnit(l) < 8 ? '60-90' : curUnit(l) < 16 ? '120-160' : '180-250'} palabras) en ${LNAME[l]} para nivel ${levelOf(l)}${topic ? ' sobre ' + topic : ''}. ${l === 'ja' ? 'Usa principalmente kana, pocos kanji, separa con espacios naturales.' : ''}
JSON: {"title":"…","text":"…","reading":"${l === 'ja' ? 'romaji' : ''}","translation":"traducción al español","glossary":[["palabra","significado"]],"questions":[{"q":"pregunta en español","options":["a","b","c"],"answer":0}]} con 6 palabras de glosario y 4 preguntas.` }] });
      const d = parseJSON(t);
      document.getElementById('rd').innerHTML = `<div class="card"><div class="row"><h2 class="grow">${esc(d.title)}</h2>${sayBtn(d.text, l)}</div><p style="font-size:18px;line-height:1.7">${esc(d.text)}</p>${d.reading ? `<p class="mut">${esc(d.reading)}</p>` : ''}
        <details><summary class="mut">Ver traducción</summary><p>${esc(d.translation)}</p></details></div>
        <div class="card"><h3>Glosario</h3>${(d.glossary || []).map(g => `<div class="vocab">${sayBtn(g[0], l)}<div class="grow w" style="font-size:16px">${esc(g[0])}</div><div>${esc(g[1])}</div></div>`).join('')}
        <button class="btn sm sec" style="margin-top:8px" onclick="App.rdAdd()">+ Añadir al repaso</button></div>
        <button class="btn full" onclick="App.rdQ()">Responder preguntas</button>`;
      A.rdAdd = () => { (d.glossary || []).forEach(g => srsAdd(l, [g[0], '', g[1]])); toast('Añadidas al repaso ✓'); };
      A.rdQ = () => go('ex', { l, i: curUnit(l), kind: 'ai', qs: (d.questions || []).map(q => ({ type: 'mc', prompt: q.q, options: q.options, answer: q.options[q.answer | 0] })) });
      addXP(10);
    } catch (e) { document.getElementById('rd').innerHTML = aiErr(e); }
  };
};

// ------------- más / ajustes / estadísticas / pomodoro
V.more = function () {
  $app.innerHTML = top('Más', false) + `<div class="grid2">
    <button class="tile" onclick="go('tutor')"><span class="ic">🧑‍🏫</span><b>Tutor IA</b><span class="mut">Pregunta lo que quieras</span></button>
    <button class="tile" onclick="go('reading')"><span class="ic">📖</span><b>Lectura IA</b><span class="mut">Textos a tu nivel</span></button>
    <button class="tile" onclick="go('pron')"><span class="ic">🎙️</span><b>Pronunciación</b><span class="mut">Shadowing con puntuación</span></button>
    ${S.langs.includes('ja') ? `<button class="tile" onclick="go('kana')"><span class="ic">あ</span><b>Kana</b><span class="mut">Hiragana y katakana</span></button>` : ''}
    <button class="tile" onclick="go('method')"><span class="ic">🚀</span><b>Método y técnicas</b><span class="mut">Aprende a aprender</span></button>
    <button class="tile" onclick="go('focus')"><span class="ic">⏱️</span><b>Modo enfoque</b><span class="mut">Pomodoro 25/5</span></button>
    <button class="tile" onclick="go('songs')"><span class="ic">🎵</span><b>Canciones</b><span class="mut">Con subtítulos</span></button>
    <button class="tile" onclick="go('books')"><span class="ic">📚</span><b>Libros</b><span class="mut">Clásicos y cuentos</span></button>
    ${S.langs.includes('ja') ? `<button class="tile" onclick="go('jwrite')"><span class="ic">✍️</span><b>Escribir japonés</b><span class="mut">Hiragana, katakana y kanji</span></button><button class="tile" onclick="go('kanji')"><span class="ic">漢</span><b>Kanji</b><span class="mut">${JP_TOTAL_KANJI()} kanji N5–N1</span></button>` : ''}
    <button class="tile" onclick="go('mistakes')"><span class="ic">📒</span><b>Mis errores</b><span class="mut">${S.mistakes.length} por repasar</span></button>
    <button class="tile" onclick="App.toKids()"><span class="ic">🧸</span><b>Modo niños</b><span class="mut">Niveles 1 y 2</span></button>
    <button class="tile" onclick="go('stats')"><span class="ic">📊</span><b>Estadísticas</b><span class="mut">Tu progreso</span></button>
    <button class="tile" onclick="go('settings')"><span class="ic">⚙️</span><b>Ajustes</b><span class="mut">IA, voz, metas</span></button>
  </div>`;
};
V.stats = function () {
  const days = []; for (let k = 13; k >= 0; k--) { const d = new Date(Date.now() - k * 864e5); const s = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); days.push([s.slice(8), S.hist[s] || 0]); }
  const mx = Math.max(S.goal, ...days.map(d => d[1]));
  const acc = S.stats.answers ? Math.round(S.stats.correct / S.stats.answers * 100) : 0;
  $app.innerHTML = top('📊 Estadísticas') + `<div class="grid2">
   <div class="card center"><div class="big">${S.xp}</div><div class="mut">XP total</div></div><div class="card center"><div class="big">🔥${streakAlive()}</div><div class="mut">racha (mejor ${S.best})</div></div>
   <div class="card center"><div class="big">${acc}%</div><div class="mut">precisión</div></div><div class="card center"><div class="big">${S.stats.spoken}</div><div class="mut">frases habladas</div></div>
   <div class="card center"><div class="big">${S.stats.convs}</div><div class="mut">conversaciones</div></div><div class="card center"><div class="big">${Object.keys(S.srs).length}</div><div class="mut">tarjetas</div></div></div>
   <div class="card"><h3>Últimos 14 días</h3><div class="row" style="align-items:flex-end;height:120px;gap:4px">${days.map(d => `<div class="grow center"><div style="height:${Math.max(3, d[1] / mx * 100)}px;background:${d[1] >= S.goal ? 'var(--ok)' : 'var(--pri)'};border-radius:6px"></div><div class="mut" style="font-size:10px">${d[0]}</div></div>`).join('')}</div></div>
   <div class="card"><h3>Por idioma</h3>${S.langs.map(l => `<div class="row" style="margin:8px 0"><span>${COURSE[l].flag}</span><span class="grow">${COURSE[l].name} · ${LV(curUnit(l)).cefr}</span><span class="mut">${doneCount(l)}/${NU()}</span></div>`).join('')}</div>`;
};
V.focus = function () {
  let left = 25 * 60, mode = 'focus', timer = null;
  function draw() {
    const m = Math.floor(left / 60), s = left % 60;
    $app.innerHTML = top('⏱️ Modo enfoque') + `<div class="card center"><div class="mut">${mode === 'focus' ? 'Enfoque total: sin redes ni distracciones' : 'Descanso: levántate, estira, bebe agua'}</div>
     <div class="big" style="font-size:72px">${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}</div>
     <div class="row"><button class="btn grow" onclick="App.fToggle()">${timer ? 'Pausar' : 'Iniciar'}</button><button class="btn sec" onclick="App.fReset()">Reiniciar</button></div></div>
     <div class="card"><h3>Sugerencia para este bloque</h3><p>1) 10 min de lección nueva · 2) 10 min de repaso de tarjetas · 3) 5 min de conversación o shadowing.</p></div>`;
  }
  A.fToggle = () => {
    if (timer) { clearInterval(timer); timer = null; draw(); return; }
    timer = setInterval(() => {
      if (!view || view.name !== 'focus') { clearInterval(timer); return; }
      left--; if (left <= 0) { vib(800); if (mode === 'focus') { addXP(20); S.stats.minutes += 25; save(); mode = 'break'; left = 5 * 60; toast('¡Bloque completado! +20 XP'); } else { mode = 'focus'; left = 25 * 60; } }
      draw();
    }, 1000); draw();
  };
  A.fReset = () => { clearInterval(timer); timer = null; left = 25 * 60; mode = 'focus'; draw(); };
  draw();
};
V.settings = function () {
  const key = getKey();
  const voices = NATIVE ? S.langs.map(l => { let ok = false; try { ok = Android.ttsHas(l); } catch (e) { } return `<div class="row"><span>${COURSE[l].flag}</span><span class="grow">${COURSE[l].name}</span><span>${ok ? '✅ voz instalada' : '⚠️ falta voz'}</span></div>`; }).join('') : '<p class="mut">En el navegador se usan las voces del sistema.</p>';
  $app.innerHTML = top('⚙️ Ajustes') + `
  <div class="card"><h3>🤖 Gemini (IA)</h3><p class="mut">Estado: ${key ? '✅ clave configurada (…' + esc(key.slice(-4)) + ')' : '❌ sin clave'}</p>
    <input id="k" placeholder="Nueva API key de Gemini" autocomplete="off"><div style="height:8px"></div>
    <select id="mdl">${['gemini-flash-latest', 'gemini-flash-lite-latest', 'gemini-3.5-flash', 'gemini-3.8-flash', 'gemini-pro-latest'].map(m => `<option ${getModel() === m ? 'selected' : ''}>${m}</option>`).join('')}</select>
    <div class="row" style="margin-top:10px"><button class="btn sm" onclick="App.sKey()">Guardar</button><button class="btn sm sec" onclick="App.sTest()">Probar conexión</button></div><div id="tst" class="mut" style="margin-top:8px"></div></div>
  <div class="card"><h3>🔊 Voz</h3>${voices}<label class="mut">Velocidad de lectura: <b id="rv">${S.rate}</b></label><input type="range" min="0.5" max="1.3" step="0.05" value="${S.rate}" oninput="App.sRate(this.value)" style="padding:0">
    <div class="row" style="margin-top:8px"><button class="btn sm sec" onclick="App.sHear()">Probar voces</button>${NATIVE ? '<button class="btn sm sec" onclick="Android.installVoices()">Instalar voces</button>' : ''}</div>
    <p class="mut">Para reconocimiento de voz en japonés/portugués sin conexión: Ajustes de Android → Google → Voz → Idiomas sin conexión.</p></div>
  <div class="card"><h3>👁️ Accesibilidad</h3><label class="mut">Tamaño de letra: <b id="fv">${S.font || 100}%</b></label><input type="range" min="85" max="140" step="5" value="${S.font || 100}" oninput="App.sFont(this.value)" style="padding:0">
    <div class="row" style="margin-top:8px"><span class="grow">Efectos de sonido</span><button class="btn sm sec" onclick="App.sSfx()">${S.sfx ? '🔔 Activados' : '🔕 Desactivados'}</button></div>
    <div class="row" style="margin-top:8px"><span class="grow">Modo niños (interfaz infantil)</span><button class="btn sm sec" onclick="App.toKids()">🧸 Activar</button></div></div>
  <div class="card"><h3>🎯 Plan</h3><label class="mut">Meta diaria (XP)</label><select onchange="App.sGoal(this.value)">${[90, 150, 250, 400].map(g => `<option ${S.goal == g ? 'selected' : ''}>${g}</option>`).join('')}</select>
    <p class="mut">Inicio del plan: ${S.started}</p><label class="mut">Idiomas activos</label><div class="row wrap">${LANGS.map(l => `<button class="lang-chip ${S.langs.includes(l) ? 'on' : ''}" onclick="App.sLang('${l}')">${S.langs.includes(l) ? '✅' : '➕'} ${COURSE[l].flag} ${COURSE[l].name}</button>`).join('')}</div></div>
  <div class="card"><h3>💾 Datos</h3><div class="row wrap"><button class="btn sm sec" onclick="App.sExp()">Exportar progreso</button><button class="btn sm sec" onclick="App.sImp()">Importar</button><button class="btn sm bad" onclick="App.sReset()">Borrar todo</button></div><textarea id="io" style="margin-top:10px;display:none"></textarea></div>
  <div class="card"><h3>📜 Créditos y licencias</h3><p class="mut">Trazos: AnimCJK / Make Me a Hanzi (LGPL v3 y Arphic PL). Kanji y vocabulario: KANJIDIC2 / JMdict © EDRDG (CC BY-SA 4.0). Canciones y libros: dominio público.</p><div class="row wrap">${['CREDITS.txt', 'LGPL.txt', 'ARPHICPL.TXT', 'COPYING.txt', 'kanji-data-MIT.txt'].map(f => `<a class="btn sm sec" href="licenses/${f}">${f}</a>`).join('')}</div></div>
  <p class="mut center">TriLingo 2.2 · hecho para aprender 3× más rápido</p>`;
  A.sKey = () => { const k = document.getElementById('k').value.trim(); if (k) setKey(k); setModel(document.getElementById('mdl').value); toast('Guardado ✓'); render(); };
  A.sTest = async () => { setModel(document.getElementById('mdl').value); const e = document.getElementById('tst'); e.textContent = 'Probando…'; try { const t = await ai({ messages: [{ role: 'user', text: 'Responde solo: "¡Conexión OK! 👋" y un saludo en inglés, portugués y japonés en una línea.' }] }); e.textContent = '✅ ' + t; } catch (x) { e.textContent = '❌ ' + x.message; } };
  A.sRate = (v) => { S.rate = +v; document.getElementById('rv').textContent = v; save(); };
  A.sHear = () => { const ph = { en: 'Hello! Nice to meet you.', pt: 'Olá! Muito prazer.', ja: 'こんにちは。はじめまして。' }; let d = 0; S.langs.forEach(l => { setTimeout(() => speak(ph[l], l), d); d += 2600; }); };
  A.sGoal = (g) => { S.goal = +g; save(); };
  A.sFont = (v) => { S.font = +v; document.getElementById('fv').textContent = v + '%'; save(); window.applyFont(); };
  A.sSfx = () => { S.sfx = !S.sfx; save(); render(); };
  A.sLang = (l) => { if (S.langs.includes(l)) { if (S.langs.length > 1) S.langs = S.langs.filter(x => x !== l); } else S.langs = LANGS.filter(x => x === l || S.langs.includes(x)); save(); render(); };
  A.sExp = () => { const t = document.getElementById('io'); t.style.display = 'block'; t.value = JSON.stringify(S); t.select(); try { document.execCommand('copy'); toast('Copiado al portapapeles'); } catch (e) { } };
  A.sImp = () => { const t = document.getElementById('io'); if (t.style.display !== 'block') { t.style.display = 'block'; t.placeholder = 'Pega aquí tu progreso exportado y vuelve a pulsar Importar'; return; } try { const s = JSON.parse(t.value); if (!s.v) throw 0; S = Object.assign({}, DEF, s); save(); toast('Importado ✓'); render(); } catch (e) { toast('Texto inválido'); } };
  A.sReset = () => { if (confirm('¿Borrar TODO tu progreso? No se puede deshacer.')) { localStorage.removeItem('tl_state'); S = load(); stack = []; view = null; render(); } };
};

// ------------------------------------------------------------------ globales y arranque
A.ime = (el) => { if (S.ime === 'off') return; const v = el.value; const c = toKana(v, S.ime === 'kata', false); if (c !== v) el.value = c; };
A.imeMode = () => { S.ime = (!S.ime || S.ime === 'hira') ? 'kata' : S.ime === 'kata' ? 'off' : 'hira'; save(); const e = document.getElementById('imel'); if (e) e.textContent = S.ime === 'off' ? 'libre' : S.ime === 'kata' ? 'katakana' : 'hiragana'; const w = document.getElementById('wr'); if (w) w.focus(); };
A.toKids = () => { S.mode = 'kids'; save(); stack = []; view = { name: 'kidsHome' }; render(); };
window.go = go; window.tabGo = tabGo; window.render = render;
// API interna para los módulos de features.js
window.TL = {
  get S() { return S; }, V, A, go, render, speak, listen, ai, parseJSON, md, esc, shuffle, pick, disp, norm, sim, sayBtn, toast, addXP, save, srsAdd,
  scoreSpeech, diffHTML, top, confetti, levelOf, LNAME, aiErr, vib, setNav, sfx, openUrl, toKana, hira2kata, kata2hira, curUnit, U, NU, LV, today,
  get stack() { return stack; }, set stack(v) { stack = v; }, get view() { return view; }, set view(v) { view = v; }, $app
};
function applyFont() { document.documentElement.style.fontSize = (S.font || 100) + '%'; document.body.style.fontSize = (16 * (S.font || 100) / 100) + 'px'; }
touchDay(); applyFont(); window.applyFont = applyFont;
setTimeout(() => { if (S.mode === 'kids' && S.started) view = { name: 'kidsHome' }; render(); }, 0);
})();
