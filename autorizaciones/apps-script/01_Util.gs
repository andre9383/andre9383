/**
 * Utilidades: fechas, textos, números, hash, auditoría.
 */

function ahora_() { return new Date(); }

function fmtFecha_(d, patron) {
  if (!d) return '';
  return Utilities.formatDate(d, APP.ZONA, patron || 'yyyy-MM-dd HH:mm');
}

/** Convierte lo que venga (Date, número serial, texto dd/mm/aaaa, ISO) en Date o null. */
function aFecha_(v) {
  if (v === null || v === undefined || v === '') return null;
  if (Object.prototype.toString.call(v) === '[object Date]') return isNaN(v.getTime()) ? null : v;
  if (typeof v === 'number') {
    if (v > 1e11) return new Date(v);                 // milisegundos
    if (v > 20000 && v < 80000) return new Date(Math.round((v - 25569) * 864e5)); // serial de Excel
    return null;
  }
  var s = String(v).trim();
  if (!s) return null;
  var m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})(?:[ T]+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([aApP]\.?\s*[mM]\.?)?)?/);
  if (m) {
    var y = +m[3]; if (y < 100) y += 2000;
    var h = +(m[4] || 0), mi = +(m[5] || 0), se = +(m[6] || 0);
    if (m[7]) { var pm = /p/i.test(m[7]); if (pm && h < 12) h += 12; if (!pm && h === 12) h = 0; }
    var d1 = new Date(y, +m[2] - 1, +m[1], h, mi, se);
    return isNaN(d1.getTime()) ? null : d1;
  }
  var d2 = new Date(s);
  return isNaN(d2.getTime()) ? null : d2;
}

function ms_(v) { var d = aFecha_(v); return d ? d.getTime() : null; }

/** "1.234.567,89" → 1234567.89 ; "$ 1,234.50" → 1234.5 ; número → número. */
function aNumero_(v) {
  if (v === null || v === undefined || v === '') return 0;
  if (typeof v === 'number') return isFinite(v) ? v : 0;
  var s = String(v).replace(/[^\d,.\-]/g, '');
  if (!s) return 0;
  var coma = s.lastIndexOf(','), punto = s.lastIndexOf('.');
  if (coma > punto) s = s.replace(/\./g, '').replace(',', '.');
  else if (punto > coma && coma >= 0) s = s.replace(/,/g, '');
  else if (coma < 0 && (s.match(/\./g) || []).length > 1) s = s.replace(/\./g, '');
  var n = parseFloat(s);
  return isFinite(n) ? n : 0;
}

function txt_(v) { return v === null || v === undefined ? '' : String(v).trim(); }
function may_(v) { return txt_(v).toUpperCase(); }

/** Quita tildes y espacios dobles para comparar textos. */
function norm_(v) {
  return may_(v).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
}

/** Evita que un texto escrito por un usuario se ejecute como fórmula en la hoja o en Excel. */
function seguro_(v) {
  var s = txt_(v);
  if (s.length > 2000) s = s.slice(0, 2000);
  return /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
}

function uuid_() { return Utilities.getUuid(); }

function sha256_(texto) {
  var b = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, texto, Utilities.Charset.UTF_8);
  return b.map(function (x) { return ('0' + ((x + 256) % 256).toString(16)).slice(-2); }).join('');
}

function diasEntre_(a, b) { return Math.floor(((b || ahora_()) - a) / 864e5); }

function prop_(k, v) {
  var p = PropertiesService.getScriptProperties();
  if (v === undefined) return p.getProperty(k);
  p.setProperty(k, String(v));
  return v;
}

/** Registro de auditoría en HISTORICO. */
function auditar_(sesion, accion, idRegistro, ingreso, detalle) {
  try {
    appendFilas_(H.HISTORICO, [{
      'FECHA Y HORA': ahora_(), 'ID REGISTRO': idRegistro || '', 'INGRESO': ingreso || '', 'ACCION': accion,
      'USUARIO DOCUMENTO': sesion ? sesion.documento : 'SISTEMA', 'USUARIO': sesion ? sesion.nombre : 'Sistema',
      'DETALLE': seguro_(typeof detalle === 'string' ? detalle : JSON.stringify(detalle || ''))
    }]);
  } catch (e) { console.error('auditar_', e); }
}

function conBloqueo_(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try { return fn(); } finally { lock.releaseLock(); }
}
