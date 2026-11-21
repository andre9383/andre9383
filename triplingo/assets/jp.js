/* TriLingo — Escritura japonesa completa: hiragana, katakana y kanji JLPT N5→N1.
   Lecciones con aprender → escribir trazo a trazo → quiz → escribir de memoria. */
(function () {
'use strict';
const T = window.TL, V = T.V, A = T.A;
const { esc, shuffle, pick, speak, sayBtn, toast, go, top } = T;
const S = () => T.S;

// ------------------------------------------------------------------ tablas de kana
const H = {
  vow: 'あいうえお|a i u e o', k: 'かきくけこ|ka ki ku ke ko', s: 'さしすせそ|sa shi su se so', t: 'たちつてと|ta chi tsu te to',
  n: 'なにぬねの|na ni nu ne no', h: 'はひふへほ|ha hi fu he ho', m: 'まみむめも|ma mi mu me mo', y: 'やゆよ|ya yu yo',
  r: 'らりるれろ|ra ri ru re ro', w: 'わをん|wa wo n', g: 'がぎぐげご|ga gi gu ge go', z: 'ざじずぜぞ|za ji zu ze zo',
  d: 'だぢづでど|da ji zu de do', b: 'ばびぶべぼ|ba bi bu be bo', p: 'ぱぴぷぺぽ|pa pi pu pe po'
};
const ROM = {};
Object.values(H).forEach(r => { const [c, ro] = r.split('|'); ro.split(' ').forEach((x, i) => { ROM[c[i]] = x; }); });
Object.assign(ROM, { 'ゃ': 'ya (pequeña)', 'ゅ': 'yu (pequeña)', 'ょ': 'yo (pequeña)', 'っ': '(pausa doble)', 'ぁ': 'a (pequeña)', 'ぃ': 'i (pequeña)', 'ぅ': 'u (pequeña)', 'ぇ': 'e (pequeña)', 'ぉ': 'o (pequeña)', 'ゔ': 'vu', 'ー': '(vocal larga)' });
const YO = 'きしちにひみりぎじびぴ'.split('');
const yoRom = (c, s) => { const b = ROM[c]; const base = { shi: 'sh', chi: 'ch', ji: 'j' }[b] || b.slice(0, -1) + 'y'; return base + { 'ゃ': 'a', 'ゅ': 'u', 'ょ': 'o' }[s]; };
const k2 = (s) => T.hira2kata(s);
const romOf = (ch) => { const h = T.kata2hira(ch); if (ROM[h]) return ROM[h]; if (ROM[ch]) return ROM[ch]; if (h.length === 2 && 'ゃゅょ'.includes(h[1])) return yoRom(h[0], h[1]); return EXT[ch] || ''; };
const EXT = { 'ファ': 'fa', 'フィ': 'fi', 'フェ': 'fe', 'フォ': 'fo', 'ティ': 'ti', 'ディ': 'di', 'トゥ': 'tu', 'ドゥ': 'du', 'ウィ': 'wi', 'ウェ': 'we', 'ウォ': 'wo', 'ヴァ': 'va', 'ヴィ': 'vi', 'ヴ': 'vu', 'ヴェ': 've', 'ヴォ': 'vo', 'シェ': 'she', 'ジェ': 'je', 'チェ': 'che', 'ツァ': 'tsa' };

// Lecciones: [título, caracteres (unidades de lectura), [palabras ejemplo: escritura, romaji, español]]
const HIRA = [
  ['Vocales', 'あ い う え お', [['あい', 'ai', 'amor'], ['いえ', 'ie', 'casa'], ['うえ', 'ue', 'arriba'], ['あお', 'ao', 'azul']]],
  ['Fila K', 'か き く け こ', [['かお', 'kao', 'cara'], ['いけ', 'ike', 'estanque'], ['きく', 'kiku', 'escuchar'], ['こえ', 'koe', 'voz']]],
  ['Fila S', 'さ し す せ そ', [['すし', 'sushi', 'sushi'], ['あさ', 'asa', 'mañana'], ['かさ', 'kasa', 'paraguas'], ['せき', 'seki', 'asiento']]],
  ['Fila T', 'た ち つ て と', [['たこ', 'tako', 'pulpo'], ['くつ', 'kutsu', 'zapato'], ['ちかい', 'chikai', 'cerca'], ['そと', 'soto', 'fuera']]],
  ['Fila N', 'な に ぬ ね の', [['ねこ', 'neko', 'gato'], ['いぬ', 'inu', 'perro'], ['なつ', 'natsu', 'verano'], ['にく', 'niku', 'carne']]],
  ['Fila H', 'は ひ ふ へ ほ', [['はな', 'hana', 'flor'], ['ひと', 'hito', 'persona'], ['ふね', 'fune', 'barco'], ['ほし', 'hoshi', 'estrella']]],
  ['Fila M', 'ま み む め も', [['みみ', 'mimi', 'oreja'], ['むし', 'mushi', 'insecto'], ['あめ', 'ame', 'lluvia'], ['もも', 'momo', 'melocotón']]],
  ['Fila R', 'ら り る れ ろ', [['さる', 'saru', 'mono'], ['とり', 'tori', 'pájaro'], ['くるま', 'kuruma', 'coche'], ['いろ', 'iro', 'color']]],
  ['Filas Y, W y ん', 'や ゆ よ わ を ん', [['やま', 'yama', 'montaña'], ['ゆき', 'yuki', 'nieve'], ['よる', 'yoru', 'noche'], ['わたし', 'watashi', 'yo'], ['ほん', 'hon', 'libro']]],
  ['Dakuten G y Z', 'が ぎ ぐ げ ご ざ じ ず ぜ ぞ', [['かぎ', 'kagi', 'llave'], ['ひざ', 'hiza', 'rodilla'], ['ごご', 'gogo', 'tarde'], ['かぜ', 'kaze', 'viento']]],
  ['Dakuten D y B', 'だ ぢ づ で ど ば び ぶ べ ぼ', [['まど', 'mado', 'ventana'], ['かばん', 'kaban', 'bolso'], ['でんわ', 'denwa', 'teléfono'], ['ぶどう', 'budou', 'uva']]],
  ['Handakuten P', 'ぱ ぴ ぷ ぺ ぽ', [['さんぽ', 'sanpo', 'paseo'], ['てんぷら', 'tenpura', 'tempura'], ['ぴかぴか', 'pikapika', 'brillante']]],
  ['Combinadas (yōon) 1', 'きゃ きゅ きょ しゃ しゅ しょ ちゃ ちゅ ちょ にゃ にゅ にょ', [['きょう', 'kyou', 'hoy'], ['しゃしん', 'shashin', 'foto'], ['おちゃ', 'ocha', 'té'], ['にゃあ', 'nyaa', 'miau']]],
  ['Combinadas (yōon) 2', 'ひゃ ひゅ ひょ みゃ みゅ みょ りゃ りゅ りょ ぎゃ ぎゅ ぎょ じゃ じゅ じょ びゃ びゅ びょ ぴゃ ぴゅ ぴょ', [['りょこう', 'ryokou', 'viaje'], ['ぎゅうにゅう', 'gyuunyuu', 'leche'], ['じゅぎょう', 'jugyou', 'clase'], ['ひゃく', 'hyaku', 'cien']]],
  ['っ pequeña y vocales largas', 'っ ゃ ゅ ょ', [['きって', 'kitte', 'sello'], ['がっこう', 'gakkou', 'escuela'], ['おかあさん', 'okaasan', 'mamá'], ['おねえさん', 'oneesan', 'hermana mayor']]]
];
const KATA = [
  ['Vocales', 'ア イ ウ エ オ', [['アイ', 'ai', 'Ai (nombre)'], ['オーケー', 'ookee', 'OK']]],
  ['Fila K', 'カ キ ク ケ コ', [['ケーキ', 'keeki', 'pastel'], ['ココア', 'kokoa', 'cacao'], ['カカオ', 'kakao', 'cacao (fruto)']]],
  ['Fila S', 'サ シ ス セ ソ', [['スキー', 'sukii', 'esquí'], ['アイス', 'aisu', 'helado'], ['ソース', 'soosu', 'salsa']]],
  ['Fila T', 'タ チ ツ テ ト', [['テスト', 'tesuto', 'examen'], ['タクシー', 'takushii', 'taxi'], ['トマト', 'tomato', 'tomate']]],
  ['Fila N', 'ナ ニ ヌ ネ ノ', [['ネクタイ', 'nekutai', 'corbata'], ['テニス', 'tenisu', 'tenis'], ['ノート', 'nooto', 'cuaderno']]],
  ['Fila H', 'ハ ヒ フ ヘ ホ', [['ホテル', 'hoteru', 'hotel'], ['ハート', 'haato', 'corazón'], ['コーヒー', 'koohii', 'café']]],
  ['Fila M', 'マ ミ ム メ モ', [['メモ', 'memo', 'nota'], ['カメラ', 'kamera', 'cámara'], ['ハム', 'hamu', 'jamón']]],
  ['Fila R', 'ラ リ ル レ ロ', [['ラーメン', 'raamen', 'ramen'], ['トイレ', 'toire', 'baño'], ['メロン', 'meron', 'melón']]],
  ['Filas Y, W y ン', 'ヤ ユ ヨ ワ ヲ ン', [['ワイン', 'wain', 'vino'], ['ヨーヨー', 'yooyoo', 'yoyó'], ['ユニフォーム', 'yunifoomu', 'uniforme']]],
  ['Dakuten G y Z', 'ガ ギ グ ゲ ゴ ザ ジ ズ ゼ ゾ', [['ゲーム', 'geemu', 'videojuego'], ['ガム', 'gamu', 'chicle'], ['チーズ', 'chiizu', 'queso']]],
  ['Dakuten D y B', 'ダ ヂ ヅ デ ド バ ビ ブ ベ ボ', [['テレビ', 'terebi', 'televisión'], ['ドア', 'doa', 'puerta'], ['バス', 'basu', 'autobús']]],
  ['Handakuten P', 'パ ピ プ ペ ポ', [['パン', 'pan', 'pan'], ['ピアノ', 'piano', 'piano'], ['ペン', 'pen', 'bolígrafo'], ['プール', 'puuru', 'piscina']]],
  ['Combinadas (yōon)', 'キャ キュ キョ シャ シュ ショ チャ チュ チョ ニャ ニュ ニョ ヒャ ヒュ ヒョ ミャ ミュ ミョ リャ リュ リョ ギャ ギュ ギョ ジャ ジュ ジョ ビャ ビュ ビョ ピャ ピュ ピョ', [['ジュース', 'juusu', 'jugo'], ['シャツ', 'shatsu', 'camisa'], ['チョコ', 'choko', 'chocolate'], ['ニュース', 'nyuusu', 'noticias']]],
  ['ッ pequeña y ー', 'ッ ー ャ ュ ョ', [['ベッド', 'beddo', 'cama'], ['カップ', 'kappu', 'taza'], ['スーパー', 'suupaa', 'supermercado']]],
  ['Katakana extendido', 'ファ フィ フェ フォ ティ ディ トゥ ドゥ ウィ ウェ ウォ ヴァ ヴィ ヴ ヴェ ヴォ シェ ジェ チェ ツァ', [['ファン', 'fan', 'fan / aficionado'], ['パーティー', 'paatii', 'fiesta'], ['フォーク', 'fooku', 'tenedor'], ['ウェブ', 'webu', 'web'], ['シェフ', 'shefu', 'chef']]]
];
const KTIPS = {
  'ー': 'En katakana, la raya alarga la vocal anterior: コーヒー = koohii.',
  'っ': 'La っ pequeña duplica la consonante siguiente con una pequeña pausa: きって = kit‑te.',
  'ッ': 'La ッ pequeña duplica la consonante siguiente: ベッド = bed‑do.'
};

const LV = [5, 4, 3, 2, 1];
const PER = 10;
function tracks() {
  const t = [{ id: 'hira', n: 'Hiragana', ic: 'あ', lessons: HIRA.length }, { id: 'kata', n: 'Katakana', ic: 'ア', lessons: KATA.length }];
  LV.forEach(l => t.push({ id: 'n' + l, n: 'Kanji N' + l, ic: '漢', lessons: Math.ceil(window.JPK_COUNTS[l] / PER), lv: l }));
  return t;
}
// ------------------------------------------------------------------ carga perezosa de datos
const loaded = {};
function loadScript(src) {
  if (loaded[src]) return loaded[src];
  return (loaded[src] = new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => { delete loaded[src]; rej(new Error('No se pudo cargar ' + src)); }; document.head.appendChild(s); }));
}
const needKana = () => loadScript('data/jp/kana-strokes.js');
const needLevel = (l) => loadScript('data/jp/kanji-n' + l + '.js');
function medOf(ch) { // trazos en coordenadas 1024 (y hacia arriba, base 900)
  const raw = (window.JPSTROKES || {})[ch] || (window.JPKMED || {})[ch];
  return raw ? raw.map(s => { const p = []; for (let i = 0; i < s.length; i += 2) p.push([s[i], s[i + 1]]); return p; }) : null;
}

