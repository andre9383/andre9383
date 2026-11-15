/**
 * Carga del Excel de ingresos abiertos (solo administrador).
 * 1) valida columnas  2) guarda las filas tal como llegan  3) actualiza catálogos
 * 4) compara con la carga anterior  5) sincroniza casos especiales (sin cerrarlos solos)
 * 6) guarda la fotografía del día en HISTORICO_ABIERTOS.
 */

function cargarIngresos_(s, datos) {
  exigir_(s, 'carga', 2);
  var filas = datos && datos.filas;
  if (!filas || !filas.length) throw new Error('El archivo no tiene filas.');
  if (filas.length > 20000) throw new Error('El archivo tiene más de 20.000 filas. Revisa que sea el reporte correcto.');
  var enc = Object.keys(filas[0]).map(norm_);
  var faltan = COLS_OBLIGATORIAS.filter(function (c) { return enc.indexOf(norm_(c)) < 0; });
  if (faltan.length) throw new Error('Faltan columnas en el Excel: ' + faltan.join(', ') + '.');

  return conBloqueo_(function () {
    var hoy = ahora_(), p = parametros_();
    var encHoja = ENC[H.INGRESOS];
    // Normaliza llaves del archivo a los encabezados oficiales
    var mapaCol = {};
    Object.keys(filas[0]).forEach(function (k) { var n = norm_(k); encHoja.forEach(function (c) { if (norm_(c) === n) mapaCol[k] = c; }); });
    var vistos = {}, nuevasFilas = [], duplicados = 0;
    filas.forEach(function (f) {
      var o = {};
      Object.keys(f).forEach(function (k) { if (mapaCol[k]) o[mapaCol[k]] = f[k]; });
      var ing = txt_(o['INGRESO']);
      if (!ing) return;
      if (vistos[ing]) { duplicados++; return; }
      vistos[ing] = 1;
      ['FECHA ING.', 'FECHA EGR.'].forEach(function (c) { var d = aFecha_(o[c]); o[c] = d || txt_(o[c]); });
      Object.keys(o).forEach(function (c) { if (typeof o[c] === 'string') o[c] = seguro_(o[c]); });
      nuevasFilas.push(o);
    });

    // Carga anterior (para comparar)
    var filasAnteriores = objetos_(H.INGRESOS).filter(function (o) { return txt_(o['INGRESO']); });

    // Guarda las filas nuevas en INGRESOS_ABIERTOS
    asegurarEncabezados_(H.INGRESOS);
    var encReal = encabezados_(H.INGRESOS);
    reemplazarDatos_(H.INGRESOS, nuevasFilas.map(function (o) { return aFila_(encReal, o); }));

    // Catálogos: agrega textos nuevos con propuesta y actualiza conteos
    actualizarCatalogos_(nuevasFilas);

    // Derivados de la carga nueva
    var ctx = contextoCatalogos_();
    var actuales = nuevasFilas.map(function (o) { return derivarIngreso_(o, ctx); });
    var mapaAct = {};
    actuales.forEach(function (x) { mapaAct[x.i] = x; });
    var anteriores = {};                                   // la carga anterior, leída con los mismos catálogos
    filasAnteriores.forEach(function (o) { var x = derivarIngreso_(o, ctx); anteriores[x.i] = x; });

    // Cambios entre cargas
    var cambios = [], nuevos = 0, salieron = 0, cambioPagador = 0, base = mapaBase_();
    actuales.forEach(function (x) {
      var a = anteriores[x.i];
      if (!a) { nuevos++; cambios.push(filaCambio_(hoy, x, 'NUEVO', '', x.erp + ' · ' + x.con)); }
      else if (a.erp !== x.erp || a.ban !== x.ban) { cambioPagador++; cambios.push(filaCambio_(hoy, x, 'CAMBIO DE PAGADOR', a.erp + ' · ' + a.con, x.erp + ' · ' + x.con)); }
    });
    Object.keys(anteriores).forEach(function (k) {
      if (!mapaAct[k]) { salieron++; var eb = (base[k] || {}).est || '';
        cambios.push(filaCambio_(hoy, anteriores[k], 'SALIÓ DE ABIERTOS', anteriores[k].erp + ' · ' + anteriores[k].con, ESTADOS_SALIDA[eb] ? eb + ' en la base' : 'Sin confirmar en la base', eb)); }
    });
    var primeraCarga = Object.keys(anteriores).length === 0;
    if (!primeraCarga) appendFilas_(H.CAMBIOS, cambios);

    // Casos especiales
    var rc = sincronizarCasos_(s, actuales, mapaAct, hoy, base);

    // Fotografía del día (una por día: si ya hubo carga hoy, se reemplaza)
    var autPend = autorizacionesPendientesPorIngreso_(actuales);
    var foto = {
      'FECHA': hoy, 'TOTAL': actuales.length, 'VALOR TOTAL': actuales.reduce(function (t, x) { return t + x.val; }, 0),
      'EGRESADOS ABIERTOS': actuales.filter(function (x) { return x.eg; }).length,
      'MAS DE 30 DIAS': actuales.filter(function (x) { return !x.eg && x.sit !== 'CE' && x.d >= p.PROLONGADO_DIAS; }).length,
      'CON AUTORIZACION PENDIENTE': actuales.filter(function (x) { return autPend[x.i]; }).length,
      'HOSPITALIZADOS': actuales.filter(function (x) { return x.sit === 'HOSPITALIZADO'; }).length,
      'CONSULTA EXTERNA FUERA DE PLAZO': actuales.filter(function (x) { return x.sit === 'CE' && x.d > p.CE_DIAS_CIERRE; }).length,
      'EGRESADOS CON CAMA': actuales.filter(function (x) { return x.sit === 'CAMA_NO_LIBERADA'; }).length,
      'CASOS ESPECIALES ABIERTOS': rc.abiertos, 'NUEVOS': primeraCarga ? '' : nuevos, 'SALIERON': primeraCarga ? '' : salieron,
      'REGLA VERSION': p.REGLA_VERSION, 'ARCHIVO': seguro_(datos.nombreArchivo || ''), 'USUARIO': s.nombre
    };
    asegurarEncabezados_(H.HIST_ABIERTOS);
    var hoyTxt = fmtFecha_(hoy, 'yyyy-MM-dd');
    var mismaFecha = objetos_(H.HIST_ABIERTOS).filter(function (o) { var f = aFecha_(o['FECHA']); return f && fmtFecha_(f, 'yyyy-MM-dd') === hoyTxt; });
    if (mismaFecha.length) actualizarFila_(H.HIST_ABIERTOS, mismaFecha[mismaFecha.length - 1]._fila, foto);
    else appendFilas_(H.HIST_ABIERTOS, [foto]);

    var resumen = { filas: actuales.length, duplicados: duplicados, nuevos: nuevos, salieron: salieron, cambioPagador: cambioPagador,
      casosCreados: rc.creados, casosSalieron: rc.salieron, casosCambio: rc.cambio, reemplazoDelDia: mismaFecha.length > 0, primeraCarga: primeraCarga };
    auditar_(s, 'CARGA INGRESOS ABIERTOS', '', '', resumen);
    return resumen;
  });
}

