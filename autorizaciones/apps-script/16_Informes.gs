/**
 * Informes: reporte Excel con hojas ordenadas e informe gerencial PDF/Word.
 * Los archivos se arman en un documento temporal, se exportan y el temporal se elimina.
 */

function agrupar_(arr, fn) { var m = {}; arr.forEach(function (x) { var k = fn(x) || '(vacío)'; (m[k] = m[k] || []).push(x); }); return m; }
function suma_(arr, fn) { return arr.reduce(function (t, x) { return t + (fn(x) || 0); }, 0); }
function pct_(a, b) { return b ? Math.round(1000 * a / b) / 10 : 0; }
function mediana_(v) { if (!v.length) return 0; var s = v.slice().sort(function (a, b) { return a - b; }); return s[Math.floor(s.length / 2)]; }
function p90_(v) { if (!v.length) return 0; var s = v.slice().sort(function (a, b) { return a - b; }); return s[Math.min(s.length - 1, Math.floor(s.length * 0.9))]; }

/** Indicadores agregados (sin datos personales). Usado por informe e IA. */
function resumenAgregado_(D, p) {
  var I = D.ingresos, A = D.auts, C = D.casos;
  var aut = A.filter(function (a) { return a.est === 'AUTORIZADO' && a.fs && a.fr; }).map(horasAut_);
  var abiertas = A.filter(function (a) { return AUT_ABIERTA[a.est]; });
  var porErp = agrupar_(I, function (x) { return x.erp; });
  var porArea = agrupar_(I, function (x) { return x.g; });
  var tiempoErp = agrupar_(A.filter(function (a) { return a.est === 'AUTORIZADO' && a.fs && a.fr; }), function (a) { return a.erp; });
  return {
    corte: fmtFecha_(ahora_(), 'dd/MM/yyyy HH:mm'),
    ingresos: { total: I.length, valor: suma_(I, function (x) { return x.val; }),
      hospitalizados: I.filter(function (x) { return x.sit === 'HOSPITALIZADO'; }).length,
      egresadosSinCerrar: I.filter(function (x) { return x.eg; }).length,
      egresadosConCama: I.filter(function (x) { return x.sit === 'CAMA_NO_LIBERADA'; }).length,
      consultaExterna: I.filter(function (x) { return x.sit === 'CE'; }).length,
      ceFueraPlazo: I.filter(function (x) { return x.sit === 'CE' && x.d > p.CE_DIAS_CIERRE; }).length,
      prolongados: I.filter(function (x) { return !x.eg && x.sit !== 'CE' && x.d >= p.PROLONGADO_DIAS; }).length,
      conAutPendiente: I.filter(function (x) { return x.ap; }).length,
      areaInferida: I.filter(function (x) { return x.inf; }).length,
      antiguedad: [['0-7', 0, 7], ['8-15', 8, 15], ['16-30', 16, 30], ['31-60', 31, 60], ['61-90', 61, 90], ['91+', 91, 1e9]].map(function (b) {
        var l = I.filter(function (x) { return x.d >= b[1] && x.d <= b[2]; }); return { rango: b[0], n: l.length, valor: suma_(l, function (x) { return x.val; }) }; }) },
    porErp: Object.keys(porErp).map(function (k) { var l = porErp[k]; return { erp: k, n: l.length, valor: suma_(l, function (x) { return x.val; }), diasProm: Math.round(suma_(l, function (x) { return x.d; }) / l.length), egresados: l.filter(function (x) { return x.eg; }).length, conAut: l.filter(function (x) { return x.ap; }).length }; }).sort(function (a, b) { return b.valor - a.valor; }),
    porArea: Object.keys(porArea).map(function (k) { var l = porArea[k]; return { area: k, n: l.length, valor: suma_(l, function (x) { return x.val; }), hosp: l.filter(function (x) { return x.sit === 'HOSPITALIZADO'; }).length, cama: l.filter(function (x) { return x.sit === 'CAMA_NO_LIBERADA'; }).length, conAut: l.filter(function (x) { return x.ap; }).length }; }).sort(function (a, b) { return b.n - a.n; }),
    autorizaciones: { pendientes: abiertas.length, soloCodigo: abiertas.filter(function (a) { return a.fuente === 'CODIGO' && a.id.indexOf('D-') === 0; }).length,
      criticas: abiertas.filter(function (a) { return horasAut_(a) > p.CRITICO_AUT_HORAS; }).length,
      promedioHoras: aut.length ? Math.round(suma_(aut, function (h) { return h; }) / aut.length) : 0, medianaHoras: Math.round(mediana_(aut)), p90Horas: Math.round(p90_(aut)),
      cumplimientoMeta: pct_(aut.filter(function (h) { return h <= p.META_AUT_HORAS; }).length, aut.length),
      porErp: Object.keys(tiempoErp).map(function (k) { var h = tiempoErp[k].map(horasAut_); return { erp: k, n: h.length, promedio: Math.round(suma_(h, function (x) { return x; }) / h.length) }; }).sort(function (a, b) { return b.promedio - a.promedio; }) },
    casos: Object.keys(BANDEJA_LBL).map(function (b) { var l = C.filter(function (c) { return c.ban === b; }); var e = {}; l.forEach(function (c) { e[c.est] = (e[c.est] || 0) + 1; }); return { bandeja: BANDEJA_LBL[b], total: l.length, estados: e, sinGestor: l.filter(function (c) { return !c.gestor && c.est !== EC.CERRADO; }).length, valor: suma_(l.filter(function (c) { return c.est !== EC.CERRADO; }), function (c) { return c.val; }) }; }),
    parametros: { metaHoras: p.META_AUT_HORAS, criticoHoras: p.CRITICO_AUT_HORAS, ceDias: p.CE_DIAS_CIERRE, prolongadoDias: p.PROLONGADO_DIAS, reglas: p.REGLA_VERSION }
  };
}