// Construye los "ítems" de una lección: {ch (lo que se lee), write: [caracteres a escribir], read, mean, words, extra}
function lessonItems(track, n) {
  if (track === 'hira' || track === 'kata') {
    const L = (track === 'hira' ? HIRA : KATA)[n];
    return L[1].split(' ').map(ch => ({ ch, write: [...ch].filter(c => c !== ' '), read: romOf(ch), mean: KTIPS[ch] || (track === 'hira' ? 'hiragana' : 'katakana'), words: [] }));
  }
  const lv = +track.slice(1), rows = (window.JPK || {})[lv] || [];
  return rows.slice(n * PER, n * PER + PER).map(r => {
    window.JPKMED = window.JPKMED || {}; window.JPKMED[r[0]] = r[7];
    return { ch: r[0], write: [r[0]], read: [r[1], r[2]].filter(Boolean).join(' / '), on: r[1], kun: r[2], mean: r[3], strokes: r[4], grade: r[5], words: r[6] };
  });
}
function lessonTitle(track, n) {
  if (track === 'hira') return HIRA[n][0];
  if (track === 'kata') return KATA[n][0];
  return 'Lección ' + (n + 1);
}
function lessonWords(track, n) { return track === 'hira' ? HIRA[n][2] : track === 'kata' ? KATA[n][2] : []; }
const JP = () => (S().jpw = S().jpw || {});
const LKey = (track, n) => track + '-' + n;
const lessonState = (track, n) => JP()[LKey(track, n)] || (JP()[LKey(track, n)] = { steps: {}, best: 0 });
const lessonDone = (track, n) => { const s = JP()[LKey(track, n)]; return !!(s && s.done); };