function filaCambio_(f, x, tipo, antes, ahora, estadoBase) {
  return { 'FECHA CARGA': f, 'INGRESO': x.i, 'TIPO CAMBIO': tipo, 'ANTES': antes, 'AHORA': ahora, 'DOCUMENTO': x.doc, 'PACIENTE': x.pac, 'AREA': x.g, 'VALOR': x.val, 'ESTADO BASE': estadoBase || '', 'ORIGEN': 'INGRESOS ABIERTOS' };
}

/* ======================= BASE_INGRESOS (base principal) ======================= */

function normEstadoBase_(e) {
  var x = norm_(e);
  if (/^BLOQU/.test(x)) return 'BLOQUEADO';          // incluye el error de digitación "BLOQUADO"
  return x;
}

/** Mapa INGRESO → { est, ant, fce, fi } leído de BASE_INGRESOS. */
function mapaBase_() {
  var d = leer_(H.BASE), m = {};
  var iI = d.idx['INGRESO'], iE = d.idx['ESTADO'], iA = d.idx['ESTADO ANTERIOR'], iF = d.idx['FECHA CAMBIO ESTADO'], iFI = d.idx['FECHA INGRESO'];
  if (iI === undefined) return m;
  d.filas.forEach(function (r) {
    var k = txt_(r[iI]); if (!k) return;
    m[k] = { est: iE !== undefined ? normEstadoBase_(r[iE]) : '', ant: iA !== undefined ? normEstadoBase_(r[iA]) : '', fce: iF !== undefined ? ms_(r[iF]) : null, fi: iFI !== undefined ? ms_(r[iFI]) : null };
  });
  return m;
}

