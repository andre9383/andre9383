/**
 * Acceso a las hojas. Lee y escribe por NOMBRE de encabezado, nunca por letra de columna,
 * así que agregar columnas al final no rompe nada.
 */

function libro_() { return SpreadsheetApp.getActiveSpreadsheet(); }

function hoja_(nombre) {
  var ss = libro_();
  var sh = ss.getSheetByName(nombre);
  if (!sh) {
    sh = ss.insertSheet(nombre);
    var enc = ENC[nombre];
    if (enc) {
      sh.getRange(1, 1, 1, enc.length).setValues([enc]).setFontWeight('bold').setBackground('#0d2b45').setFontColor('#ffffff');
      sh.setFrozenRows(1);
    }
  }
  return sh;
}

/** Agrega al final las columnas de ENC que falten. No borra ni reordena nada. */
function asegurarEncabezados_(nombre) {
  var sh = hoja_(nombre), enc = ENC[nombre];
  if (!enc) return sh;
  var lastCol = Math.max(sh.getLastColumn(), 1);
  var actuales = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(function (x) { return txt_(x); });
  var vacia = actuales.every(function (x) { return !x; });
  if (vacia) {
    sh.getRange(1, 1, 1, enc.length).setValues([enc]).setFontWeight('bold');
    sh.setFrozenRows(1);
    return sh;
  }
  var faltan = enc.filter(function (c) { return actuales.indexOf(c) < 0; });
  if (faltan.length) {
    var ultima = actuales.length;
    while (ultima > 0 && !actuales[ultima - 1]) ultima--;
    sh.getRange(1, ultima + 1, 1, faltan.length).setValues([faltan]).setFontWeight('bold');
  }
  return sh;
}

/** Lee una hoja completa: { enc, idx, filas } con filas como arreglos (sin encabezado). */
function leer_(nombre) {
  var sh = hoja_(nombre);
  var lr = sh.getLastRow(), lc = sh.getLastColumn();
  if (lr < 1 || lc < 1) return { sh: sh, enc: [], idx: {}, filas: [], nums: [] };
  var v = sh.getRange(1, 1, lr, lc).getValues();
  var enc = v[0].map(function (x) { return txt_(x); });
  var idx = {};
  enc.forEach(function (c, i) { if (c && idx[c] === undefined) idx[c] = i; });
  var filas = [], nums = [];
  for (var i = 1; i < v.length; i++) {
    if (v[i].some(function (c) { return c !== '' && c !== null; })) { filas.push(v[i]); nums.push(i + 1); }
  }
  return { sh: sh, enc: enc, idx: idx, filas: filas, nums: nums };
}

/** Lee como objetos { 'ENCABEZADO': valor, _fila: número de fila en la hoja }. */
function objetos_(nombre) {
  var sh = hoja_(nombre);
  var lr = sh.getLastRow(), lc = sh.getLastColumn();
  if (lr < 2 || lc < 1) return [];
  var v = sh.getRange(1, 1, lr, lc).getValues();
  var enc = v[0].map(function (x) { return txt_(x); });
  var out = [];
  for (var i = 1; i < v.length; i++) {
    var r = v[i];
    if (!r.some(function (c) { return c !== '' && c !== null; })) continue;
    var o = { _fila: i + 1 };
    for (var j = 0; j < enc.length; j++) if (enc[j] && o[enc[j]] === undefined) o[enc[j]] = r[j];
    out.push(o);
  }
  return out;
}

function encabezados_(nombre) {
  var sh = hoja_(nombre);
  var lc = Math.max(sh.getLastColumn(), 1);
  return sh.getRange(1, 1, 1, lc).getValues()[0].map(function (x) { return txt_(x); });
}

function aFila_(enc, obj) {
  return enc.map(function (c) { return c && obj[c] !== undefined && obj[c] !== null ? obj[c] : ''; });
}

function appendFilas_(nombre, objs) {
  if (!objs || !objs.length) return;
  var sh = hoja_(nombre), enc = encabezados_(nombre);
  var filas = objs.map(function (o) { return aFila_(enc, o); });
  sh.getRange(sh.getLastRow() + 1, 1, filas.length, enc.length).setValues(filas);
}

/** Actualiza solo los campos indicados de una fila. */
function actualizarFila_(nombre, fila, cambios) {
  var sh = hoja_(nombre), enc = encabezados_(nombre);
  var r = sh.getRange(fila, 1, 1, enc.length);
  var v = r.getValues()[0];
  Object.keys(cambios).forEach(function (k) {
    var i = enc.indexOf(k);
    if (i >= 0) v[i] = cambios[k];
  });
  r.setValues([v]);
}

/** Reemplaza todas las filas de datos (deja el encabezado). */
function reemplazarDatos_(nombre, filas2D) {
  var sh = hoja_(nombre);
  var lr = sh.getLastRow(), lc = Math.max(sh.getLastColumn(), filas2D.length ? filas2D[0].length : 1);
  if (lr > 1) sh.getRange(2, 1, lr - 1, lc).clearContent();
  if (filas2D.length) sh.getRange(2, 1, filas2D.length, filas2D[0].length).setValues(filas2D);
}

function buscarFila_(nombre, columna, valor) {
  var d = leer_(nombre), i = d.idx[columna];
  if (i === undefined) return null;
  for (var k = 0; k < d.filas.length; k++) {
    if (txt_(d.filas[k][i]) === txt_(valor)) {
      var o = { _fila: d.nums[k] };
      d.enc.forEach(function (c, j) { if (c && o[c] === undefined) o[c] = d.filas[k][j]; });
      return o;
    }
  }
  return null;
}