// ------------------------------------------------------------------ vista principal
V.jwrite = async function () {
  const tr = A._jt || 'hira';
  const list = tracks();
  const cur = list.find(t => t.id === tr) || list[0];
  T.$app.innerHTML = top('✍️ Escritura japonesa') + '<div class="card center"><div class="spin"></div></div>';
  try { if (cur.lv) await needLevel(cur.lv); } catch (e) { toast(e.message); }
  if (!T.view || T.view.name !== 'jwrite') return;
  const doneN = (t) => Array.from({ length: t.lessons }, (_, i) => lessonDone(t.id, i)).filter(Boolean).length;
  let h = top('✍️ Escritura japonesa') + `<div class="tabs">${list.map(t => `<button class="${t.id === cur.id ? 'on' : ''}" onclick="App._jt='${t.id}';render()">${t.ic} ${t.n}</button>`).join('')}</div>`;
  const total = cur.lv ? window.JPK_COUNTS[cur.lv] : (cur.id === 'hira' ? HIRA : KATA).reduce((a, L) => a + L[1].split(' ').length, 0);
  h += `<div class="card"><div class="row"><div class="grow"><b>${cur.ic} ${cur.n}</b><div class="mut">${total} ${cur.lv ? 'kanji' : 'caracteres'} · ${doneN(cur)}/${cur.lessons} lecciones</div></div>
    <button class="btn sm sec" onclick="go('jtable','${cur.id}')">Tabla</button></div>
    <div class="bar" style="margin-top:8px"><i style="width:${doneN(cur) / cur.lessons * 100}%"></i></div>
    <p class="mut" style="margin:8px 0 0">Cada lección: 👀 aprender → ✍️ escribir trazo a trazo → 🎯 quiz → 🧠 escribir de memoria.</p></div>`;
  for (let i = 0; i < cur.lessons; i++) {
    const it = lessonItems(cur.id, i), st = JP()[LKey(cur.id, i)], d = st && st.done;
    const nst = st ? ['learn', 'write', 'quiz', 'memory'].filter(k => st.steps[k]).length : 0;
    h += `<button class="unit ${d ? 'done' : ''}" onclick="go('jlesson',{track:'${cur.id}',n:${i}})"><div class="n" style="font-size:${cur.lv ? 15 : 18}px">${d ? '✓' : i + 1}</div>
      <div class="grow"><b>${esc(lessonTitle(cur.id, i))}</b><div class="jprev">${it.map(x => x.ch).join(' ')}</div><div class="mut">${nst}/4 pasos${st && st.best ? ' · quiz ' + st.best + '%' : ''}</div></div><span>›</span></button>`;
  }
  T.$app.innerHTML = h;
};