/**
 * Carga del Excel de la base de ingresos diarios. Actualiza por número de ingreso (no borra los anteriores),
 * agrega los nuevos y registra cada cambio de estado (ej. REGISTRADO → FACTURADO) con su fecha.
 */
function cargarBase_(s, datos) {
  exigir_(s, 'carga', 2);
  var filas = datos && datos.filas;
  if (!filas || !filas.length) throw new Error('El archivo no tiene filas.');
  var enc = Object.keys(filas[0]).map(norm_);
  var faltan = COLS_BASE_OBLIGATORIAS.filter(function (c) { return enc.indexOf(norm_(c)) < 0; });
  if (faltan.length) throw new Error('Faltan columnas en el Excel de la base: ' + faltan.join(', ') + '.');
  return conBloqueo_(function () {
    var hoy = ahora_();
    asegurarEncabezados_(H.BASE);
    var d = leer_(H.BASE), ix = d.idx, n = d.enc.length;
    var mapaCol = {};
    Object.keys(filas[0]).forEach(function (k) { var nk = norm_(k); d.enc.forEach(function (c) { if (c && norm_(c) === nk) mapaCol[k] = c; }); });
    var tabla = d.filas.map(function (r) { r = r.slice(); while (r.length < n) r.push(''); return r; });
    var pos = {};
    tabla.forEach(function (r, k) { var ing = txt_(r[ix['INGRESO']]); if (ing) pos[ing] = k; });
    var nuevos = 0, cambiosEstado = 0, aSalida = 0, cambios = [], vistos = {};
    filas.forEach(function (f) {
      var o = {};
      Object.keys(f).forEach(function (k) { if (mapaCol[k]) o[mapaCol[k]] = f[k]; });
      var ing = txt_(o['INGRESO']);
      if (!ing || vistos[ing]) return;
      vistos[ing] = 1;
      var fi = aFecha_(o['FECHA INGRESO']); if (fi) o['FECHA INGRESO'] = fi;
      Object.keys(o).forEach(function (c) { if (typeof o[c] === 'string') o[c] = seguro_(o[c]); });
      var nuevoEst = normEstadoBase_(o['ESTADO']);
      var k = pos[ing];
      if (k === undefined) {
        var r = d.enc.map(function () { return ''; });
        Object.keys(o).forEach(function (c) { r[ix[c]] = o[c]; });
        r[ix['FECHA ULTIMA CARGA']] = hoy;
        tabla.push(r); pos[ing] = tabla.length - 1; nuevos++;
        return;
      }
      var fila = tabla[k], viejoEst = normEstadoBase_(fila[ix['ESTADO']]);
      Object.keys(o).forEach(function (c) { if (o[c] !== '' && o[c] !== null && o[c] !== undefined) fila[ix[c]] = o[c]; });
      fila[ix['FECHA ULTIMA CARGA']] = hoy;
      if (nuevoEst && viejoEst && nuevoEst !== viejoEst) {
        fila[ix['ESTADO ANTERIOR']] = viejoEst; fila[ix['FECHA CAMBIO ESTADO']] = hoy; cambiosEstado++;
        if (ESTADOS_SALIDA[nuevoEst] && !ESTADOS_SALIDA[viejoEst]) aSalida++;
        cambios.push({ 'FECHA CARGA': hoy, 'INGRESO': ing, 'TIPO CAMBIO': 'CAMBIO DE ESTADO EN BASE', 'ANTES': viejoEst, 'AHORA': nuevoEst,
          'DOCUMENTO': txt_(fila[ix['DOCUMENTO']]), 'PACIENTE': txt_(fila[ix['PACIENTE']]), 'AREA': may_(fila[ix['AMBITO']]) || may_(fila[ix['INGRESO POR']]), 'VALOR': '', 'ESTADO BASE': nuevoEst, 'ORIGEN': 'BASE INGRESOS' });
      }
    });
    reemplazarDatos_(H.BASE, tabla);
    appendFilas_(H.CAMBIOS, cambios);
    var resumen = { filas: Object.keys(vistos).length, total: tabla.length, nuevos: nuevos, cambiosEstado: cambiosEstado, aFacturado: aSalida };
    auditar_(s, 'CARGA BASE INGRESOS', '', '', resumen);
    return resumen;
  });
}

