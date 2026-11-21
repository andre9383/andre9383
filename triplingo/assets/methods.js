/* TriLingo — Métodos de los mejores canales de YouTube:
   inmersión con horas de input, minado de frases, entrenamiento del oído (pares mínimos),
   hablar contigo mismo, núcleo de alta frecuencia y "padre lingüístico". */
(function () {
'use strict';
const T = window.TL, V = T.V, A = T.A;
const { esc, shuffle, pick, speak, sayBtn, toast, go, top, md, ai, aiErr, LNAME } = T;
const S = () => T.S;
const FL = { en: '🇬🇧', pt: '🇧🇷', ja: '🇯🇵' }, LN = { en: 'Inglés', pt: 'Portugués', ja: 'Japonés' };
const cur = (k) => A[k] && S().langs.includes(A[k]) ? A[k] : S().langs[0];
const tabs = (l, k) => `<div class="tabs">${S().langs.map(x => `<button class="${x === l ? 'on' : ''}" onclick="App['${k}']='${x}';render()">${FL[x]} ${LN[x]}</button>`).join('')}</div>`;
const M = () => { const s = S(); s.meth = s.meth || { input: {}, inputDay: {}, mined: {}, talk: {}, goal: 30 }; return s.meth; };
const td = () => T.today();

// ------------------------------------------------------------------ API compartida
const API = window.METH = {
  addInput(l, min) {
    const m = M(); min = Math.max(0, Math.round(min)); if (!min) return;
    m.input[l] = (m.input[l] || 0) + min; m.inputDay[td()] = (m.inputDay[td()] || 0) + min;
    T.addXP(Math.min(40, min)); T.save();
    const h = m.input[l] / 60, prev = (m.input[l] - min) / 60;
    const hit = INPUT_MILESTONES.find(x => prev < x[0] && h >= x[0]);
    if (hit) { T.confetti(); toast(`${FL[l]} ¡${hit[0]} horas de input! ${hit[1]}`, 4000); } else toast(`+${min} min de input en ${LN[l]} ✓`);
  },
  mine(l, text, pron, es) {
    if (!text) return; T.srsAdd(l, [String(text).replace(/ /g, l === 'ja' ? '' : ' '), pron || '', es || '']);
    const m = M(); m.mined[td()] = (m.mined[td()] || 0) + 1; T.addXP(3); T.save(); toast('⛏️ Frase minada al repaso');
  },
  today() { const m = M(); return { input: m.inputDay[td()] || 0, goal: m.goal || 30, mined: m.mined[td()] || 0, talk: !!m.talk[td()] }; }
};

// ------------------------------------------------------------------ hub de métodos
V.methods = function () {
  const t = API.today();
  T.$app.innerHTML = top('🧭 Método de los expertos') + `
  <div class="card"><p>Lo que enseñan los canales y charlas más vistos sobre idiomas (TED, TEDx, polyglots e inmersión), convertido en rutinas diarias.</p>
    <div class="grid3" style="margin-top:8px">
      <div class="center"><div class="q">${t.input}/${t.goal}</div><div class="mut">min de input hoy</div></div>
      <div class="center"><div class="q">${t.mined}/5</div><div class="mut">frases minadas</div></div>
      <div class="center"><div class="q">${t.talk ? '✅' : '—'}</div><div class="mut">reto de hablar</div></div></div></div>
  <div class="grid2">
    <button class="tile" onclick="go('immersion')"><span class="ic">🎧</span><b>Inmersión</b><span class="mut">Input comprensible y horas acumuladas</span></button>
    <button class="tile" onclick="go('selftalk')"><span class="ic">🗣️</span><b>Habla contigo</b><span class="mut">Monólogo de 1 min + feedback IA</span></button>
    <button class="tile" onclick="go('ear')"><span class="ic">👂</span><b>Entrena el oído</b><span class="mut">Pares mínimos</span></button>
    <button class="tile" onclick="go('core')"><span class="ic">🎯</span><b>Núcleo 50 + herramientas</b><span class="mut">Lo más frecuente primero</span></button>
    <button class="tile" onclick="go('shadow')"><span class="ic">🪞</span><b>Shadowing 3×</b><span class="mut">Lento → normal → rápido</span></button>
    <button class="tile" onclick="go('books')"><span class="ic">⛏️</span><b>Minar frases</b><span class="mut">De libros, canciones y chats</span></button>
  </div>
  <div class="month">Fuentes (toca para ver el vídeo)</div>
  ${METHOD_SOURCES.map(s => `<button class="card" style="display:block;width:100%;text-align:left" onclick="App.mvYT('${s.id}')"><b>▶️ ${esc(s.t)}</b><div class="mut">${esc(s.by)}</div><p style="margin:6px 0 0;font-size:14px">${esc(s.p)}</p></button>`).join('')}`;
  A.mvYT = (id) => T.openUrl('https://www.youtube.com/watch?v=' + id);
};

// ------------------------------------------------------------------ inmersión
let watch = null; // {l, t0}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible' || !watch) return;
  const mins = Math.round((Date.now() - watch.t0) / 60000), l = watch.l; watch = null;
  if (mins < 1) return;
  setTimeout(() => { const v = prompt(`¿Cuántos minutos estuviste escuchando ${LN[l].toLowerCase()}?`, Math.min(mins, 180)); if (v && +v > 0) { API.addInput(l, +v); T.render(); } }, 400);
});
V.immersion = function () {
  const l = cur('_il'), m = M(), min = m.input[l] || 0, h = min / 60;
  const next = INPUT_MILESTONES.find(x => h < x[0]) || INPUT_MILESTONES[INPUT_MILESTONES.length - 1];
  const prev = [...INPUT_MILESTONES].reverse().find(x => h >= x[0]);
  const t = API.today();
  T.$app.innerHTML = top('🎧 Inmersión') + tabs(l, '_il') + `
  <div class="card"><div class="row"><div class="grow"><b>${FL[l]} ${(h).toFixed(1)} horas de input</b><div class="mut">${prev ? prev[1] : 'Empieza hoy: cada minuto cuenta'}</div></div><div class="q">${Math.round(h / next[0] * 100)}%</div></div>
    <div class="bar" style="margin:8px 0"><i style="width:${Math.min(100, h / next[0] * 100)}%;background:var(--${l})"></i></div><div class="mut">Siguiente hito: ${next[0]} h · ${next[1]}</div></div>
  <div class="card"><b>Hoy: ${t.input}/${t.goal} min</b> <span class="mut">(todos los idiomas)</span><div class="bar" style="margin:8px 0"><i style="width:${Math.min(100, t.input / t.goal * 100)}%"></i></div>
    <div class="row wrap" style="gap:6px"><span class="mut grow">Registrar tiempo:</span>${[10, 20, 30, 60].map(x => `<button class="btn sm sec" onclick="App.imAdd(${x})">+${x}</button>`).join('')}</div></div>
  <div class="card"><h3>Cómo hacerlo (input comprensible)</h3><p class="mut" style="margin:0">1) Elige contenido que entiendas ~70‑90%. 2) No pares por cada palabra: <b>tolera la ambigüedad</b>. 3) Escucha también en segundo plano (cocinando, caminando). 4) Mina 5 frases útiles al día. 5) Sube de nivel cuando lo entiendas casi todo.</p></div>
  <div class="month">Canales recomendados · ${LN[l]}</div>
  ${CHANNELS[l].map((c, k) => `<button class="unit" onclick="App.imGo(${k})"><div class="n" style="font-size:20px">▶️</div><div class="grow"><b>${esc(c.n)}</b><div class="mut">${esc(c.why)}</div></div><span class="badge">${esc(c.lv)}</span></button>`).join('')}
  <p class="mut">Al volver de YouTube, la app te preguntará cuántos minutos escuchaste y los sumará.</p>`;
  A.imAdd = (x) => { API.addInput(l, x); T.render(); };
  A.imGo = (k) => { watch = { l, t0: Date.now() }; T.openUrl('https://www.youtube.com/@' + CHANNELS[l][k].h + '/videos'); };
};