// Tabla completa con estado de cada carácter
V.jtable = async function (tr) {
  const t = tracks().find(x => x.id === tr);
  if (t.lv) await needLevel(t.lv);
  if (!T.view || T.view.name !== 'jtable') return;
  const items = []; for (let i = 0; i < t.lessons; i++) lessonItems(tr, i).forEach(x => items.push(Object.assign({ n: i }, x)));
  const col = (c) => { const v = S().write[c]; return v == null ? 'transparent' : v >= 80 ? 'var(--ok)' : v >= 55 ? 'var(--warn)' : 'var(--bad)'; };
  T.$app.innerHTML = top(t.ic + ' ' + t.n) + `<p class="mut">Toca un carácter para escucharlo y practicarlo. Color de la línea = tu mejor nota escribiéndolo.</p>
  <div class="kgrid ${t.lv ? '' : 'kana'}">${items.map((x, j) => `<button style="border-bottom:3px solid ${col(x.write[0])}" onclick="App.jtOpen(${j})">${x.ch}<small>${esc(t.lv ? String(x.mean).split(',')[0] : x.read)}</small></button>`).join('')}</div>`;
  A.jtOpen = (j) => { const x = items[j]; speak(x.ch, 'ja'); go('jcard', { track: tr, item: x }); };
};

// Ficha de un carácter
V.jcard = async function ({ track, item }) {
  await needKana().catch(() => { });
  const x = item;
  T.$app.innerHTML = top(x.ch) + `<div class="card center"><div class="row" style="justify-content:center;gap:16px">
    <div style="font-size:110px;line-height:1.1">${x.ch}</div>${strokeSVG(x.write[0], 'big')}</div>
    <div class="q">${esc(x.mean)}</div><div class="mut">${x.strokes ? x.strokes + ' trazos · ' : ''}${esc(x.read)}</div>
    <div class="row" style="justify-content:center;margin-top:8px">${sayBtn(x.kun ? (x.words[0] ? x.words[0][1] : x.ch) : x.ch, 'ja')}<button class="btn sm sec" onclick="App.jcAnim()">🎬 Ver orden de trazos</button></div></div>
    ${x.on != null ? `<div class="card"><div class="vocab"><span class="badge">ON</span><div class="grow w">${esc(x.on || '—')}</div></div><div class="vocab"><span class="badge">KUN</span><div class="grow w">${esc(x.kun || '—')}</div></div>
    ${x.words.map(w => `<div class="vocab">${sayBtn(w[1], 'ja')}<div class="grow"><div class="w">${esc(w[0])} <span class="mut">(${esc(w[1])})</span></div><div class="mut">${esc(w[2])}</div></div></div>`).join('')}</div>` : ''}
    <div class="row"><button class="btn grow" onclick="App.jcW()">✍️ Practicar escritura</button><button class="btn sec grow" onclick="App.jcAdd()">+ Repaso</button></div>`;
  A.jcAnim = () => animate(document.querySelector('.ksvg'), x.write[0]);
  A.jcW = () => go('pad', { items: [x], i: 0, mode: 'guided' });
  A.jcAdd = () => { T.srsAdd('ja', [x.ch, x.read, x.mean]); (x.words || []).slice(0, 2).forEach(w => T.srsAdd('ja', w)); toast('Añadido al repaso ✓'); };
  setTimeout(A.jcAnim, 300);
};

// ------------------------------------------------------------------ SVG de trazos
function strokeSVG(ch, cls) {
  const m = medOf(ch); if (!m) return '';
  return `<svg class="ksvg ${cls || ''}" viewBox="0 0 1024 1024"><g transform="translate(0,900) scale(1,-1)">${m.map(s => `<polyline class="ghost" points="${s.map(p => p.join(',')).join(' ')}"/>`).join('')}</g></svg>`;
}
function animate(svg, ch, only) {
  const m = medOf(ch); if (!svg || !m) { if (!m) toast('Sin datos de trazos para ' + ch); return; }
  const g = svg.querySelector('g'); g.querySelectorAll('.anim,.num').forEach(e => e.remove());
  m.forEach((s, k) => {
    if (only != null && k !== only) return;
    const pl = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    pl.setAttribute('points', s.map(p => p.join(',')).join(' ')); pl.setAttribute('class', 'anim'); pl.setAttribute('pathLength', '1');
    pl.style.animationDelay = (only != null ? 0 : k * 0.65) + 's'; g.appendChild(pl);
    if (only == null) {
      const t = document.createElementNS('http://www.w3.org/2000/svg', 'text'); t.setAttribute('class', 'num');
      t.setAttribute('transform', `translate(${s[0][0] - 30},${s[0][1] + 20}) scale(1,-1)`); t.textContent = k + 1; t.style.animationDelay = k * 0.65 + 's'; g.appendChild(t);
    }
  });
}

