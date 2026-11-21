/* TriLingo 2 — módulos: escritura japonesa, kanji, canciones, libros, cuaderno de errores y modo niños */
(function () {
'use strict';
const T = window.TL, V = T.V, A = T.A, $app = T.$app;
const { esc, shuffle, pick, speak, sayBtn, toast, go, top, md, ai, parseJSON, aiErr, LNAME, disp } = T;
const S = () => T.S;
const LN = { en: 'Inglés', pt: 'Portugués', ja: 'Japonés' }, FL = { en: '🇬🇧', pt: '🇧🇷', ja: '🇯🇵' };
const langTabs = (cur, key) => `<div class="tabs">${S().langs.map(x => `<button class="${x === cur ? 'on' : ''}" onclick="App['${key}']='${x}';render()">${FL[x]} ${LN[x]}</button>`).join('')}</div>`;
const curLang = (key) => A[key] && S().langs.includes(A[key]) ? A[key] : S().langs[0];

// =====================================================================
// CANCIONES con subtítulos
// =====================================================================
const songKey = (s) => s.lang + ':' + s.t;
function allSongs() { return SONGS.concat((S().mySongs || []).map(s => Object.assign({ mine: true }, s))); }
V.songs = function () {
  const l = curLang('_sl');
  const list = allSongs().filter(s => s.lang === l);
  $app.innerHTML = top('🎵 Canciones') + langTabs(l, '_sl') + `
  <div class="card"><p class="mut">Canciones tradicionales (dominio público) con subtítulos línea por línea, pronunciación y traducción. Escucha, canta y completa la letra.</p>
  <div class="row"><button class="btn sm grow" onclick="go('songPaste','${l}')">📋 Pegar letra de tu canción</button><button class="btn sm sec grow" onclick="App.sgAI('${l}')">✨ Canción IA</button></div></div>
  ${list.map((s, k) => `<button class="unit" onclick="App.sgOpen(${k})"><div class="n" style="font-size:22px">${s.kids ? '🧸' : s.mine ? '⭐' : '🎵'}</div><div class="grow"><b>${esc(s.t)}</b><div class="mut">${esc(s.by || 'Mi canción')} · ${s.l.length} líneas</div></div><span class="badge">${esc(s.lv || '')}</span></button>`).join('') || '<p class="mut">Aún no hay canciones.</p>'}`;
  A.sgOpen = (k) => go('song', list[k]);
  A.sgAI = async (lang) => {
    const theme = prompt('¿Sobre qué tema quieres la canción? (ej: el verano, la amistad, los colores)') || 'la vida diaria';
    $app.innerHTML = top('✨ Canción IA') + '<div class="card center"><div class="spin"></div><p>Componiendo una canción original a tu nivel…</p></div>';
    try {
      const t = await ai({ json: true, temp: 1, messages: [{ role: 'user', text: `Compón una canción ORIGINAL y pegadiza en ${LNAME[lang]} sobre "${theme}" para un estudiante de nivel ${T.levelOf(lang)}: 2 estrofas y estribillo, frases cortas que rimen, vocabulario útil. ${lang === 'ja' ? 'Usa kana con espacios entre bloques.' : ''}
JSON: {"t":"título","l":[["línea","${lang === 'ja' ? 'romaji' : ''}","traducción al español"]]}` }] });
      const d = parseJSON(t); const s = { lang, t: d.t || theme, by: 'Canción IA', lv: T.LV(T.curUnit(lang)).n, l: d.l };
      S().mySongs = (S().mySongs || []).concat([s]); T.save(); go('song', s, true);
    } catch (e) { $app.innerHTML = top('✨ Canción IA') + aiErr(e); }
  };
};
V.songPaste = function (l) {
  $app.innerHTML = top('📋 Pegar letra') + `<div class="card"><p>Pega la letra de una canción que te guste en <b>${LN[l]}</b> (una línea por verso). La IA añadirá la ${l === 'ja' ? 'lectura en romaji y la ' : ''}traducción línea por línea para que la practiques. Se guarda solo en tu teléfono.</p>
  <input id="sgt" placeholder="Título y artista"><div style="height:8px"></div><textarea id="sgl" style="min-height:200px" placeholder="Letra…"></textarea>
  <button class="btn full" style="margin-top:10px" onclick="App.sgSave('${l}')">Crear práctica</button></div>`;
  A.sgSave = async (lang) => {
    const title = document.getElementById('sgt').value.trim() || 'Mi canción', lines = document.getElementById('sgl').value.split('\n').map(x => x.trim()).filter(Boolean).slice(0, 80);
    if (lines.length < 2) return toast('Pega al menos 2 líneas');
    $app.innerHTML = top('📋 Pegar letra') + '<div class="card center"><div class="spin"></div><p>Traduciendo línea por línea…</p></div>';
    try {
      const t = await ai({ json: true, temp: 0.3, messages: [{ role: 'user', text: `Para cada línea de esta letra en ${LNAME[lang]}, da ${lang === 'ja' ? 'la lectura en romaji y ' : ''}una traducción natural al español. Devuelve JSON: [["línea original","${lang === 'ja' ? 'romaji' : ''}","traducción"]] en el mismo orden.\n${JSON.stringify(lines)}` }] });
      const arr = parseJSON(t); const s = { lang, t: title, by: 'Mi canción', l: arr.map((x, k) => [x[0] || lines[k], x[1] || '', x[2] || '']) };
      S().mySongs = (S().mySongs || []).concat([s]); T.save(); go('song', s, true);
    } catch (e) { $app.innerHTML = top('📋 Pegar letra') + aiErr(e); }
  };
};
V.song = function (s) {
  const l = s.lang; let showTr = true, showPr = true, playing = false, cur = -1;
  function draw() {
    $app.innerHTML = top('🎵 ' + esc(s.t)) + `<div class="mut" style="margin:-6px 0 10px">${esc(s.by || '')} ${s.lv ? '· nivel ' + esc(s.lv) : ''}</div>
    <div class="row wrap" style="gap:6px;margin-bottom:10px"><button class="btn sm" onclick="App.sgPlay()">${playing ? '⏹ Parar' : '▶️ Escuchar todo'}</button>
      <button class="btn sm sec" onclick="App.sgTr()">${showTr ? 'Ocultar' : 'Ver'} traducción</button>${l === 'ja' ? `<button class="btn sm sec" onclick="App.sgPr()">${showPr ? 'Ocultar' : 'Ver'} romaji</button>` : ''}</div>
    <div class="lyrics">${s.l.map((x, k) => `<button class="lyr ${k === cur ? 'on' : ''}" id="ly${k}" onclick="App.sgLine(${k})"><div class="lt">${esc(disp(l, x[0]))}</div>${showPr && x[1] ? `<div class="mut">${esc(x[1])}</div>` : ''}${showTr ? `<div class="tr">${esc(x[2])}</div>` : ''}</button>`).join('')}</div>
    <div class="month">Practicar</div>
    <div class="grid2"><button class="tile" onclick="App.sgCloze()"><span class="ic">🧩</span><b>Completa la letra</b></button><button class="tile" onclick="App.sgSing()"><span class="ic">🎤</span><b>Canta y te evalúo</b></button>
    <button class="tile" onclick="App.sgOrder()"><span class="ic">🔀</span><b>Ordena los versos</b></button><button class="tile" onclick="App.sgExplain()"><span class="ic">🧑‍🏫</span><b>Explícame la letra</b></button></div>
    <button class="btn sec full" style="margin-top:10px" onclick="App.sgYT()">▶️ Buscar la canción en YouTube</button>
    ${s.mine ? `<button class="btn bad sm" style="margin-top:10px" onclick="App.sgDel()">Eliminar</button>` : ''}<div id="sgx"></div>`;
  }
  const dur = (t) => Math.max(1400, t.length * (l === 'ja' ? 230 : 85) / (S().rate || .9));
  A.sgLine = (k) => { cur = k; document.querySelectorAll('.lyr').forEach((b, j) => b.classList.toggle('on', j === k)); speak(s.l[k][0], l); };
  A.sgPlay = () => {
    if (playing) { playing = false; draw(); return; }
    playing = true; draw(); let k = 0;
    const step = () => { if (!playing || !document.getElementById('ly0')) { playing = false; return; } if (k >= s.l.length) { playing = false; draw(); return; } A.sgLine(k); const e = document.getElementById('ly' + k); if (e) e.scrollIntoView({ block: 'center', behavior: 'smooth' }); setTimeout(step, dur(s.l[k][0]) + 500); k++; };
    step();
  };
  A.sgTr = () => { showTr = !showTr; draw(); };
  A.sgPr = () => { showPr = !showPr; draw(); };
  A.sgYT = () => T.openUrl('https://www.youtube.com/results?search_query=' + encodeURIComponent(s.t.replace(/\(.*?\)/g, '') + ' ' + (l === 'en' ? 'lyrics' : l === 'pt' ? 'letra' : '歌詞')));
  A.sgDel = () => { S().mySongs = (S().mySongs || []).filter(x => songKey(x) !== songKey(s)); T.save(); window.goBack(); };
  A.sgCloze = () => {
    const qs = [];
    s.l.forEach(x => {
      const toks = x[0].split(/\s+/).filter(w => w.replace(/[^\p{L}]/gu, '').length > 1); if (!toks.length) return;
      const w = toks[Math.floor(Math.random() * toks.length)], clean = w.replace(/[^\p{L}\p{N}'-]/gu, '');
      const pool = [...new Set(s.l.flatMap(y => y[0].split(/\s+/)).map(t => t.replace(/[^\p{L}\p{N}'-]/gu, '')).filter(t => t && t !== clean))];
      qs.push({ type: 'mc', prompt: 'Escucha y completa el verso', big: disp(l, x[0].replace(w, w.replace(clean, '____'))), sub: x[2], say: x[0], small: true, options: shuffle([clean].concat(pick(pool, 3))), answer: clean });
    });
    go('ex', { l, i: 0, kind: 'ai', qs: qs.slice(0, 14) });
  };
  A.sgSing = () => go('ex', { l, i: 0, kind: 'pron', qs: s.l.slice(0, 12).map(x => ({ type: 'speak', text: x[0], pron: x[1], es: x[2] })) });
  A.sgOrder = () => {
    const chunks = []; for (let k = 0; k + 1 < s.l.length && chunks.length < 4; k += 2) chunks.push([s.l[k], s.l[k + 1]]);
    go('ex', { l, i: 0, kind: 'ai', qs: chunks.map(c => { const toks = (c[0][0] + ' ' + c[1][0]).split(/\s+/).filter(Boolean); return { type: 'build', prompt: 'Ordena el verso:', big: c[0][2] + ' ' + c[1][2], answer: toks, tokens: shuffle(toks), say: c[0][0] + ' ' + c[1][0] }; }) });
  };
  A.sgExplain = async () => {
    const box = document.getElementById('sgx'); box.innerHTML = '<div class="spin"></div>'; box.scrollIntoView();
    try { const t = await ai({ messages: [{ role: 'user', text: `Explica en español a un estudiante (${T.levelOf(l)}) esta letra en ${LNAME[l]}: vocabulario clave, gramática interesante, expresiones y contexto cultural. Breve, markdown.\n${s.l.map(x => x[0]).join('\n')}` }] }); box.innerHTML = `<div class="card md" style="margin-top:12px">${md(t)}</div>`; }
    catch (e) { box.innerHTML = aiErr(e); }
  };
  draw();
};

// =====================================================================
// LIBROS: lector interactivo
// =====================================================================
V.books = function () {
  const l = curLang('_bl');
  const list = BOOKS.filter(b => b.lang === l).concat((S().myBooks || []).filter(b => b.lang === l));
  $app.innerHTML = top('📚 Libros') + langTabs(l, '_bl') + `<div class="card"><p class="mut">Fragmentos de clásicos de dominio público y cuentos graduados. Toca cada frase para escucharla, mira la traducción, léela en voz alta y responde preguntas.</p>
  <button class="btn sm" onclick="App.bkAI('${l}')">✨ Generar un cuento a mi nivel</button></div>
  ${list.map((b, k) => `<button class="unit" onclick="App.bkOpen(${k})"><div class="n" style="font-size:22px">📖</div><div class="grow"><b>${esc(b.t)}</b><div class="mut">${esc(b.by)}</div></div><span class="badge">${esc(b.lv)}</span></button>`).join('')}`;
  A.bkOpen = (k) => go('book', list[k]);
  A.bkAI = async (lang) => {
    $app.innerHTML = top('✨ Cuento IA') + '<div class="card center"><div class="spin"></div><p>Escribiendo un cuento para ti…</p></div>';
    try {
      const t = await ai({ json: true, temp: 1, messages: [{ role: 'user', text: `Escribe un cuento corto ORIGINAL en ${LNAME[lang]} (8‑12 frases) para nivel ${T.levelOf(lang)}. ${lang === 'ja' ? 'Usa kana y pocos kanji, con espacios entre bloques.' : ''} JSON: {"t":"título","l":[["frase","${lang === 'ja' ? 'romaji' : ''}","traducción"]]}` }] });
      const d = parseJSON(t); const b = { lang, t: d.t, by: 'Cuento IA', lv: T.LV(T.curUnit(lang)).n, l: d.l };
      S().myBooks = (S().myBooks || []).concat([b]).slice(-20); T.save(); go('book', b, true);
    } catch (e) { $app.innerHTML = top('✨ Cuento IA') + aiErr(e); }
  };
};
V.book = function (b) {
  const l = b.lang; const open = new Set();
  function draw() {
    $app.innerHTML = top('📖 Lectura') + `<div class="card"><h2>${esc(b.t)}</h2><div class="mut">${esc(b.by)} · nivel ${esc(b.lv)}</div>
    <div class="row wrap" style="gap:6px;margin-top:8px"><button class="btn sm" onclick="App.bkAll()">▶️ Leer todo</button><button class="btn sm sec" onclick="App.bkTrAll()">Traducción</button></div></div>
    <div class="card book">${b.l.map((x, k) => `<p class="sent" onclick="App.bkS(${k})"><span>${esc(disp(l, x[0]))}</span>${open.has(k) ? `${x[1] ? `<span class="mut d">${esc(x[1])}</span>` : ''}<span class="tr d">${esc(x[2])}</span>` : ''}</p>`).join('')}</div>
    <div class="grid2"><button class="tile" onclick="App.bkRead()"><span class="ic">🎙️</span><b>Léelo en voz alta</b></button><button class="tile" onclick="App.bkBuild()"><span class="ic">🔀</span><b>Ordena frases</b></button>
    <button class="tile" onclick="App.bkQ()"><span class="ic">❓</span><b>Preguntas IA</b></button><button class="tile" onclick="App.bkWords()"><span class="ic">🗂️</span><b>Vocabulario IA</b></button></div><div id="bkx"></div>`;
  }
  A.bkS = (k) => { open.has(k) ? open.delete(k) : open.add(k); speak(b.l[k][0], l); draw(); };
  A.bkTrAll = () => { if (open.size === b.l.length) open.clear(); else b.l.forEach((_, k) => open.add(k)); draw(); };
  A.bkAll = () => { let k = 0; const step = () => { if (k >= b.l.length || !document.querySelector('.book')) return; speak(b.l[k][0], l); const t = b.l[k][0]; k++; setTimeout(step, Math.max(1500, t.length * (l === 'ja' ? 230 : 85) / (S().rate || .9)) + 400); }; step(); };
  A.bkRead = () => go('ex', { l, i: 0, kind: 'pron', qs: b.l.map(x => ({ type: 'speak', text: x[0], pron: x[1], es: x[2] })) });
  A.bkBuild = () => go('ex', { l, i: 0, kind: 'ai', qs: pick(b.l.filter(x => x[0].split(/\s+/).length <= 14), 5).map(x => { const toks = x[0].split(/\s+/).filter(Boolean); return { type: 'build', prompt: 'Ordena la frase:', big: x[2], answer: toks, tokens: shuffle(toks), say: x[0] }; }) });
  A.bkQ = async () => {
    const box = document.getElementById('bkx'); box.innerHTML = '<div class="spin"></div>';
    try {
      const t = await ai({ json: true, messages: [{ role: 'user', text: `Texto en ${LNAME[l]}: """${b.l.map(x => x[0]).join(' ')}""". Crea 5 preguntas de comprensión en español de opción múltiple. JSON: [{"q":"","options":["","","",""],"answer":0,"explain":""}]` }] });
      const arr = parseJSON(t); go('ex', { l, i: 0, kind: 'ai', qs: arr.map(x => ({ type: 'mc', prompt: x.q, options: x.options, answer: x.options[x.answer | 0], explain: x.explain })) });
    } catch (e) { box.innerHTML = aiErr(e); }
  };
  A.bkWords = async () => {
    const box = document.getElementById('bkx'); box.innerHTML = '<div class="spin"></div>';
    try {
      const t = await ai({ json: true, messages: [{ role: 'user', text: `Del texto en ${LNAME[l]} """${b.l.map(x => x[0]).join(' ')}""" extrae las 10 palabras o expresiones más útiles. JSON: [["palabra","${l === 'ja' ? 'lectura romaji' : 'pronunciación aproximada para hispanohablantes'}","significado en español"]]` }] });
      const arr = parseJSON(t);
      box.innerHTML = `<div class="card" style="margin-top:12px"><h3>Vocabulario</h3>${arr.map(v => `<div class="vocab">${sayBtn(v[0], l)}<div class="grow"><div class="w">${esc(v[0])}</div><div class="mut">${esc(v[1])}</div></div><div>${esc(v[2])}</div></div>`).join('')}<button class="btn sm" style="margin-top:8px" id="bkadd">+ Añadir todo al repaso</button></div>`;
      document.getElementById('bkadd').onclick = () => { arr.forEach(v => T.srsAdd(l, v)); toast('Añadido al repaso ✓'); };
    } catch (e) { box.innerHTML = aiErr(e); }
  };
  draw();
};

// =====================================================================
// CUADERNO DE ERRORES
// =====================================================================
V.mistakes = function () {
  const M = S().mistakes.filter(m => S().langs.includes(m.l));
  const by = {}; M.forEach(m => by[m.l] = (by[m.l] || 0) + 1);
  $app.innerHTML = top('📒 Mis errores') + `<div class="card"><p>Cada vez que fallas, el ejercicio se guarda aquí. Al acertarlo, sale del cuaderno. Repasar tus errores es la forma más rápida de mejorar.</p>
  ${Object.keys(by).map(l => `<div class="row" style="margin:6px 0"><span>${FL[l]}</span><span class="grow">${LN[l]}</span><b>${by[l]}</b><button class="btn sm" onclick="App.mkGo('${l}')">Practicar</button></div>`).join('') || '<p class="mut">¡No tienes errores guardados! 🎉</p>'}</div>
  ${M.slice(0, 30).map(m => `<div class="card" style="padding:10px 14px"><span class="badge">${FL[m.l]}</span> <b>${esc(m.q.big || m.q.prompt || '')}</b><div class="mut">→ ${esc(Array.isArray(m.q.answer) ? m.q.answer.join(' ') : m.q.answer)}</div></div>`).join('')}
  ${M.length ? `<button class="btn bad sm" onclick="App.mkClr()">Vaciar cuaderno</button>` : ''}`;
  A.mkGo = (l) => { const qs = S().mistakes.filter(m => m.l === l).slice(0, 15).map(m => { const q = Object.assign({}, m.q); if (q.type === 'build') q.tokens = shuffle(q.tokens); if (q.options) q.options = shuffle(q.options); return q; }); go('ex', { l, i: 0, kind: 'mistakes', qs }); };
  A.mkClr = () => { if (confirm('¿Vaciar el cuaderno de errores?')) { S().mistakes = []; T.save(); T.render(); } };
};

// =====================================================================
// MODO NIÑOS
// =====================================================================
V.kidsHome = function () {
  T.setNav(false);
  const l = curLang('_kl'), K = KIDS[l], lv = A._klv || 0;
  const stars = (key) => (S().kids[key] || {}).stars || 0;
  const total = K.levels.reduce((a, L, li) => a + L.units.reduce((b, u, ui) => b + stars(l + '-' + li + '-' + ui), 0), 0);
  T.$app.innerHTML = `<div class="kids">
  <div class="row" style="margin-bottom:8px"><div class="kmascot">🦉</div><div class="grow"><h1 style="margin:0;font-size:26px">¡Hola${S().name ? ', ' + esc(S().name) : ''}!</h1><div class="mut">Aprende jugando con Búho Lingo · ⭐ ${total}</div></div><button class="btn sm sec" onclick="App.kAdult()">👤 Adultos</button></div>
  <div class="tabs big">${S().langs.map(x => `<button class="${x === l ? 'on' : ''}" onclick="App._kl='${x}';render()">${FL[x]} ${LN[x]}</button>`).join('')}</div>
  <div class="tabs big">${K.levels.map((L, li) => `<button class="${li === lv ? 'on' : ''}" onclick="App._klv=${li};render()">${L.ic} ${L.n}</button>`).join('')}</div>
  <div class="kunits">${K.levels[lv].units.map((u, ui) => { const st = stars(l + '-' + lv + '-' + ui); return `<button class="kunit" onclick="go('kidsUnit',{l:'${l}',li:${lv},ui:${ui}})"><div class="kic">${u.ic}</div><b>${esc(u.t)}</b><div class="kst">${'★'.repeat(st)}${'☆'.repeat(3 - st)}</div></button>`; }).join('')}</div>
  <button class="kbig" onclick="App.kSongs()">🎵 Canciones para cantar</button>
  ${l === 'ja' ? `<button class="kbig" style="background:#f59e0b" onclick="App._jt='hira';go('jwrite')">✍️ Dibuja las letras japonesas</button>` : ''}
  </div>`;
  A.kAdult = () => { S().mode = 'adult'; T.save(); T.stack = []; T.view = { name: 'home' }; T.render(); };
  A.kSongs = () => { A._sl = l; go('kidsSongs', l); };
};
V.kidsSongs = function (l) {
  const list = SONGS.filter(s => s.kids && s.lang === l);
  T.$app.innerHTML = `<div class="kids">${top('🎵 Canciones')}<div class="kunits">${list.map((s, k) => `<button class="kunit" onclick="App.ksO(${k})"><div class="kic">🎶</div><b>${esc(s.t)}</b></button>`).join('')}</div></div>`;
  A.ksO = (k) => go('song', list[k]);
};
V.kidsUnit = function ({ l, li, ui }) {
  const u = KIDS[l].levels[li].units[ui], key = l + '-' + li + '-' + ui; let k = 0;
  function card() {
    const v = u.v[k];
    T.$app.innerHTML = `<div class="kids">${top(u.ic + ' ' + esc(u.t))}<div class="bar" style="margin-bottom:12px"><i style="width:${k / u.v.length * 100}%"></i></div>
    <button class="kcard" onclick="App.kSay()"><div class="kemoji">${v[3]}</div><div class="kword">${esc(v[0])}</div>${l === 'ja' ? `<div class="mut" style="font-size:20px">${esc(v[1])}</div>` : ''}<div class="mut" style="font-size:18px">${esc(v[2])}</div><div style="font-size:28px">🔊</div></button>
    <div class="row"><button class="kbig sec" ${k ? '' : 'disabled'} onclick="App.kPrev()">⬅️</button><button class="kbig" onclick="App.kNext()">${k + 1 < u.v.length ? '➡️' : '🎮 ¡A jugar!'}</button></div></div>`;
    setTimeout(() => speak(v[0], l, .8), 200);
  }
  function menu() {
    T.$app.innerHTML = `<div class="kids">${top(u.ic + ' ' + esc(u.t))}<div class="kunits">
      <button class="kunit" onclick="App.kLearn()"><div class="kic">👀</div><b>Aprender</b></button>
      <button class="kunit" onclick="App.kGame('find')"><div class="kic">🔍</div><b>¿Dónde está?</b></button>
      <button class="kunit" onclick="App.kGame('pairs')"><div class="kic">🃏</div><b>Parejas</b></button>
      <button class="kunit" onclick="App.kGame('say')"><div class="kic">🎤</div><b>¡Dilo!</b></button></div></div>`;
  }
  A.kSay = () => speak(u.v[k][0], l, .8);
  A.kPrev = () => { if (k) { k--; card(); } };
  A.kNext = () => { if (k + 1 < u.v.length) { k++; card(); } else { u.v.forEach(v => T.srsAdd(l, [v[0], v[1], v[2]])); menu(); } };
  A.kLearn = () => { k = 0; card(); };
  A.kGame = (g) => {
    let qs;
    if (g === 'find') qs = shuffle(u.v).map(v => ({ type: 'mc', pic: true, prompt: '¿Dónde está…?', big: v[0], say: v[0], options: shuffle([v[3]].concat(pick(u.v.filter(x => x !== v).map(x => x[3]), 3))), answer: v[3] }));
    else if (g === 'pairs') qs = [0, 1].map(n => ({ type: 'pairs', pairs: u.v.slice(n * 4, n * 4 + 4).map(v => [v[0], v[3]]) }));
    else qs = pick(u.v, 5).map(v => ({ type: 'speak', text: v[0], pron: v[1], es: v[3] + ' ' + v[2] }));
    go('ex', { l, i: 0, kind: 'kids', key, qs });
  };
  if (T.S.kids[key]) menu(); else card();
};

// Kids: la pantalla de resultados vuelve al menú de juegos
})();