// ------------------------------------------------------------------ núcleo de alta frecuencia + caja de herramientas
V.core = function () {
  const l = cur('_cl'), C = CORE[l];
  const words = C.words.split('|').map(x => { const [w, rest] = x.split('='); const [p, m] = rest.includes(' · ') ? rest.split(' · ') : ['', rest]; return [w, p, m]; });
  T.$app.innerHTML = top('🎯 Núcleo + herramientas') + tabs(l, '_cl') + `
  <div class="card"><p class="mut" style="margin:0">"Con 1000 palabras cubres el 85% de lo cotidiano" (Chris Lonsdale). Empieza por la <b>caja de herramientas</b>: frases para aprender usando el idioma desde el día 1.</p></div>
  <div class="card"><h3>🧰 Caja de herramientas</h3>${C.tools.map(v => `<div class="vocab">${sayBtn(v[0].replace(/〜/g, ''), l)}<div class="grow"><div class="w">${esc(v[0])}</div>${v[1] ? `<div class="mut">${esc(v[1])}</div>` : ''}</div><div>${esc(v[2])}</div></div>`).join('')}</div>
  <div class="row"><button class="btn grow" onclick="App.coQuiz()">🎯 Practicar (20)</button><button class="btn sec grow" onclick="App.coAdd()">+ Todo al repaso</button></div>
  <div class="card" style="margin-top:12px"><h3>Las 50 más frecuentes</h3>${words.map(v => `<div class="vocab">${sayBtn(v[0], l)}<div class="grow"><div class="w">${esc(v[0])}</div>${v[1] ? `<div class="mut">${esc(v[1])}</div>` : ''}</div><div>${esc(v[2])}</div></div>`).join('')}</div>`;
  A.coAdd = () => { C.tools.concat(words).forEach(v => T.srsAdd(l, v)); toast('Añadidas ' + (words.length + C.tools.length) + ' tarjetas ✓'); };
  A.coQuiz = () => {
    const all = words.concat(C.tools);
    const qs = pick(all, 20).map(v => Math.random() < .5
      ? { type: 'mc', prompt: '¿Qué significa?', big: v[0], sub: v[1], say: v[0].replace(/〜/g, ''), small: v[0].length > 8, options: shuffle([v[2]].concat(pick(all.filter(x => x[2] !== v[2]).map(x => x[2]), 3))), answer: v[2] }
      : { type: 'mc', listen: true, prompt: 'Escucha y elige el significado', say: v[0].replace(/〜/g, ''), options: shuffle([v[2]].concat(pick(all.filter(x => x[2] !== v[2]).map(x => x[2]), 3))), answer: v[2] });
    go('ex', { l, i: 0, kind: 'ai', qs });
  };
};