// ------------------------------------------------------------------ comparación de trazos
function resample(pts, n) {
  if (pts.length < 2) return Array(n).fill(pts[0] || [0, 0]);
  const d = [0]; for (let i = 1; i < pts.length; i++) d.push(d[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const L = d[d.length - 1] || 1, out = [];
  for (let k = 0; k < n; k++) { const t = L * k / (n - 1); let i = 1; while (i < d.length - 1 && d[i] < t) i++; const f = (t - d[i - 1]) / ((d[i] - d[i - 1]) || 1); out.push([pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f]); }
  return out;
}
const plen = (p) => p.reduce((a, q, i) => i ? a + Math.hypot(q[0] - p[i - 1][0], q[1] - p[i - 1][1]) : 0, 0);
function strokeMatch(user, med) { // ambos en coordenadas 1024
  const a = resample(user, 16), b = resample(med, 16);
  const fwd = a.reduce((s, p, i) => s + Math.hypot(p[0] - b[i][0], p[1] - b[i][1]), 0) / 16;
  const rev = a.reduce((s, p, i) => s + Math.hypot(p[0] - b[15 - i][0], p[1] - b[15 - i][1]), 0) / 16;
  const lr = (plen(user) + 120) / (plen(med) + 120);
  const tol = 175;
  return { ok: fwd < tol && lr > 0.3 && lr < 3.2, reversed: rev < tol && rev < fwd * 0.7, dist: fwd };
}

// ------------------------------------------------------------------ lienzo de escritura
// mode: 'guided' (trazo a trazo con corrección), 'free' (calcar libre) o 'memory' (sin guía, se corrige al final)
V.pad = async function (arg) {
  await needKana().catch(() => { });
  const items = arg.items; let i = arg.i || 0; const mode = arg.mode || 'guided';
  // aplanar: cada elemento a escribir es un carácter
  const chars = []; items.forEach(x => x.write.forEach(c => chars.push({ c, item: x })));
  let strokes = [], cur = null, exp = 0, miss = 0, missHere = 0, results = [], finished = false;
  const W = 600, toM = (p) => [p[0] * 1024 / W, 900 - p[1] * 1024 / W];
  function draw() {
    const { c, item } = chars[i]; const med = medOf(c);
    strokes = []; exp = 0; miss = 0; missHere = 0; finished = false;
    const hide = mode === 'memory';
    T.$app.innerHTML = top(`✍️ ${mode === 'memory' ? 'De memoria' : 'Escritura'} ${i + 1}/${chars.length}`) + `
    <div class="card center">
      ${hide ? `<div class="mut">Escribe de memoria:</div><div class="q">${esc(item.read)}</div><div class="mut">${esc(item.mean)}</div>`
      : `<div class="row" style="justify-content:center"><div class="big" style="margin:0">${c}</div>${sayBtn(item.ch, 'ja')}</div><div class="mut">${esc(item.read)}${item.mean && item.on != null ? ' · ' + esc(item.mean) : ''}${med ? ' · ' + med.length + ' trazos' : ''}</div>`}
      <div class="padwrap">${med ? `<svg class="ksvg pad" id="guide" viewBox="0 0 1024 1024" style="opacity:${hide ? 0 : 1}"><g transform="translate(0,900) scale(1,-1)">${med.map(s => `<polyline class="ghost" points="${s.map(p => p.join(',')).join(' ')}"/>`).join('')}</g></svg>` : `<div class="padguide" style="opacity:${hide ? 0 : .16}">${c}</div>`}
      <canvas id="pad" width="${W}" height="${W}"></canvas></div>
      <div id="pmsg" class="mut" style="min-height:22px">${mode === 'guided' && med ? 'Traza el <b>trazo 1</b> de ' + med.length + ' siguiendo la guía.' : 'Dibuja el carácter completo y pulsa Comprobar.'}</div>
      <div class="row wrap" style="justify-content:center;gap:6px;margin-top:6px">
        <button class="btn sm sec" onclick="App.pUndo()">↶ Deshacer</button><button class="btn sm sec" onclick="App.pClear()">🗑 Borrar</button>
        ${med ? `<button class="btn sm sec" onclick="App.pAnim()">🎬 Orden</button>` : ''}${mode !== 'guided' ? `<button class="btn sm sec" onclick="App.pCheck()">✔ Comprobar</button>` : ''}
      </div>
      <div class="row" style="margin-top:10px"><button class="btn grow" id="pnext" onclick="App.pNext()">${i + 1 < chars.length ? 'Siguiente →' : 'Terminar'}</button></div>
    </div>`;
    setup();
  }
  function msg(h) { const e = document.getElementById('pmsg'); if (e) e.innerHTML = h; }
  function setup() {
    const cv = document.getElementById('pad');
    const pos = (e) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * W / r.width, (e.clientY - r.top) * W / r.height]; };
    cv.onpointerdown = (e) => { if (finished) return; e.preventDefault(); cv.setPointerCapture(e.pointerId); cur = [pos(e)]; strokes.push({ pts: cur, st: 'draw' }); paint(); };
    cv.onpointermove = (e) => { if (!cur) return; e.preventDefault(); cur.push(pos(e)); paint(); };
    cv.onpointerup = cv.onpointercancel = () => { if (!cur) return; const s = strokes[strokes.length - 1]; cur = null; if (mode === 'guided') judge(s); paint(); };
    paint();
  }
  function paint() {
    const cv = document.getElementById('pad'); if (!cv) return; const x = cv.getContext('2d');
    x.clearRect(0, 0, W, W);
    x.strokeStyle = '#33415566'; x.lineWidth = 2; x.setLineDash([10, 10]); x.beginPath(); x.moveTo(W / 2, 0); x.lineTo(W / 2, W); x.moveTo(0, W / 2); x.lineTo(W, W / 2); x.stroke(); x.setLineDash([]);
    x.lineCap = 'round'; x.lineJoin = 'round'; x.lineWidth = 24;
    strokes.forEach(s => { x.strokeStyle = s.st === 'ok' ? '#f1f5f9' : s.st === 'bad' ? '#ef4444' : s.st === 'warn' ? '#f59e0b' : '#a5b4fc'; x.beginPath(); s.pts.forEach((p, j) => j ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])); if (s.pts.length === 1) x.lineTo(s.pts[0][0] + .1, s.pts[0][1]); x.stroke(); });
  }
  // modo guiado: se valida cada trazo en orden
  function judge(s) {
    const med = medOf(chars[i].c); if (!med) { s.st = 'ok'; return; }
    const m = strokeMatch(s.pts.map(toM), med[exp]);
    if (m.ok) {
      s.st = 'ok'; s.pts = med[exp].map(p => [p[0] * W / 1024, (900 - p[1]) * W / 1024]); exp++; missHere = 0; T.sfx('tap');
      if (exp >= med.length) return complete();
      msg(`✅ ¡Bien! Ahora el <b>trazo ${exp + 1}</b> de ${med.length}.`);
    } else {
      miss++; missHere++; T.sfx('bad'); T.vib(60);
      strokes.pop();
      const other = med.findIndex((q, k) => k !== exp && strokeMatch(s.pts.map(toM), q).ok);
      msg(m.reversed ? '↩️ Dirección al revés: empieza por el otro extremo.' : other > exp ? `🔢 Ese es el trazo ${other + 1}; primero va el <b>trazo ${exp + 1}</b>.` : `❌ Inténtalo de nuevo: <b>trazo ${exp + 1}</b>.`);
      if (missHere >= 2) animate(document.getElementById('guide'), chars[i].c, exp);
    }
  }
  function complete() {
    finished = true; const med = medOf(chars[i].c);
    const score = Math.max(0, Math.round(100 - miss * 100 / (med.length * 2)));
    record(score);
    msg(`<b style="color:${score >= 80 ? 'var(--ok)' : 'var(--warn)'}">${score >= 95 ? '¡Perfecto! 🎉' : score >= 80 ? '¡Muy bien! 👍' : '¡Completado! 💪'} · ${score}%</b>${miss ? ` <span class="mut">(${miss} error${miss > 1 ? 'es' : ''})</span>` : ''}`);
    speak(chars[i].item.ch, 'ja');
  }
  function record(score) {
    const c = chars[i].c; S().write[c] = Math.max(S().write[c] || 0, score); results.push(score); T.save();
    if (score >= 70) { T.addXP(score >= 90 ? 6 : 4); T.sfx('ok'); } else T.sfx('bad');
  }
  // modo libre / memoria: evaluación al final, trazo por trazo y en orden
  A.pCheck = () => {
    if (finished) return; const med = medOf(chars[i].c);
    if (!strokes.length) return toast('Dibuja primero ✍️');
    if (!med) { finished = true; return msg('Compara con el modelo.'); }
    let ok = 0, order = 0, dir = 0;
    strokes.forEach((s, k) => {
      const u = s.pts.map(toM);
      const m = med[k] ? strokeMatch(u, med[k]) : { ok: false };
      if (m.ok) { ok++; s.st = 'ok'; }
      else if (m.reversed) { dir++; s.st = 'warn'; }
      else if (med.some((q, j) => j !== k && strokeMatch(u, q).ok)) { order++; s.st = 'warn'; }
      else s.st = 'bad';
    });
    const score = Math.round(Math.max(0, ok / med.length - Math.max(0, strokes.length - med.length) * 0.1) * 100);
    finished = true; record(score); paint();
    const g = document.getElementById('guide'); if (g) g.style.opacity = 1;
    msg(`<b style="color:${score >= 80 ? 'var(--ok)' : score >= 50 ? 'var(--warn)' : 'var(--bad)'}">${score}%</b> · ${ok}/${med.length} trazos correctos${strokes.length !== med.length ? ` · dibujaste ${strokes.length}` : ''}${order ? ` · ${order} fuera de orden` : ''}${dir ? ` · ${dir} al revés` : ''}`);
  };
  A.pUndo = () => { if (finished && mode === 'guided') return; if (mode === 'guided') { if (exp > 0 && strokes.length) { strokes.pop(); exp--; } } else strokes.pop(); finished = false; paint(); };
  A.pClear = () => { strokes = []; exp = 0; miss = 0; finished = false; paint(); msg(mode === 'guided' ? 'Empieza por el <b>trazo 1</b>.' : 'Dibuja el carácter completo.'); };
  A.pAnim = () => { const g = document.getElementById('guide'); if (g) { g.style.opacity = 1; animate(g, chars[i].c); } };
  A.pNext = () => {
    if (!finished && mode !== 'guided' && strokes.length) A.pCheck();
    if (i + 1 < chars.length) { i++; draw(); return; }
    const avg = results.length ? Math.round(results.reduce((a, b) => a + b, 0) / results.length) : 0;
    if (arg.onDone) arg.onDone(avg);
    if (results.length) { T.confetti(); T.sfx('win'); toast('Sesión terminada · promedio ' + avg + '%', 3000); }
    window.goBack();
  };
  draw();
};