/** Seguimiento día a día de un ingreso: cambios entre cargas de las dos bases. */
function historialIngreso_(s, d) {
  var ing = txt_(d.ingreso);
  if (!ing) return { eventos: [], base: null };
  var ev = objetos_(H.CAMBIOS).filter(function (o) { return txt_(o['INGRESO']) === ing; }).map(function (o) {
    return { f: ms_(o['FECHA CARGA']), tipo: txt_(o['TIPO CAMBIO']), antes: txt_(o['ANTES']), ahora: txt_(o['AHORA']), eb: txt_(o['ESTADO BASE']), origen: txt_(o['ORIGEN']) || 'INGRESOS ABIERTOS' };
  }).sort(function (a, b) { return (a.f || 0) - (b.f || 0); });
  var b = buscarFila_(H.BASE, 'INGRESO', ing);
  return { eventos: ev, base: b ? { est: normEstadoBase_(b['ESTADO']), ant: normEstadoBase_(b['ESTADO ANTERIOR']), fce: ms_(b['FECHA CAMBIO ESTADO']), fi: ms_(b['FECHA INGRESO']), folio: txt_(b['FOLIO HC']), ult: ms_(b['FECHA ULTIMA CARGA']) } : null };
}

function actualizarCatalogos_(filas) {
  // ERP › contrato
  asegurarEncabezados_(H.ERP);
  var conteoE = {}, conteoA = {}, sgDe = {};
  filas.forEach(function (o) {
    var e = norm_(o['ENTIDAD']); if (e) conteoE[e] = (conteoE[e] || 0) + 1;
    var a = norm_(o['AREA']); if (a) { conteoA[a] = (conteoA[a] || 0) + 1; sgDe[a] = sgDe[a] || txt_(o['SUB GRUPO']); }
  });
  var dE = leer_(H.ERP), iT = dE.idx['TEXTO ORIGINAL'], conocidosE = {};
  var filasE = dE.filas.map(function (r) { var k = norm_(r[iT]); conocidosE[k] = 1; r = r.slice(); while (r.length < dE.enc.length) r.push(''); r[dE.idx['INGRESOS ULTIMA CARGA']] = conteoE[k] || 0;
    var prop = proponerErp_(k);
    if (may_(r[dE.idx['REVISADO']]) !== 'SI') {          // sin revisar por el administrador: aplica la propuesta mejorada
      r[dE.idx['ERP']] = prop.erp; r[dE.idx['CONTRATO']] = prop.contrato; r[dE.idx['PROPUESTA AUTOMATICA']] = prop.erp + ' | ' + prop.contrato;
      r[dE.idx['BANDEJA']] = prop.bandeja; r[dE.idx['REVISADO']] = 'NO';
    }
    return r; });
  Object.keys(conteoE).forEach(function (k) {
    if (conocidosE[k]) return;
    var prop = proponerErp_(k), r = dE.enc.map(function () { return ''; });
    r[iT] = k; r[dE.idx['ERP']] = prop.erp; r[dE.idx['CONTRATO']] = prop.contrato; r[dE.idx['PROPUESTA AUTOMATICA']] = prop.erp + ' | ' + prop.contrato;
    r[dE.idx['INGRESOS ULTIMA CARGA']] = conteoE[k]; r[dE.idx['BANDEJA']] = prop.bandeja; r[dE.idx['REVISADO']] = 'NO';
    filasE.push(r);
  });
  if (filasE.length) reemplazarDatos_(H.ERP, filasE);

  // Áreas › ala
  asegurarEncabezados_(H.AREAS);
  var dA = leer_(H.AREAS), iA = dA.idx['TEXTO ORIGINAL'], conocidosA = {};
  var filasA = dA.filas.map(function (r) { var k = norm_(r[iA]); conocidosA[k] = 1; r = r.slice(); while (r.length < dA.enc.length) r.push(''); r[dA.idx['INGRESOS ULTIMA CARGA']] = conteoA[k] || 0; return r; });
  Object.keys(conteoA).forEach(function (k) {
    if (conocidosA[k]) return;
    var prop = proponerArea_(k, sgDe[k]), r = dA.enc.map(function () { return ''; });
    r[iA] = k; r[dA.idx['GRUPO']] = prop.grupo; r[dA.idx['ALA']] = prop.ala; r[dA.idx['INGRESOS ULTIMA CARGA']] = conteoA[k]; r[dA.idx['REVISADO']] = 'NO';
    filasA.push(r);
  });
  if (filasA.length) reemplazarDatos_(H.AREAS, filasA);
}

