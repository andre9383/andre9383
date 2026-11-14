// Simulador mínimo de servicios de Google Apps Script para pruebas locales.
const crypto = require('crypto'), vm = require('vm'), fs = require('fs'), path = require('path');
process.env.TZ = 'America/Bogota';
const signed = buf => Array.from(buf).map(b => b > 127 ? b - 256 : b);
const toBuf = v => Array.isArray(v) ? Buffer.from(v.map(b => (b + 256) % 256)) : Buffer.from(String(v), 'utf8');
const envolver = (t) => { const p = new Proxy(t, { get: (o, k) => { if (k in o) { const v = o[k]; return typeof v === 'function' ? (...a) => { const r = v.apply(o, a); return r === o ? p : r; } : v; } return typeof k === 'string' ? () => p : undefined; } }); return p; };
const chain = (extra = {}) => { const p = new Proxy(function () {}, { get: (t, k) => k in extra ? extra[k] : (k === 'then' ? undefined : () => p), apply: () => p }); return p; };

class Range {
  constructor(sh, r, c, nr, nc) { Object.assign(this, { sh, r, c, nr, nc }); return envolver(this); }
  getValues() { const out = []; for (let i = 0; i < this.nr; i++) { const row = this.sh.data[this.r - 1 + i] || []; const o = []; for (let j = 0; j < this.nc; j++) { const v = row[this.c - 1 + j]; o.push(v === undefined || v === null ? '' : v); } out.push(o); } return out; }
  setValues(v) { if (v.length !== this.nr || v.some(r => r.length !== this.nc)) throw new Error(`setValues: tamaño ${v.length}x${v[0] && v[0].length} no coincide con rango ${this.nr}x${this.nc}`);
    for (let i = 0; i < this.nr; i++) { const ri = this.r - 1 + i; while (this.sh.data.length <= ri) this.sh.data.push([]); for (let j = 0; j < this.nc; j++) { const val = v[i][j]; if (val === undefined) throw new Error('setValues: undefined en ' + this.sh.name); if (val !== null && typeof val === 'object' && !(val instanceof Date)) throw new Error('setValues: valor inválido ' + JSON.stringify(val)); this.sh.data[ri][this.c - 1 + j] = val; } } return this; }
  clearContent() { for (let i = 0; i < this.nr; i++) { const row = this.sh.data[this.r - 1 + i]; if (row) for (let j = 0; j < this.nc; j++) row[this.c - 1 + j] = ''; } return this; }
}
class Sheet {
  constructor(name, data) { this.name = name; this.data = data || []; return envolver(this); }
  getName() { return this.name; } setName(n) { this.name = n; return this; }
  getLastRow() { for (let i = this.data.length - 1; i >= 0; i--) if ((this.data[i] || []).some(v => v !== '' && v != null)) return i + 1; return 0; }
  getLastColumn() { let m = 0; this.data.forEach(r => { for (let j = (r || []).length - 1; j >= 0; j--) if (r[j] !== '' && r[j] != null) { m = Math.max(m, j + 1); break; } }); return m; }
  getRange(r, c, nr = 1, nc = 1) { if (r < 1 || c < 1 || nr < 1 || nc < 1) throw new Error(`getRange inválido ${r},${c},${nr},${nc}`); return new Range(this, r, c, nr, nc); }
  getDataRange() { return this.getRange(1, 1, Math.max(1, this.getLastRow()), Math.max(1, this.getLastColumn())); }
}
class SS { constructor(name) { this.name = name; this.sheets = []; this.id = 'ss_' + crypto.randomUUID(); }
  getSheetByName(n) { return this.sheets.find(s => s.name === n) || null; }
  insertSheet(n) { if (this.getSheetByName(n)) throw new Error('Ya existe la hoja ' + n); const s = new Sheet(n); this.sheets.push(s); return s; }
  getSheets() { if (!this.sheets.length) this.sheets.push(new Sheet('Hoja 1')); return this.sheets; } getId() { return this.id; } }