// ------------------------------------------------------------------ lección
V.jlesson = async function ({ track, n }) {
  T.$app.innerHTML = top('✍️') + '<div class="card center"><div class="spin"></div></div>';
  if (track[0] === 'n') await needLevel(+track.slice(1));
  await needKana().catch(() => { });
  if (!T.view || T.view.name !== 'jlesson') return;
  const items = lessonItems(track, n), st = lessonState(track, n), words = lessonWords(track, n);
  const isK = track[0] === 'n', name = isK ? 'Kanji N' + track.slice(1) : track === 'hira' ? 'Hiragana' : 'Katakana';
  const steps = [['learn', '👀', 'Aprender', 'Mira cada carácter, su lectura y su orden de trazos'], ['write', '✍️', 'Escribir trazo a trazo', 'La app corrige el orden y la dirección'],
    ['quiz', '🎯', 'Quiz', 'Reconocer lecturas' + (isK ? ', significados y palabras' : '') + ' (80% para aprobar)'], ['memory', '🧠', 'Escribir de memoria', 'Sin guía: el reto final']];
  T.$app.innerHTML = top(`${name} · ${esc(lessonTitle(track, n))}`) + `
  <div class="card center"><div class="jbig">${items.map(x => `<span onclick="App.jlSay('${x.ch}')">${x.ch}</span>`).join('')}</div>
  <div class="bar" style="margin-top:10px"><i style="width:${steps.filter(s => st.steps[s[0]]).length * 25}%"></i></div></div>
  <div class="steps">${steps.map(s => `<button class="unit ${st.steps[s[0]] ? 'done' : ''}" onclick="App.jlStep('${s[0]}')"><div class="n">${st.steps[s[0]] ? '✓' : s[1]}</div><div class="grow"><b>${s[2]}</b><div class="mut">${s[3]}</div></div><span>›</span></button>`).join('')}</div>
  ${words.length ? `<div class="card"><h3>Palabras para leer</h3>${words.map(w => `<div class="vocab">${sayBtn(w[0], 'ja')}<div class="grow"><div class="w">${esc(w[0])}</div><div class="mut">${esc(w[1])}</div></div><div>${esc(w[2])}</div></div>`).join('')}</div>` : ''}
  <div class="row"><button class="btn sec grow" ${n ? '' : 'disabled'} onclick="go('jlesson',{track:'${track}',n:${n - 1}},true)">← Anterior</button><button class="btn sec grow" onclick="App.jlSkip()">Ya lo sé ✓</button><button class="btn sec grow" onclick="go('jlesson',{track:'${track}',n:${n + 1}},true)" ${n + 1 < tracks().find(t => t.id === track).lessons ? '' : 'disabled'}>Siguiente →</button></div>`;
  A.jlSay = (c) => speak(c, 'ja');
  const mark = (k, xp) => { if (!st.steps[k]) { st.steps[k] = true; T.addXP(xp); } if (st.steps.quiz && st.steps.write) st.done = true; T.save(); };
  A.jlSkip = () => { if (confirm('¿Marcar esta lección como sabida? (puedes repetirla cuando quieras)')) { ['learn', 'write', 'quiz', 'memory'].forEach(k => st.steps[k] = true); st.done = true; st.best = Math.max(st.best, 80); T.save(); T.render(); } };
  A.jlStep = (k) => {
    if (k === 'learn') go('jlearn', { track, n, onDone: () => { mark('learn', 10); items.forEach(x => T.srsAdd('ja', [x.ch, x.read, x.mean])); } });
    else if (k === 'write') go('pad', { items, i: 0, mode: 'guided', onDone: (avg) => mark('write', 20) });
    else if (k === 'memory') go('pad', { items: shuffle(items), i: 0, mode: 'memory', onDone: (avg) => { if (avg >= 50) mark('memory', 25); } });
    else go('ex', { l: 'ja', i: 0, kind: 'jquiz', qs: jquiz(track, n, items, words), onDone: (pct) => { st.best = Math.max(st.best, pct); if (pct >= 80) mark('quiz', 30); T.save(); } });
  };
};
function jquiz(track, n, items, words) {
  const isK = track[0] === 'n', qs = [];
  // distractores: de la misma pista
  let pool = []; const tr = tracks().find(t => t.id === track);
  for (let j = Math.max(0, n - 3); j < Math.min(tr.lessons, n + 3); j++) pool = pool.concat(lessonItems(track, j));
  pool = pool.filter((x, k, a) => a.findIndex(y => y.ch === x.ch) === k);
  const others = (x, f) => pick(pool.filter(y => y.ch !== x.ch && y[f] !== x[f]).map(y => y[f]), 3);
  items.forEach(x => {
    if (isK) {
      qs.push({ type: 'mc', prompt: '¿Qué significa este kanji?', big: x.ch, options: shuffle([x.mean].concat(others(x, 'mean'))), answer: x.mean });
      qs.push({ type: 'mc', prompt: '¿Cuál es el kanji de "' + x.mean + '"?', options: shuffle([x.ch].concat(others(x, 'ch'))), answer: x.ch, pic: true });
      const w = x.words[0]; if (w) { const ow = pick(pool.filter(y => y.words[0] && y.ch !== x.ch).map(y => y.words[0][1]), 3); qs.push({ type: 'mc', prompt: '¿Cómo se lee esta palabra? (' + w[2] + ')', big: w[0], say: w[1], options: shuffle([w[1]].concat(ow)), answer: w[1] }); }
    } else {
      qs.push({ type: 'mc', prompt: '¿Cómo se lee?', big: x.ch, say: x.ch, options: shuffle([x.read].concat(others(x, 'read'))), answer: x.read });
      qs.push({ type: 'mc', prompt: 'Elige: "' + x.read + '"', options: shuffle([x.ch].concat(others(x, 'ch'))), answer: x.ch, pic: true, sayAns: true });
      qs.push({ type: 'mc', listen: true, prompt: 'Escucha y elige el carácter', say: x.ch, options: shuffle([x.ch].concat(others(x, 'ch'))), answer: x.ch, pic: true });
    }
  });
  words.forEach(w => qs.push({ type: 'write', prompt: 'Escribe en romaji cómo se lee:', big: w[0], answer: w[0], pron: w[1], say: w[0] }));
  return shuffle(qs).slice(0, isK ? 20 : 16);
}
// Aprender: tarjetas de cada carácter con animación de trazos
V.jlearn = async function ({ track, n, onDone }) {
  if (track[0] === 'n') await needLevel(+track.slice(1));
  await needKana().catch(() => { });
  const items = lessonItems(track, n); let k = 0;
  function card() {
    const x = items[k];
    T.$app.innerHTML = top(`👀 ${k + 1}/${items.length}`) + `<div class="bar" style="margin-bottom:12px"><i style="width:${k / items.length * 100}%"></i></div>
    <div class="card center"><div class="row" style="justify-content:center;gap:14px"><div style="font-size:96px;line-height:1.1">${x.ch}</div>${x.write.length === 1 ? strokeSVG(x.write[0], 'big') : ''}</div>
      <div class="q">${esc(x.read)}</div>${x.on != null ? `<div class="mut">${esc(x.mean)}</div>` : `<div class="mut">${esc(x.mean)}</div>`}
      ${x.strokes ? `<div class="mut">${x.strokes} trazos</div>` : ''}
      <div class="row" style="justify-content:center;margin-top:8px">${sayBtn(x.on != null ? (x.words[0] ? x.words[0][1] : x.ch) : x.ch, 'ja')}<button class="btn sm sec" onclick="App.jlA()">🎬 Orden de trazos</button></div></div>
    ${x.words && x.words.length ? `<div class="card">${x.words.map(w => `<div class="vocab">${sayBtn(w[1], 'ja')}<div class="grow"><div class="w">${esc(w[0])} <span class="mut">(${esc(w[1])})</span></div><div class="mut">${esc(w[2])}</div></div></div>`).join('')}</div>` : ''}
    <div class="row"><button class="btn sec" ${k ? '' : 'disabled'} onclick="App.jlP()">←</button><button class="btn grow" onclick="App.jlN()">${k + 1 < items.length ? 'Siguiente →' : 'Terminar ✓'}</button></div>`;
    speak(x.on != null && x.words[0] ? x.words[0][1] : x.ch, 'ja');
    setTimeout(() => A.jlA(), 250);
  }
  A.jlA = () => { const x = items[k]; if (x.write.length === 1) animate(document.querySelector('.ksvg'), x.write[0]); };
  A.jlP = () => { if (k) { k--; card(); } };
  A.jlN = () => { if (k + 1 < items.length) { k++; card(); } else { if (onDone) onDone(); window.goBack(); } };
  card();
};