/* ------------------------------ Excel ------------------------------ */

function reporteExcel_(s, d) {
  var p = parametros_(), D = datosBase_(s), R = resumenAgregado_(D, p);
  var multi = {}; D.ingresos.forEach(function (x) { multi[x.doc] = (multi[x.doc] || 0) + 1; });
  var ss = SpreadsheetApp.create('Reporte ' + APP.NOMBRE + ' ' + fmtFecha_(ahora_(), 'yyyy-MM-dd HHmm'));
  try {
    var hojas = [];
    hojas.push(['RESUMEN', ['INDICADOR', 'VALOR'], [
      ['Fecha de corte', R.corte], ['Generado por', s.nombre], ['Alcance', s.areas.indexOf('*') >= 0 ? 'Todas las áreas' : s.areas.join(', ')],
      ['Ingresos abiertos', R.ingresos.total], ['Valor abierto', R.ingresos.valor], ['Hospitalizados (cama sin egreso)', R.ingresos.hospitalizados],
      ['Egresados sin cerrar', R.ingresos.egresadosSinCerrar], ['Egresados con cama asignada', R.ingresos.egresadosConCama],
      ['Consulta externa abierta', R.ingresos.consultaExterna], ['Consulta externa fuera de plazo (' + p.CE_DIAS_CIERRE + ' días)', R.ingresos.ceFueraPlazo],
      ['Ingresos de ' + p.PROLONGADO_DIAS + ' días o más sin egreso', R.ingresos.prolongados], ['Ingresos con autorización pendiente', R.ingresos.conAutPendiente],
      ['Autorizaciones pendientes', R.autorizaciones.pendientes], ['Pendientes solo por código RESPONSABLE', R.autorizaciones.soloCodigo],
      ['Tiempo promedio de autorización (h)', R.autorizaciones.promedioHoras], ['Mediana (h)', R.autorizaciones.medianaHoras], ['Percentil 90 (h)', R.autorizaciones.p90Horas],
      ['Cumplimiento meta ' + p.META_AUT_HORAS + ' h (%)', R.autorizaciones.cumplimientoMeta], ['Versión de reglas', p.REGLA_VERSION]]]);
    hojas.push(['POR ERP', ['ERP', 'INGRESOS', 'VALOR', '% VALOR', 'DÍAS PROMEDIO', 'EGRESADOS', 'CON AUT. PENDIENTE'],
      R.porErp.map(function (r) { return [r.erp, r.n, r.valor, pct_(r.valor, R.ingresos.valor), r.diasProm, r.egresados, r.conAut]; })]);
    var porEC = agrupar_(D.ingresos, function (x) { return x.erp + '||' + x.con; });
    hojas.push(['POR CONTRATO', ['ERP', 'CONTRATO', 'INGRESOS', 'VALOR', 'DÍAS PROMEDIO', 'EGRESADOS', 'HOSPITALIZADOS'],
      Object.keys(porEC).sort().map(function (k) { var l = porEC[k], kk = k.split('||'); return [kk[0], kk[1], l.length, suma_(l, function (x) { return x.val; }), Math.round(suma_(l, function (x) { return x.d; }) / l.length), l.filter(function (x) { return x.eg; }).length, l.filter(function (x) { return x.sit === 'HOSPITALIZADO'; }).length]; })]);
    var porAA = agrupar_(D.ingresos, function (x) { return x.g + '||' + (x.ala || '(sin ala)'); });
    hojas.push(['ÁREA Y ALA', ['ÁREA', 'ALA / PABELLÓN', 'INGRESOS', 'VALOR', 'HOSPITALIZADOS', 'EGRESADOS CON CAMA', 'CON AUT. PENDIENTE'],
      Object.keys(porAA).sort().map(function (k) { var l = porAA[k], kk = k.split('||'); return [kk[0], kk[1], l.length, suma_(l, function (x) { return x.val; }), l.filter(function (x) { return x.sit === 'HOSPITALIZADO'; }).length, l.filter(function (x) { return x.sit === 'CAMA_NO_LIBERADA'; }).length, l.filter(function (x) { return x.ap; }).length]; })]);
    var porUA = agrupar_(D.ingresos, function (x) { return x.u + '||' + x.g; });
    hojas.push(['USUARIO Y ÁREA', ['USUARIO', 'ÁREA', 'INGRESOS', 'VALOR'], Object.keys(porUA).sort().map(function (k) { var l = porUA[k], kk = k.split('||'); return [kk[0], kk[1], l.length, suma_(l, function (x) { return x.val; })]; })]);
    var detalle = function (x) { return [x.i, x.f ? new Date(x.f) : '', x.tid, x.doc, x.pac, x.g, x.ala, x.cama, situacionLbl_(x.sit), x.erp, x.con, x.d, x.val, x.ap, x.resp, x.obs]; };
    var encDet = ['INGRESO', 'FECHA INGRESO', 'TIPO ID', 'DOCUMENTO', 'PACIENTE', 'ÁREA', 'ALA', 'CAMA', 'SITUACIÓN', 'ERP', 'CONTRATO', 'DÍAS', 'VALOR', 'AUT. PENDIENTES', 'RESPONSABLE', 'OBSERVACIONES'];
    hojas.push(['HOSPITALIZADOS', encDet, D.ingresos.filter(function (x) { return x.sit === 'HOSPITALIZADO'; }).map(detalle)]);
    hojas.push(['CONSULTA EXTERNA', encDet, D.ingresos.filter(function (x) { return x.sit === 'CE'; }).sort(function (a, b) { return b.d - a.d; }).map(detalle)]);
    hojas.push(['HALLAZGOS', ['INGRESO', 'DOCUMENTO', 'PACIENTE', 'ÁREA', 'ERP', 'DÍAS', 'VALOR', 'HALLAZGOS'],
      D.ingresos.map(function (x) { return [x, hallazgosIngreso_(x, p, multi)]; }).filter(function (z) { return z[1].length; }).map(function (z) { var x = z[0]; return [x.i, x.doc, x.pac, x.g, x.erp, x.d, x.val, z[1].join('; ')]; })]);
    hojas.push(['CASOS ESPECIALES', ['BANDEJA', 'ESTADO', 'INGRESO', 'DOCUMENTO', 'PACIENTE', 'ÁREA', 'PAGADOR ACTUAL', 'GESTOR', 'COMPROMISO', 'DÍAS', 'VALOR', 'DOCUMENTOS RECIBIDOS', 'EN EXCEL'],
      D.casos.map(function (c) { return [BANDEJA_LBL[c.ban] || c.ban, c.est, c.ing, c.doc, c.pac, c.g, c.erpAct, c.gestor || 'Sin asignar', c.fc ? new Date(c.fc) : '', c.d, c.val, c.docs.join(', '), c.enx ? 'SI' : 'NO']; })]);
    hojas.push(['AUT PENDIENTES', ['TRÁMITE', 'FUENTE', 'INGRESO', 'DOCUMENTO', 'PACIENTE', 'ERP', 'ÁREA', 'SERVICIO', 'ESTADO', 'HORAS', 'AUTORIZADOR'],
      D.auts.filter(function (a) { return AUT_ABIERTA[a.est]; }).sort(function (a, b) { return horasAut_(b) - horasAut_(a); }).map(function (a) { return [a.id, a.fuente === 'CODIGO' ? 'Código ' + a.cod : 'Registrada', a.ing, a.doc, a.pac, a.erp, a.g, a.serv, a.est, Math.round(horasAut_(a)), a.autz]; })]);
    hojas.push(['AUT POR ERP', ['ERP', 'AUTORIZADAS', 'HORAS PROMEDIO'], R.autorizaciones.porErp.map(function (r) { return [r.erp, r.n, r.promedio]; })]);
    hojas.push(['DETALLE INGRESOS', encDet, D.ingresos.map(detalle)]);

    hojas.forEach(function (h, i) {
      var sh = i === 0 ? ss.getSheets()[0].setName(h[0]) : ss.insertSheet(h[0]);
      var filas = [h[1]].concat(h[2]);
      sh.getRange(1, 1, filas.length, h[1].length).setValues(filas.map(function (r) { return r.map(function (c) { return typeof c === 'string' ? seguro_(c) : c; }); }));
      sh.getRange(1, 1, 1, h[1].length).setFontWeight('bold').setBackground('#0d2b45').setFontColor('#ffffff').setWrap(true);
      sh.setFrozenRows(1);
      if (filas.length > 1) sh.getRange(1, 1, filas.length, h[1].length).createFilter();
      h[1].forEach(function (c, j) { if (/VALOR/.test(c)) sh.getRange(2, j + 1, Math.max(1, filas.length - 1), 1).setNumberFormat('$#,##0'); if (/FECHA|COMPROMISO/.test(c)) sh.getRange(2, j + 1, Math.max(1, filas.length - 1), 1).setNumberFormat('dd/mm/yyyy'); });
      sh.autoResizeColumns(1, h[1].length);
    });
    SpreadsheetApp.flush();
    var b64 = exportar_('https://docs.google.com/spreadsheets/d/' + ss.getId() + '/export?format=xlsx');
    auditar_(s, 'DESCARGA REPORTE EXCEL', '', '', '');
    return { nombre: 'Reporte_autorizaciones_' + fmtFecha_(ahora_(), 'yyyyMMdd_HHmm') + '.xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', b64: b64 };
  } finally { borrarTemporal_(ss.getId()); }
}

