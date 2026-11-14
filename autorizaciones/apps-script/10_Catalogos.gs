/**
 * Catálogos: ERP › contrato, áreas › ala, códigos de RESPONSABLE y parámetros.
 * Cada texto nuevo del Excel recibe una propuesta automática que el administrador puede corregir.
 */

var FAMILIAS_ERP = [
  [/CAPRESOCA/, 'CAPRESOCA'], [/NUEVA\s*EMP|NUEVA\s*EPS/, 'NUEVA EPS'], [/SANITAS/, 'SANITAS'],
  [/COOSALUD/, 'COOSALUD'], [/FAMISANAR/, 'FAMISANAR'], [/SALUD\s*TOTAL/, 'SALUD TOTAL'], [/COMPENSAR/, 'COMPENSAR'],
  [/FOMAG|MAGISTERIO/, 'FOMAG'], [/COLMEDICA/, 'COLMEDICA'], [/MEDIMAS/, 'MEDIMAS'], [/POLICIA/, 'POLICÍA NACIONAL'],
  [/EJERCITO|SANIDAD\s*MILITAR|FUERZAS\s*MILITARES/, 'SANIDAD MILITAR'], [/ADRES|ADMINISTRADORA\s*DE\s*LOS\s*RECURSOS/, 'ADRES'],
  [/RECIEN\s*NACIDO.*SIN\s*SEGURIDAD/, 'SIN SEGURIDAD SOCIAL'], [/SIN\s*SEGURIDAD/, 'SIN SEGURIDAD SOCIAL'],
  [/PARTICULAR/, 'PARTICULARES'], [/PREVISORA/, 'LA PREVISORA'], [/EQUIDAD/, 'LA EQUIDAD SEGUROS'],
  [/SURAMERICANA|\bSURA\b/, 'SURA'], [/SEGUROS\s*DEL\s*ESTADO/, 'SEGUROS DEL ESTADO'], [/MUNDIAL/, 'SEGUROS MUNDIAL'],
  [/BOLIVAR/, 'SEGUROS BOLÍVAR'], [/AXA|COLPATRIA/, 'AXA COLPATRIA'], [/ALLIANZ/, 'ALLIANZ'], [/HDI|LIBERTY/, 'HDI SEGUROS'],
  [/POSITIVA/, 'POSITIVA'], [/SOLIDARIA/, 'SEGUROS SOLIDARIA']
];