/** Casos especiales: crea los nuevos, marca cambios de pagador y los que salieron (sin cerrarlos). */
function sincronizarCasos_(s, actuales, mapaAct, hoy, base) {
  base = base || {};
  asegurarEncabezados_(H.CASOS);
  var d = leer_(H.CASOS), ix = d.idx, filas = d.filas.map(function (r) { r = r.slice(); while (r.length < d.enc.length) r.push(''); return r; });
  var gestiones = [], porIngreso = {}, creados = 0, salieron = 0, cambio = 0;
  filas.forEach(function (r, k) { if (may_(r[ix['ANULADO']]) !== 'SI') porIngreso[txt_(r[ix['INGRESO']])] = k; });
  var set = function (r, c, v) { if (ix[c] !== undefined) r[ix[c]] = v; };
  var get = function (r, c) { return ix[c] !== undefined ? r[ix[c]] : ''; };

  actuales.forEach(function (x) {
    var esp = x.ban === 'SOAT_DEFINIDO' || x.ban === 'SOAT_SIN_DOC' || x.ban === 'SIN_SS';
    var k = porIngreso[x.i];
    if (k === undefined) {
      if (!esp) return;
      var r = d.enc.map(function () { return ''; }), id = uuid_();
      var estado = x.ban === 'SOAT_DEFINIDO' ? EC.DEFINIDO : EC.NUEVO;
      set(r, 'ID CASO', id); set(r, 'BANDEJA', x.ban); set(r, 'ESTADO', estado); set(r, 'INGRESO', x.i);
      set(r, 'FECHA INGRESO', x.f ? new Date(x.f) : ''); set(r, 'TIPO ID', x.tid); set(r, 'DOCUMENTO', x.doc); set(r, 'PACIENTE', x.pac);
      set(r, 'EDAD', x.edad); set(r, 'AREA', x.area || x.g); set(r, 'CAMA', x.cama); set(r, 'ENTIDAD', x.ent); set(r, 'CONTRATO', x.con);
      set(r, 'PLAN', x.plan); set(r, 'VALOR', x.val); set(r, 'EGRESADO', x.eg ? 'SI' : 'NO'); set(r, 'FECHA EGRESO', x.fe ? new Date(x.fe) : '');
      set(r, 'ORIGEN', 'AUTOMATICO'); set(r, 'FECHA APERTURA', hoy); set(r, 'CREADO POR', 'Sistema'); set(r, 'EN EXCEL', 'SI');
      set(r, 'FECHA ULTIMA CARGA', hoy); set(r, 'ANULADO', 'NO'); set(r, 'INGRESO POR', x.por); set(r, 'TIPO INGRESO', x.tipo); set(r, 'SUB GRUPO', x.sg);
      set(r, 'ERP ACTUAL', x.erp); set(r, 'ASEGURADORA', x.ban === 'SOAT_DEFINIDO' ? x.erp : '');
      if (estado === EC.DEFINIDO) set(r, 'FECHA DEFINICION', hoy);
      filas.push(r); porIngreso[x.i] = filas.length - 1; creados++;
      gestiones.push(gestionAuto_(id, x.i, x.ban, '', estado, 'Caso detectado en la carga de ingresos abiertos (' + x.ent + ').'));
      return;
    }
    var r2 = filas[k], est = estadoCaso_(get(r2, 'ESTADO'), get(r2, 'RESULTADO CIERRE'));
    var completar = { 'FECHA INGRESO': x.f ? new Date(x.f) : '', 'TIPO ID': x.tid, 'DOCUMENTO': x.doc, 'PACIENTE': x.pac, 'EDAD': x.edad,
      'INGRESO POR': x.por, 'TIPO INGRESO': x.tipo, 'SUB GRUPO': x.sg, 'CONTRATO': x.con };
    Object.keys(completar).forEach(function (c) { if ((get(r2, c) === '' || get(r2, c) === null) && completar[c] !== '' && completar[c] !== undefined) set(r2, c, completar[c]); });   // casos heredados con datos vacíos
    set(r2, 'EN EXCEL', 'SI'); set(r2, 'FECHA ULTIMA CARGA', hoy); set(r2, 'AREA', x.area || x.g); set(r2, 'CAMA', x.cama);
    set(r2, 'EGRESADO', x.eg ? 'SI' : 'NO'); set(r2, 'FECHA EGRESO', x.fe ? new Date(x.fe) : ''); set(r2, 'VALOR', x.val);
    var bandejaCaso = txt_(get(r2, 'BANDEJA')), erpPrevio = txt_(get(r2, 'ERP ACTUAL')) || proponerErp_(get(r2, 'ENTIDAD')).erp;
    if (est === EC.SALIO) {                                     // volvió a aparecer
      set(r2, 'ESTADO', EC.GESTION); set(r2, 'FECHA SALIDA EXCEL', '');
      gestiones.push(gestionAuto_(get(r2, 'ID CASO'), x.i, bandejaCaso, est, EC.GESTION, 'El ingreso volvió a aparecer en ingresos abiertos.'));
    }
    if (est !== EC.CERRADO && x.erp !== erpPrevio && (bandejaCaso !== x.ban)) {
      var nuevo = (bandejaCaso === 'SOAT_SIN_DOC' && x.ban === 'SOAT_DEFINIDO') ? EC.DEFINIDO : EC.PAGADOR;
      set(r2, 'ESTADO', nuevo); set(r2, 'ERP ACTUAL', x.erp); set(r2, 'ENTIDAD', x.ent); set(r2, 'CONTRATO', x.con); set(r2, 'FECHA CAMBIO PAGADOR', hoy);
      if (x.ban === 'SOAT_DEFINIDO') set(r2, 'ASEGURADORA', x.erp);
      cambio++;
      gestiones.push(gestionAuto_(get(r2, 'ID CASO'), x.i, bandejaCaso, est, nuevo, 'Cambio de pagador detectado: ' + erpPrevio + ' → ' + x.erp + ' (' + x.con + ').'));
    } else if (!txt_(get(r2, 'ERP ACTUAL'))) set(r2, 'ERP ACTUAL', x.erp);
  });

  // Los que ya no están en el Excel: quedan "SALIÓ SIN CIERRE" y alertan al gestor. Nunca se cierran solos.
  filas.forEach(function (r) {
    if (may_(get(r, 'ANULADO')) === 'SI') return;
    var ing = txt_(get(r, 'INGRESO'));
    if (mapaAct[ing]) return;
    var est = estadoCaso_(get(r, 'ESTADO'), get(r, 'RESULTADO CIERRE'));
    if (est === EC.CERRADO) { set(r, 'EN EXCEL', 'NO'); return; }
    if (est !== EC.SALIO) {
      set(r, 'ESTADO', EC.SALIO); set(r, 'FECHA SALIDA EXCEL', hoy); salieron++;
      var eb = (base[ing] || {}).est || '';
      gestiones.push(gestionAuto_(get(r, 'ID CASO'), ing, get(r, 'BANDEJA'), est, EC.SALIO, 'El ingreso ya no aparece en ingresos abiertos. ' +
        (ESTADOS_SALIDA[eb] ? 'BASE_INGRESOS lo confirma como ' + eb + '.' : 'BASE_INGRESOS no confirma la facturación (estado: ' + (eb || 'no está en la base') + ').') + ' Falta cargar soporte y cerrar.'));
    }
    set(r, 'EN EXCEL', 'NO');
  });

  if (filas.length) reemplazarDatos_(H.CASOS, filas);
  appendFilas_(H.GESTIONES, gestiones);
  var abiertos = filas.filter(function (r) { return may_(get(r, 'ANULADO')) !== 'SI' && estadoCaso_(get(r, 'ESTADO'), get(r, 'RESULTADO CIERRE')) !== EC.CERRADO; }).length;
  return { creados: creados, salieron: salieron, cambio: cambio, abiertos: abiertos };
}