// ------------------------------------------------------------------ entrenar el oído: pares mínimos
V.ear = function () {
  const l = cur('_el'), P = MINPAIRS[l];
  T.$app.innerHTML = top('👂 Entrena el oído') + tabs(l, '_el') + `
  <div class="card"><p class="mut" style="margin:0">Tu cerebro filtra los sonidos que no existen en español (Lonsdale: "si no lo oyes, no lo entiendes"). Escucha y elige: así creas las categorías de sonido nuevas.</p></div>
  <button class="btn full" onclick="App.eaGo()">🎧 Empezar (16 rondas)</button>
  <div class="card" style="margin-top:12px">${P.map(p => `<div class="vocab"><button class="say" onclick="App.eaS('${esc(p[0])}')">🔊</button><b class="grow">${esc(p[0])}</b><button class="say" onclick="App.eaS('${esc(p[1])}')">🔊</button><b class="grow">${esc(p[1])}</b><span class="mut">${esc(p[2])}</span></div>`).join('')}</div>`;
  A.eaS = (w) => speak(w, l, .85);
  A.eaGo = () => {
    const qs = []; for (let k = 0; k < 16; k++) { const p = P[k % P.length], w = p[Math.random() < .5 ? 0 : 1]; qs.push({ type: 'mc', listen: true, prompt: '¿Cuál escuchas? (' + p[2] + ')', say: w, options: shuffle([p[0], p[1]]), answer: w }); }
    go('ex', { l, i: 0, kind: 'ai', qs: shuffle(qs) });
  };
};

// ------------------------------------------------------------------ shadowing 3× (lento → normal → rápido)
V.shadow = function () {
  const l = cur('_shl'), max = T.curUnit(l);
  let pool = []; for (let i = 0; i <= max; i++) pool = pool.concat(COURSE[l].units[i].s);
  const items = pick(pool, 5);
  T.$app.innerHTML = top('🪞 Shadowing 3×') + tabs(l, '_shl') + `
  <div class="card"><p class="mut" style="margin:0">Cada frase 3 veces: escúchala <b>lenta</b>, luego <b>normal</b> y luego <b>rápida</b>, repitiendo a la vez. Imita ritmo, entonación y "la cara" del hablante. Al final la app evalúa tu pronunciación.</p></div>
  ${items.map((s, k) => `<div class="card"><div class="row"><div class="grow"><div class="w" style="font-size:19px;font-weight:700">${esc(T.disp(l, s[0]))}</div>${s[1] ? `<div class="mut">${esc(s[1])}</div>` : ''}<div class="mut">${esc(s[2])}</div></div></div>
    <div class="row" style="gap:6px;margin-top:8px"><button class="btn sm sec" onclick="App.shP(${k},.6)">🐢 Lento</button><button class="btn sm sec" onclick="App.shP(${k},.9)">🚶 Normal</button><button class="btn sm sec" onclick="App.shP(${k},1.15)">🏃 Rápido</button><button class="btn sm" onclick="App.shAll(${k})">▶️ 3×</button></div></div>`).join('')}
  <button class="btn full" onclick="App.shTest()">🎙️ Evaluar mi pronunciación</button>`;
  A.shP = (k, r) => speak(items[k][0], l, r);
  A.shAll = (k) => { const d = Math.max(1800, items[k][0].length * (l === 'ja' ? 260 : 95)); [.6, .9, 1.15].forEach((r, j) => setTimeout(() => speak(items[k][0], l, r), j * (d / r + 600))); };
  A.shTest = () => go('ex', { l, i: max, kind: 'pron', qs: items.map(s => ({ type: 'speak', text: s[0], pron: s[1], es: s[2] })) });
};