function proponerErp_(texto) {
  var t = norm_(texto);
  var erp = '';
  for (var i = 0; i < FAMILIAS_ERP.length; i++) if (FAMILIAS_ERP[i][0].test(t)) { erp = FAMILIAS_ERP[i][1]; break; }
  if (!erp) erp = t.split(/\s+-\s+|-CUPS|\s\(/)[0].replace(/\s+S\.?A\.?S?\.?$/, '').trim() || 'SIN ENTIDAD';
  var partes = [];
  if (/SUBSIDIADO/.test(t)) partes.push('SUBSIDIADO');
  if (/CONTRIBUTIVO/.test(t)) partes.push('CONTRIBUTIVO');
  if (/URGENCIAS\s*SIN/.test(t)) partes.push('URGENCIAS');
  if (/PGP/.test(t)) partes.push('PGP');
  var cto = t.match(/CTO[\s\-._]*([0-9][0-9\-]*)/) || t.match(/CONTRATO[\s\-._N°O]*([0-9][0-9\-]*)/);
  if (cto) partes.unshift('CTO ' + cto[1]);
  else {
    var num = t.match(/[-\s_](\d{3})(?:_|\b)(?!\d)/);
    if (num && !/^(19|20)\d{2}$/.test(num[1])) partes.unshift(num[1]);
  }
  if (/SOAT|DECRETO\s*2644/.test(t)) partes = ['SOAT'];
  var contrato = partes.length ? partes.join(' · ') : 'SIN CONTRATO';
  return { erp: erp, contrato: contrato, bandeja: proponerBandeja_(t, erp) };
}

function proponerBandeja_(t, erp) {
  if (/RECIEN\s*NACIDO|SIN\s*SEGURIDAD|NO\s*ASEGURADO|POBLACION\s*POBRE/.test(t)) return 'SIN_SS';
  if (/ACCIDENTE\s*SIN|SIN\s*DOCUMENTO|SIN\s*SOAT|VEHICULO\s*NO\s*(IDENTIFICADO|ASEGURADO)|ADRES|ADMINISTRADORA\s*DE\s*LOS\s*RECURSOS/.test(t)) return 'SOAT_SIN_DOC';
  if (/SOAT|SEGUROS|ASEGURADORA|DECRETO\s*2644/.test(t)) return 'SOAT_DEFINIDO';
  if (erp === 'PARTICULARES') return 'PARTICULAR';
  return 'EPS';
}

/** Mapa TEXTO ORIGINAL → {erp, contrato, bandeja}. */
function mapaErp_() {
  var m = {};
  objetos_(H.ERP).forEach(function (o) {
    var k = norm_(o['TEXTO ORIGINAL']);
    if (!k) return;
    var prop = proponerErp_(k);
    if (may_(o['REVISADO']) !== 'SI') { m[k] = { erp: prop.erp, contrato: prop.contrato, bandeja: prop.bandeja, _fila: o._fila }; return; }   // sin revisar: propuesta vigente
    m[k] = { erp: txt_(o['ERP']) || prop.erp, contrato: txt_(o['CONTRATO']) || prop.contrato, bandeja: txt_(o['BANDEJA']) || prop.bandeja, _fila: o._fila };
  });
  return m;
}

/* ------------------------------ Áreas ------------------------------ */

function proponerArea_(area, subGrupo) {
  var t = norm_(area), sg = norm_(subGrupo);
  var grupo = t, ala = '';
  var piso = t.match(/(\d)\s*(?:°|O)?\s*PISO/);
  if (/URGENCIA/.test(t)) grupo = 'URGENCIAS';
  else if (/CUIDADOS?\s*INTENSIVOS|\bUCI\b/.test(t)) grupo = /NEONAT|PEDIATR/.test(t) ? 'UCI NEONATAL / PEDIÁTRICA' : 'UCI ADULTOS';
  else if (/NEONAT|RECIEN\s*NACIDO/.test(t)) grupo = 'NEONATOS';
  else if (piso) grupo = 'HOSPITALIZACION ' + piso[1] + ' PISO';
  else if (/QUIROFANO|CIRUG/.test(t)) grupo = 'CIRUGÍA';
  else if (/MATERN|GINECO|OBSTETR/.test(t)) grupo = 'MATERNO';
  else if (/CONSULTA\s*EXTERNA|CONSULTORIO/.test(t)) grupo = 'CONSULTA EXTERNA';
  else if (/CUIDADO\s*CRITICO|CASANARE/.test(t)) grupo = 'CUIDADO CRÍTICO Y OBSERVACIÓN';
  var a = t.match(/ALA\s*\d+(?:\s*-\s*[A-ZÁÉÍÓÚÑ\- ]+)?/);
  if (a) ala = a[0].replace(/\s+/g, ' ').trim();
  else if (/OBSERVACION/.test(t)) ala = t.replace(/.*OBSERVACION/, 'OBSERVACION').trim();
  else if (sg && sg !== t) ala = sg;
  return { grupo: grupo || 'SIN ÁREA', ala: ala };
}

function mapaAreas_() {
  var m = {};
  objetos_(H.AREAS).forEach(function (o) {
    var k = norm_(o['TEXTO ORIGINAL']);
    if (k) m[k] = { grupo: txt_(o['GRUPO']), ala: txt_(o['ALA']), _fila: o._fila };
  });
  return m;
}

/* -------------------------- Códigos RESPONSABLE -------------------------- */

function reglasCodigos_() {
  var filas = objetos_(H.CODIGOS).filter(function (o) { return may_(o['ACTIVO']) !== 'NO' && txt_(o['PATRON']); });
  if (!filas.length) filas = CODIGOS_BASE.map(function (r) { return { PATRON: r[0], CLAVE: r[1], SIGNIFICADO: r[2] }; });
  return filas.map(function (o) {
    var re; try { re = new RegExp(txt_(o['PATRON']), 'i'); } catch (e) { re = null; }
    return { re: re, clave: txt_(o['CLAVE']), lbl: txt_(o['SIGNIFICADO']) };
  }).filter(function (r) { return r.re; });
}

function leerCodigo_(reglas, valor) {
  var s = may_(valor);
  if (!s) return null;
  for (var i = 0; i < reglas.length; i++) if (reglas[i].re.test(s)) return { clave: reglas[i].clave, lbl: reglas[i].lbl };
  return { clave: 'SIN_REGLA', lbl: 'Código sin regla' };
}

/* ------------------------------ Parámetros ------------------------------ */

function parametros_() {
  var p = {};
  PARAMETROS_BASE.forEach(function (r) { p[r[0]] = r[1]; });
  objetos_(H.PARAMETROS).forEach(function (o) { var k = txt_(o['CLAVE']); if (k) p[k] = o['VALOR']; });
  ['META_AUT_HORAS','CRITICO_AUT_HORAS','CE_DIAS_CIERRE','SOAT_DOC_DIAS','PROLONGADO_DIAS'].forEach(function (k) { p[k] = +p[k] || 0; });
  return p;
}