// ------------------------------------------------------------------ vista "Kanji" (atajo a las pistas N5–N1)
V.kanji = function () { A._jt = A._jt && A._jt[0] === 'n' ? A._jt : 'n5'; go('jwrite', null, true); };
window.JPW_INT = { tracks, items: lessonItems, title: lessonTitle, load: needLevel };
window.JP_TOTAL_KANJI = () => Object.values(window.JPK_COUNTS || {}).reduce((a, b) => a + b, 0);
})();

// =====================================================================
// Integración con Cursos → Japonés e Inicio
// =====================================================================
(function () {
  const T = window.TL, A = T.A, esc = T.esc;
  const tr = () => window.JPW_INT.tracks();
  const doneIn = (t) => { const st = T.S.jpw || {}; let d = 0; for (let i = 0; i < t.lessons; i++) if (st[t.id + '-' + i] && st[t.id + '-' + i].done) d++; return d; };
  // Progreso total de japonés 0‑100: 50% gramática/conversación, 20% kana, 30% kanji
  window.JPW_INT.percent = function () {
    const nu = T.NU(); let du = 0; for (let i = 0; i < nu; i++) { const u = T.S.units['ja-' + i]; if (u && u.done) du++; }
    const t = tr(), kana = t.filter(x => !x.lv), kan = t.filter(x => x.lv);
    const kp = kana.reduce((a, x) => a + doneIn(x), 0) / kana.reduce((a, x) => a + x.lessons, 0);
    const kj = kan.reduce((a, x) => a + doneIn(x), 0) / kan.reduce((a, x) => a + x.lessons, 0);
    return { total: Math.round(du / nu * 50 + kp * 20 + kj * 30), units: [du, nu], kana: Math.round(kp * 100), kanji: Math.round(kj * 100) };
  };
  // Siguiente lección de escritura recomendada (hiragana → katakana → N5 → … → N1)
  window.JPW_INT.next = function () {
    for (const t of tr()) for (let i = 0; i < t.lessons; i++) { const s = (T.S.jpw || {})[t.id + '-' + i]; if (!s || !s.done) return { track: t, n: i, title: window.JPW_INT.title(t.id, i), steps: s ? ['learn', 'write', 'quiz', 'memory'].filter(k => s.steps[k]).length : 0 }; }
    return null;
  };
  // Contenido de las pestañas de escritura dentro de Cursos → Japonés
  window.JPW_INT.section = async function (sub, el) {
    const list = tr().filter(t => sub === 'kanji' ? t.lv : t.id === sub);
    let h = '';
    if (sub === 'kanji') {
      const open = A._jkopen || list.find(t => doneIn(t) < t.lessons)?.id || 'n5';
      for (const t of list) {
        const d = doneIn(t);
        h += `<button class="lvl ${t.id === open ? 'cur' : ''} ${d === t.lessons ? 'done' : ''}" onclick="App._jkopen=App._jkopen==='${t.id}'?'-':'${t.id}';render()"><span class="lic">漢</span><div class="grow"><b>Kanji N${t.lv}</b> <span class="badge">${window.JPK_COUNTS[t.lv]} kanji</span><div class="mut">${{ 5: 'Lo esencial: números, días, personas, verbos básicos', 4: 'Vida diaria: familia, ciudad, tiempo, acciones', 3: 'Intermedio: trabajo, sociedad, emociones', 2: 'Avanzado: noticias, economía, abstracto', 1: 'Maestría: literatura, política, términos cultos' }[t.lv]}</div><div class="bar" style="margin-top:6px"><i style="width:${d / t.lessons * 100}%;background:var(--ja)"></i></div></div><span class="mut">${d}/${t.lessons}</span></button>`;
        if (t.id === open) { await window.JPW_INT.load(t.lv); h += lessonsHTML(t); }
      }
    } else list.forEach(t => { h += `<div class="card"><b>${t.ic} ${t.n}</b> <span class="mut">· ${doneIn(t)}/${t.lessons} lecciones</span><div class="bar" style="margin-top:6px"><i style="width:${doneIn(t) / t.lessons * 100}%;background:var(--ja)"></i></div><button class="btn sm sec" style="margin-top:8px" onclick="go('jtable','${t.id}')">Ver tabla completa</button></div>` + lessonsHTML(t); });
    if (el && document.body.contains(el)) el.innerHTML = h;
  };
  function lessonsHTML(t) {
    let h = '<div class="path">';
    for (let i = 0; i < t.lessons; i++) {
      const s = (T.S.jpw || {})[t.id + '-' + i], d = s && s.done, nst = s ? ['learn', 'write', 'quiz', 'memory'].filter(k => s.steps[k]).length : 0;
      const chars = window.JPW_INT.items(t.id, i).map(x => x.ch).join(' ');
      h += `<button class="unit ${d ? 'done' : ''}" onclick="go('jlesson',{track:'${t.id}',n:${i}})"><div class="n">${d ? '✓' : i + 1}</div><div class="grow"><b>${esc(window.JPW_INT.title(t.id, i))}</b><div class="jprev">${chars}</div><div class="mut">${nst}/4 pasos</div></div><span>›</span></button>`;
    }
    return h + '</div>';
  }
})();