// ------------------------------------------------------------------ hablar contigo mismo (self‑talk)
V.selftalk = function () {
  const l = cur('_stl');
  let topic = A._stTopic || SELFTALK[Math.floor(Math.random() * SELFTALK.length)]; A._stTopic = topic;
  let text = '', on = false, t0 = 0, timer = null;
  function draw() {
    const secs = on ? Math.floor((Date.now() - t0) / 1000) : 0;
    T.$app.innerHTML = top('🗣️ Habla contigo') + tabs(l, '_stl') + `
    <div class="card"><div class="mut">Tema (en ${LN[l].toLowerCase()}):</div><div class="q">${esc(topic)}</div><button class="btn sm sec" onclick="App.stNew()">🎲 Otro tema</button></div>
    <div class="card"><p class="mut" style="margin:0">Habla 1 minuto sin parar. Si no sabes una palabra, rodéala con otras (como un niño: "cosa para cortar"). Los errores son la señal de que estás aprendiendo (Efromovich).</p></div>
    <div class="center"><button class="speak-btn ${on ? 'live' : ''}" onclick="App.stMic()">${on ? '⏹' : '🎙️'}</button><div class="q">${on ? secs + ' s' : 'Toca para empezar'}</div></div>
    <div class="card"><b>Transcripción</b><p id="sttx" style="min-height:40px">${esc(text) || '<span class="mut">…</span>'}</p>${text ? `<div class="mut">${text.trim().split(/\s+/).length} palabras</div>` : ''}</div>
    <button class="btn full" ${text && !on ? '' : 'disabled'} onclick="App.stEval()">✨ Feedback de la IA</button><div id="stfb" style="margin-top:12px"></div>`;
  }
  async function loop() {
    while (on) {
      window.__onSpeechPartial = (p) => { const e = document.getElementById('sttx'); if (e) e.textContent = text + ' ' + p; };
      const r = await T.listen(l);
      if (!on) { if (r.ok) text += ' ' + r.alts[0]; break; }
      if (r.ok) text += ' ' + r.alts[0];
      if (Date.now() - t0 > 75000) { on = false; }
      draw();
    }
    clearInterval(timer); draw();
  }
  A.stNew = () => { A._stTopic = SELFTALK[Math.floor(Math.random() * SELFTALK.length)]; T.render(); };
  A.stMic = () => {
    if (on) { on = false; try { if (window.Android) Android.stopListen(); } catch (e) { } return; }
    on = true; t0 = Date.now(); text = ''; draw(); timer = setInterval(() => { if (on && T.view.name === 'selftalk') { const q = document.querySelector('.speak-btn + .q'); if (q) q.textContent = Math.floor((Date.now() - t0) / 1000) + ' s'; } else clearInterval(timer); }, 1000); loop();
  };
  A.stEval = async () => {
    const box = document.getElementById('stfb'); box.innerHTML = '<div class="spin"></div>';
    try {
      const r = await ai({ messages: [{ role: 'user', text: `Un estudiante de ${LNAME[l]} (nivel ${T.levelOf(l)}) habló sobre "${topic}". Transcripción automática (puede tener errores del reconocedor): """${text}""".
Responde en español, breve y motivador, en markdown: 1) nota de fluidez y de precisión /10, 2) la versión corregida y natural de lo que quiso decir, 3) los 3 errores más importantes con explicación, 4) 5 expresiones útiles para hablar de este tema la próxima vez (con traducción), 5) un mini‑reto para mañana.` }] });
      box.innerHTML = `<div class="card md">${md(r)}</div>`;
      M().talk[td()] = true; T.addXP(30); T.save(); T.S.stats.spoken++;
    } catch (e) { box.innerHTML = aiErr(e); }
  };
  draw();
};
})();