function crearEntorno(libro) {
  const cache = new Map(), props = new Map(), mails = [], fetches = [], triggers = [];
  const env = { activeUser: '', mails, fetches, props, cache, libro, triggers };
  const ctx = {
    console: { log: () => {}, warn: () => {}, error: (...a) => env.errores = (env.errores || []).concat(a.map(String)) },
    SpreadsheetApp: { getActiveSpreadsheet: () => libro, getActive: () => libro, create: n => new SS(n), flush: () => {}, getUi: () => { throw new Error('Sin UI'); } },
    CacheService: { getScriptCache: () => ({ get: k => cache.has(k) ? cache.get(k) : null, put: (k, v, s) => { if (s > 21600) throw new Error('Cache: expiración máxima 21600'); if (String(v).length > 100000) throw new Error('Cache: valor > 100KB'); cache.set(k, String(v)); }, remove: k => cache.delete(k) }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => props.has(k) ? props.get(k) : null, setProperty: (k, v) => { props.set(k, String(v)); }, deleteProperty: k => props.delete(k) }) },
    Utilities: {
      getUuid: () => crypto.randomUUID(), DigestAlgorithm: { SHA_256: 'sha256' }, Charset: { UTF_8: 'utf8' },
      computeDigest: (alg, s) => signed(crypto.createHash('sha256').update(String(s), 'utf8').digest()),
      computeHmacSha256Signature: (v, k) => signed(crypto.createHmac('sha256', toBuf(k)).update(toBuf(v)).digest()),
      newBlob: s => ({ getBytes: () => signed(Buffer.from(String(s), 'utf8')) }),
      base64Encode: v => toBuf(v).toString('base64'),
      formatDate: (d, tz, p) => { const z = n => String(n).padStart(2, '0'); return p.replace('yyyy', d.getFullYear()).replace('yy', String(d.getFullYear()).slice(2)).replace('MM', z(d.getMonth() + 1)).replace('dd', z(d.getDate())).replace('HH', z(d.getHours())).replace('mm', z(d.getMinutes())); },
      sleep: () => {}
    },
    LockService: { getScriptLock: () => ({ waitLock: () => {}, releaseLock: () => {} }) },
    Session: { getActiveUser: () => ({ getEmail: () => env.activeUser }), getEffectiveUser: () => ({ getEmail: () => 'owner@x.com' }) },
    MailApp: { sendEmail: (to, subj, body) => mails.push({ to, subj, body }) },
    ScriptApp: { getOAuthToken: () => 'tok', getProjectTriggers: () => triggers, deleteTrigger: () => {}, newTrigger: n => { triggers.push(n); return chain(); } },
    UrlFetchApp: { fetch: (url, o) => { fetches.push({ url, o }); if (/anthropic/.test(url)) { const body = JSON.parse(o.payload); env.iaBody = body; env.iaHeaders = o.headers; return { getResponseCode: () => 200, getContentText: () => JSON.stringify({ stop_reason: 'end_turn', content: [{ type: 'text', text: 'Lectura simulada de la IA con ' + body.messages[0].content.length + ' caracteres de indicadores.' }] }) }; }
      return { getResponseCode: () => /drive\/v3/.test(url) ? 204 : 200, getBlob: () => ({ getBytes: () => [80, 75, 3, 4] }), getContentText: () => '' }; } },
    DocumentApp: { create: () => { const body = chain({ appendTable: (rows) => { env.tablas = (env.tablas || 0) + 1; rows.forEach(r => r.forEach(c => { if (typeof c !== 'string') throw new Error('appendTable: celda no es texto'); })); return chain({ getRow: () => chain({ getNumCells: () => rows[0].length }) }); } }); return chain({ getBody: () => body, getId: () => 'doc1' }); }, ParagraphHeading: { HEADING1: 1, HEADING2: 2, TITLE: 0 }, GlyphType: { BULLET: 'b' } },
    HtmlService: chain(),
    Date, Math, JSON, Object, Array, String, Number, RegExp, Error, isNaN, isFinite, parseFloat, parseInt
  };
  vm.createContext(ctx);
  const dir = process.argv[2];
  fs.readdirSync(dir).filter(f => f.endsWith('.gs')).sort().forEach(f => vm.runInContext(fs.readFileSync(path.join(dir, f), 'utf8'), ctx, { filename: f }));
  return { ctx, env };
}
module.exports = { crearEntorno, SS, Sheet };