function situacionLbl_(s) { return { HOSPITALIZADO: 'Hospitalizado', CE: 'Consulta externa', EGRESADO_ABIERTO: 'Egresado sin cerrar', CAMA_NO_LIBERADA: 'Egresado con cama', EN_ATENCION: 'En atención sin cama' }[s] || s; }

function exportar_(url) {
  var r = UrlFetchApp.fetch(url, { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true });
  if (r.getResponseCode() !== 200) throw new Error('No se pudo exportar el archivo (código ' + r.getResponseCode() + ').');
  return Utilities.base64Encode(r.getBlob().getBytes());
}

function borrarTemporal_(id) {
  try { UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/files/' + id, { method: 'delete', headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true }); }
  catch (e) { console.warn('No se pudo borrar el temporal ' + id, e); }
}

/* -------------------------- Informe gerencial -------------------------- */

function informe_(s, d) {
  var formato = d.formato === 'docx' ? 'docx' : 'pdf';
  var p = parametros_(), D = datosBase_(s), R = resumenAgregado_(D, p);
  var hist = objetos_(H.HIST_ABIERTOS).slice(-8);
  var fmt = function (n) { return Math.round(n).toLocaleString('es-CO'); };
  var dinero = function (n) { return '$' + fmt(n); };
  var doc = DocumentApp.create('Informe ' + APP.NOMBRE + ' ' + fmtFecha_(ahora_(), 'yyyy-MM-dd'));
  try {
    var b = doc.getBody();
    b.setMarginTop(56).setMarginBottom(56).setMarginLeft(60).setMarginRight(60);
    var titulo = function (t, nivel) { b.appendParagraph(t).setHeading(nivel || DocumentApp.ParagraphHeading.HEADING1); };
    var parrafo = function (t) { b.appendParagraph(t); };
    var tabla = function (enc, filas) {
      if (!filas.length) { parrafo('Sin registros para este corte.'); return; }
      var t = b.appendTable([enc].concat(filas.map(function (r) { return r.map(String); })));
      var h = t.getRow(0); for (var i = 0; i < h.getNumCells(); i++) h.getCell(i).setBackgroundColor('#0d2b45').editAsText().setForegroundColor('#ffffff').setBold(true);
    };
    var riesgo = (R.ingresos.egresadosConCama > 0 ? 2 : 0) + (pct_(R.ingresos.prolongados, R.ingresos.total) > 10 ? 2 : 0) + (R.ingresos.ceFueraPlazo > 20 ? 1 : 0) + (R.autorizaciones.criticas > 10 ? 2 : 0) + (R.casos.reduce(function (t, c) { return t + (c.estados[EC.SALIO] || 0); }, 0) > 0 ? 2 : 0);
    var nivel = riesgo >= 6 ? 'ALTO' : riesgo >= 3 ? 'MEDIO' : 'BAJO';

    b.appendParagraph('INFORME DE INGRESOS ABIERTOS, AUTORIZACIONES Y CASOS ESPECIALES').setHeading(DocumentApp.ParagraphHeading.TITLE);
    parrafo('Corte: ' + R.corte + ' · Alcance: ' + (s.areas.indexOf('*') >= 0 ? 'todas las áreas' : s.areas.join(', ')) + ' · Elaborado por: ' + s.nombre);
    parrafo('Nivel de riesgo del corte: ' + nivel + '. Reglas de cálculo: ' + p.REGLA_VERSION + '.');

    titulo('1. Resumen ejecutivo');
    var salieron = R.casos.reduce(function (t, c) { return t + (c.estados[EC.SALIO] || 0); }, 0);
    [
      'Hay ' + fmt(R.ingresos.total) + ' ingresos abiertos por ' + dinero(R.ingresos.valor) + '. De ellos, ' + fmt(R.ingresos.egresadosSinCerrar) + ' corresponden a pacientes ya egresados (' + pct_(R.ingresos.egresadosSinCerrar, R.ingresos.total) + '%), que son el primer frente de cierre y facturación.',
      fmt(R.ingresos.hospitalizados) + ' pacientes siguen hospitalizados (cama asignada sin egreso) y ' + fmt(R.ingresos.egresadosConCama) + ' egresados aún tienen cama asignada, lo que indica camas sin liberar o ingresos sin cerrar.',
      'Consulta externa: ' + fmt(R.ingresos.consultaExterna) + ' atenciones abiertas, ' + fmt(R.ingresos.ceFueraPlazo) + ' superan el plazo de cierre de ' + p.CE_DIAS_CIERRE + ' días.',
      'Autorizaciones: ' + fmt(R.autorizaciones.pendientes) + ' pendientes (' + fmt(R.autorizaciones.criticas) + ' críticas). ' + (R.autorizaciones.soloCodigo ? fmt(R.autorizaciones.soloCodigo) + ' solo existen como código en la columna RESPONSABLE y no tienen trámite registrado. ' : '') + 'Tiempo promedio de obtención: ' + R.autorizaciones.promedioHoras + ' h; cumplimiento de la meta de ' + p.META_AUT_HORAS + ' h: ' + R.autorizaciones.cumplimientoMeta + '%.',
      'Casos especiales: ' + R.casos.map(function (c) { return c.bandeja + ' ' + c.total; }).join(', ') + '. ' + (salieron ? salieron + ' casos salieron de ingresos abiertos sin cierre y requieren soporte.' : 'No hay casos que hayan salido sin cierre.')
    ].forEach(function (t) { b.appendListItem(t).setGlyphType(DocumentApp.GlyphType.BULLET); });

    titulo('2. Indicadores clave');
    var ult = hist.length > 1 ? hist[hist.length - 2] : null;
    tabla(['Indicador', 'Valor', 'Carga anterior'], [
      ['Ingresos abiertos', fmt(R.ingresos.total), ult ? fmt(aNumero_(ult['TOTAL'])) : '—'],
      ['Valor abierto', dinero(R.ingresos.valor), ult ? dinero(aNumero_(ult['VALOR TOTAL'])) : '—'],
      ['Egresados sin cerrar', fmt(R.ingresos.egresadosSinCerrar), ult ? fmt(aNumero_(ult['EGRESADOS ABIERTOS'])) : '—'],
      ['Egresados con cama', fmt(R.ingresos.egresadosConCama), ult ? fmt(aNumero_(ult['EGRESADOS CON CAMA'])) : '—'],
      ['Hospitalizados', fmt(R.ingresos.hospitalizados), ult ? fmt(aNumero_(ult['HOSPITALIZADOS'])) : '—'],
      [p.PROLONGADO_DIAS + ' días o más sin egreso', fmt(R.ingresos.prolongados), ult ? fmt(aNumero_(ult['MAS DE 30 DIAS'])) : '—'],
      ['Consulta externa fuera de plazo', fmt(R.ingresos.ceFueraPlazo), ult ? fmt(aNumero_(ult['CONSULTA EXTERNA FUERA DE PLAZO'])) : '—'],
      ['Con autorización pendiente', fmt(R.ingresos.conAutPendiente), ult ? fmt(aNumero_(ult['CON AUTORIZACION PENDIENTE'])) : '—']]);

    titulo('3. Antigüedad de los ingresos abiertos');
    tabla(['Días abierto', 'Ingresos', 'Valor', '% del valor'], R.ingresos.antiguedad.map(function (r) { return [r.rango, fmt(r.n), dinero(r.valor), pct_(r.valor, R.ingresos.valor) + '%']; }));

    titulo('4. Concentración por ERP');
    tabla(['ERP', 'Ingresos', 'Valor', '% valor', 'Días prom.', 'Egresados', 'Con aut. pend.'], R.porErp.slice(0, 15).map(function (r) { return [r.erp, fmt(r.n), dinero(r.valor), pct_(r.valor, R.ingresos.valor) + '%', r.diasProm, r.egresados, r.conAut]; }));

    titulo('5. Concentración por área');
    tabla(['Área', 'Ingresos', 'Valor', 'Hospitalizados', 'Egresados con cama', 'Con aut. pend.'], R.porArea.map(function (r) { return [r.area, fmt(r.n), dinero(r.valor), r.hosp, r.cama, r.conAut]; }));

    titulo('6. Autorizaciones');
    parrafo('Promedio ' + R.autorizaciones.promedioHoras + ' h · mediana ' + R.autorizaciones.medianaHoras + ' h · percentil 90 ' + R.autorizaciones.p90Horas + ' h · cumplimiento de meta ' + R.autorizaciones.cumplimientoMeta + '%. El tiempo se mide desde la fecha de solicitud hasta la respuesta de la EPS.');
    tabla(['ERP', 'Autorizadas', 'Horas promedio'], R.autorizaciones.porErp.slice(0, 12).map(function (r) { return [r.erp, r.n, r.promedio]; }));

    titulo('7. Casos especiales');
    tabla(['Bandeja', 'Total', 'Nuevos', 'En gestión', 'Definido', 'Pagador asignado', 'Salió sin cierre', 'Cerrados', 'Sin gestor', 'Valor abierto'],
      R.casos.map(function (c) { var e = c.estados; return [c.bandeja, c.total, e[EC.NUEVO] || 0, e[EC.GESTION] || 0, e[EC.DEFINIDO] || 0, e[EC.PAGADOR] || 0, e[EC.SALIO] || 0, e[EC.CERRADO] || 0, c.sinGestor, dinero(c.valor)]; }));
    var salLista = D.casos.filter(function (c) { return c.est === EC.SALIO; }).slice(0, 25);
    if (salLista.length) { titulo('Casos que salieron sin cierre (primeros 25)', DocumentApp.ParagraphHeading.HEADING2); tabla(['Ingreso', 'Bandeja', 'Pagador actual', 'Gestor', 'Días'], salLista.map(function (c) { return [c.ing, BANDEJA_LBL[c.ban] || c.ban, c.erpAct, c.gestor || 'Sin asignar', c.d]; })); }

    titulo('8. Evolución entre cargas');
    tabla(['Fecha', 'Total', 'Valor', 'Egresados', 'Hospitalizados', 'Nuevos', 'Salieron', 'Reglas'], hist.map(function (h) { var f = aFecha_(h['FECHA']); return [f ? fmtFecha_(f, 'dd/MM/yyyy') : '', fmt(aNumero_(h['TOTAL'])), dinero(aNumero_(h['VALOR TOTAL'])), fmt(aNumero_(h['EGRESADOS ABIERTOS'])), txt_(h['HOSPITALIZADOS']), txt_(h['NUEVOS']), txt_(h['SALIERON']), txt_(h['REGLA VERSION']) || 'anterior']; }));
    parrafo('Las cargas con reglas distintas no son comparables entre sí en los indicadores que cambiaron de definición.');

    titulo('9. Calidad de la información');
    tabla(['Aspecto', 'Resultado'], [['Ingresos con AREA vacía (área inferida de INGRESO POR)', fmt(R.ingresos.areaInferida) + ' (' + pct_(R.ingresos.areaInferida, R.ingresos.total) + '%)'],
      ['Pendientes de autorización sin trámite registrado', fmt(R.autorizaciones.soloCodigo)],
      ['Textos de ENTIDAD sin revisar en el catálogo', fmt(objetos_(H.ERP).filter(function (o) { return may_(o['REVISADO']) !== 'SI' && +o['INGRESOS ULTIMA CARGA'] > 0; }).length)]]);

    titulo('10. Plan de acción sugerido');
    var acciones = [];
    if (R.ingresos.egresadosConCama) acciones.push(['Liberar camas y cerrar ingresos de egresados con cama', 'Coordinación de hospitalización', '48 horas', 'Egresados con cama = 0']);
    if (R.ingresos.egresadosSinCerrar) acciones.push(['Cerrar y facturar egresados con ingreso abierto, empezando por mayor valor', 'Facturación', '7 días', 'Reducir 50% egresados sin cerrar']);
    if (R.ingresos.ceFueraPlazo) acciones.push(['Cerrar atenciones de consulta externa fuera de plazo', 'Consulta externa', '3 días', 'Fuera de plazo = 0']);
    if (R.autorizaciones.soloCodigo) acciones.push(['Registrar como trámite las pendientes marcadas solo con código', 'Autorizaciones', '48 horas', 'Pendientes solo por código = 0']);
    if (R.autorizaciones.criticas) acciones.push(['Escalar autorizaciones críticas con las ERP que más demoran', 'Coordinación de autorizaciones', '72 horas', 'Críticas reducidas a la mitad']);
    if (salieron) acciones.push(['Cargar soporte y cerrar casos especiales que salieron de abiertos', 'Gestores de casos', '5 días', 'Salió sin cierre = 0']);
    var sinG = R.casos.reduce(function (t, c) { return t + c.sinGestor; }, 0);
    if (sinG) acciones.push(['Asignar gestor y fecha de compromiso a los casos especiales', 'Administrador', '48 horas', 'Casos sin gestor = 0']);
    tabla(['Acción', 'Responsable', 'Plazo', 'Indicador de cumplimiento'], acciones);
    parrafo('Las acciones, responsables y plazos salen de reglas fijas: ajústelos antes de distribuir el informe.');

    if (d.conIA) {
      try { var ia = preguntarIA_(s, { pregunta: 'Redacta una lectura gerencial de 6 a 8 frases de estos resultados, con las tres prioridades más importantes.', interno: true });
        titulo('11. Lectura asistida por IA'); parrafo(ia.texto); parrafo('Texto generado por IA a partir de indicadores agregados; revíselo antes de usarlo.'); }
      catch (e) { titulo('11. Lectura asistida por IA'); parrafo('No disponible: ' + e.message); }
    }
    titulo('Anexo. Metodología');
    ['Fuente: Excel de ingresos abiertos cargado por el administrador; registros de autorizaciones y casos especiales de la plataforma.',
     'ERP y contrato: se unifican las variantes de ENTIDAD con el catálogo ERP_CONTRATOS.',
     'Área: se agrupa con CAT_AREAS; si AREA viene vacía se toma de INGRESO POR y se marca como inferida.',
     'Hospitalizado: sin egreso y con cama asignada. Consulta externa: no lleva egreso; se controla con plazo de cierre.',
     'Autorización pendiente: trámite registrado abierto o código de pendiente en RESPONSABLE sin trámite.',
     'Este informe no incluye nombres ni documentos de pacientes.'].forEach(function (t) { b.appendListItem(t).setGlyphType(DocumentApp.GlyphType.BULLET); });
    doc.saveAndClose();
    var b64 = exportar_('https://docs.google.com/document/d/' + doc.getId() + '/export?format=' + formato);
    auditar_(s, 'DESCARGA INFORME ' + formato.toUpperCase(), '', '', '');
    return { nombre: 'Informe_gerencial_' + fmtFecha_(ahora_(), 'yyyyMMdd') + '.' + formato,
      mime: formato === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', b64: b64 };
  } finally { borrarTemporal_(doc.getId()); }
}