function gestionAuto_(idCaso, ingreso, bandeja, antes, despues, texto) {
  var g = { 'ID GESTION': uuid_(), 'FECHA Y HORA': ahora_(), 'ID CASO': idCaso, 'INGRESO': ingreso, 'BANDEJA': bandeja,
    'TIPO GESTION': 'Automática del sistema', 'DESCRIPCION': texto, 'RESULTADO': '', 'ESTADO ANTERIOR': antes, 'ESTADO NUEVO': despues,
    'USUARIO CORREO': '', 'USUARIO': 'Sistema', 'ANULADA': 'NO' };
  g['HUELLA'] = sha256_([g['ID GESTION'], idCaso, texto, despues].join('|'));
  return g;
}

/** Traduce estados antiguos. "CERRADO EN DINÁMICA" automático = salió sin cierre. */
function estadoCaso_(estado, resultadoCierre) {
  var e = norm_(estado);
  if (!e || e === 'NUEVO') return EC.NUEVO;
  if (e.indexOf('CERRADO EN DINAMICA') === 0) return txt_(resultadoCierre) === RESULTADO_CIERRE_AUTOMATICO || !txt_(resultadoCierre) ? EC.SALIO : EC.CERRADO;
  if (e === 'CERRADO' || e === 'RESUELTO') return EC.CERRADO;
  if (e.indexOf('SALIO') === 0) return EC.SALIO;
  if (e.indexOf('DEFINIDO') === 0) return EC.DEFINIDO;
  if (e.indexOf('PAGADOR') === 0) return EC.PAGADOR;
  if (e.indexOf('EN GESTION') === 0) return EC.GESTION;
  return EC.GESTION;
}
