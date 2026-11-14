/**
 * Ingresos abiertos: convierte cada fila del Excel en un registro analizable
 * (área agrupada, ERP y contrato unificados, situación, días, código de RESPONSABLE).
 */

var SIN_CAMA = { '': 1, '0': 1, '-': 1, 'SIN CAMA': 1, 'NA': 1, 'N/A': 1, 'NO': 1 };

function tieneCama_(c) { return !SIN_CAMA[may_(c)]; }
function tieneEgreso_(eg, fechaEgr) { var e = may_(eg); return (e && e !== 'NO' && e !== '0') || !!aFecha_(fechaEgr); }

/** Deriva un ingreso. `ctx` trae los catálogos ya leídos para no releer la hoja en cada fila. */
function derivarIngreso_(o, ctx) {
  var hoy = ctx.hoy || ahora_();
  var areaTxt = norm_(o['AREA']), sg = txt_(o['SUB GRUPO']), por = may_(o['INGRESO POR']);
  var grupo, ala, inferida = false;
  if (areaTxt) {
    var cat = ctx.areas[areaTxt] || proponerArea_(areaTxt, sg);
    grupo = cat.grupo || 'SIN ÁREA'; ala = cat.ala || '';
  } else {
    inferida = true; ala = '';
    grupo = por === 'CONSULTA EXTERNA' ? 'CONSULTA EXTERNA' : por === 'URGENCIAS' ? 'URGENCIAS' : por ? por : 'SIN ÁREA';
  }
  var entTxt = norm_(o['ENTIDAD']);
  var e = ctx.erp[entTxt] || proponerErp_(entTxt);
  var fIng = aFecha_(o['FECHA ING.']), fEgr = aFecha_(o['FECHA EGR.']);
  var eg = tieneEgreso_(o['EGRESO'], o['FECHA EGR.']);
  var cama = tieneCama_(o['CAMA']) ? txt_(o['CAMA']) : '';
  var rc = leerCodigo_(ctx.codigos, o['RESPONSABLE']);
  var sit = grupo === 'CONSULTA EXTERNA' ? 'CE' : (eg && cama) ? 'CAMA_NO_LIBERADA' : eg ? 'EGRESADO_ABIERTO' : cama ? 'HOSPITALIZADO' : 'EN_ATENCION';
  return {
    i: txt_(o['INGRESO']), f: fIng ? fIng.getTime() : null, u: txt_(o['USUARIO']), est: may_(o['ESTADO']),
    por: por, tipo: may_(o['TIPO ING.']), eg: eg, fe: fEgr ? fEgr.getTime() : null,
    area: txt_(o['AREA']).slice(0, 80), sg: sg, g: grupo, ala: ala, inf: inferida, cama: cama,
    tid: txt_(o['TIPO ID']), doc: txt_(o['DOCUMENTO']), pac: txt_(o['PACIENTE']), edad: aNumero_(o['EDAD (AÑOS)']),
    ent: txt_(o['ENTIDAD']), erp: e.erp, con: e.contrato, ban: e.bandeja,
    resp: txt_(o['RESPONSABLE']), rc: rc ? rc.clave : '', rl: rc ? rc.lbl : '',
    obs: txt_(o['OBSERVACIONES']).slice(0, 300), val: aNumero_(o['VALOR']), plan: txt_(o['NOMBRE PLAN'] || o['PLAN BENEFICIO']),
    diag: txt_(o['DIAG EGRESO']), sit: sit, d: fIng ? diasEntre_(fIng, hoy) : 0
  };
}

function contextoCatalogos_() {
  return { erp: mapaErp_(), areas: mapaAreas_(), codigos: reglasCodigos_(), hoy: ahora_() };
}

function ingresosDerivados_(ctx) {
  ctx = ctx || contextoCatalogos_();
  return objetos_(H.INGRESOS).filter(function (o) { return txt_(o['INGRESO']); }).map(function (o) { return derivarIngreso_(o, ctx); });
}

/** Hallazgos por ingreso (las banderas de ANALISIS_INGRESOS más las nuevas). */
function hallazgosIngreso_(x, p, multi) {
  var h = [];
  if (x.eg) h.push('Egresado con ingreso abierto');
  if (x.eg && !x.diag) h.push('Egresado sin diagnóstico');
  if (x.sit === 'CAMA_NO_LIBERADA') h.push('Egresado con cama asignada');
  if (!x.eg && x.sit !== 'CE' && x.d >= p.PROLONGADO_DIAS) h.push('Abierto ' + p.PROLONGADO_DIAS + ' días o más sin egreso');
  if (x.sit === 'CE' && x.d > p.CE_DIAS_CIERRE) h.push('Consulta externa fuera de plazo');
  if (!x.val) h.push('Valor en cero');
  if (x.inf) h.push('Área inferida');
  if (multi && multi[x.doc] > 1) h.push('Paciente con varios ingresos abiertos');
  if (x.rc === 'SIN_REGLA') h.push('Código RESPONSABLE sin regla');
  return h;
}
