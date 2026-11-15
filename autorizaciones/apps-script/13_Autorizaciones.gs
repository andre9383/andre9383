/**
 * Autorizaciones: registradas en la app + pendientes detectadas por código en RESPONSABLE.
 * El tiempo se mide desde FECHA SOLICITUD hasta FECHA RESPUESTA.
 */

function normEstadoAut_(e) {
  var x = norm_(e);
  if (/^AUTORIZAD/.test(x)) return 'AUTORIZADO';
  if (/^RADICAD/.test(x)) return 'RADICADO';
  if (/TRAMITE/.test(x)) return 'EN TRAMITE';
  if (/^NEGAD|^RECHAZ/.test(x)) return 'NEGADO';
  if (/^ANULAD/.test(x)) return 'ANULADO';
  return 'SOLICITADO';
}
var AUT_ABIERTA = { SOLICITADO: 1, RADICADO: 1, 'EN TRAMITE': 1 };

function autsRegistradas_() {
  asegurarEncabezados_(H.AUT);
  return objetos_(H.AUT).filter(function (o) { return txt_(o['ID']); }).map(function (o) {
    var est = normEstadoAut_(o['ESTADO']);
    var fs = aFecha_(o['FECHA SOLICITUD']) || aFecha_(o['FECHA CREACION']);
    var fr = aFecha_(o['FECHA RESPUESTA']) || ((est === 'AUTORIZADO' || est === 'NEGADO') ? aFecha_(o['ULTIMA ACTUALIZACION']) : null);
    var eps = txt_(o['ERP']) || proponerErp_(o['EPS']).erp;
    return {
      id: txt_(o['ID']), fila: o._fila, ing: txt_(o['INGRESO']), doc: txt_(o['DOCUMENTO']), pac: txt_(o['PACIENTE']),
      erp: eps, con: txt_(o['CONTRATO']), area: txt_(o['AREA SOLICITANTE']), serv: txt_(o['DESCRIPCION SERVICIO']) || txt_(o['TIPO SERVICIO']) || txt_(o['SERVICIO QUE REGISTRA']),
      cups: txt_(o['CUPS']), tserv: txt_(o['TIPO SERVICIO']), est: est, fs: fs ? fs.getTime() : null, frad: ms_(o['FECHA RADICACION']),
      fr: fr ? fr.getTime() : null, num: txt_(o['NUM AUTORIZACION']), rad: txt_(o['NUM RADICADO']),
      autz: txt_(o['AUTORIZADOR']) || txt_(o['ACTUALIZADO POR']) || txt_(o['CREADO POR']) || 'Sin asignar',
      fuente: txt_(o['FUENTE']) || 'APP', cod: txt_(o['CODIGO RESPONSABLE']), pri: txt_(o['PRIORIDAD']) || 'MEDIA',
      obs: txt_(o['OBSERVACIONES']), mot: txt_(o['MOTIVO NEGACION']),
      regPor: txt_(o['REGISTRADO POR']), servReg: txt_(o['SERVICIO QUE REGISTRA']), tipoAt: txt_(o['TIPO ATENCION']),
      fserv: ms_(o['FECHA SERVICIO']), cobD: ms_(o['FECHA COBERTURA DESDE']), cobH: ms_(o['FECHA COBERTURA HASTA']),
      modal: txt_(o['MODALIDAD ESTANCIA']), folio: txt_(o['FOLIO'])
    };
  });
}

/** Registradas + detectadas. `ingresos` son los derivados de la carga actual. */
function listaAutorizaciones_(ingresos, registradas) {
  registradas = registradas || autsRegistradas_();
  var porIng = {};
  ingresos.forEach(function (x) { porIng[x.i] = x; });
  var abiertasPorIng = {}, codigosRegistrados = {};
  registradas.forEach(function (a) {
    if (a.cod) codigosRegistrados[a.ing + '|' + norm_(a.cod)] = true;   // ese código ya tiene trámite (abierto o cerrado)
    var x = porIng[a.ing];
    if (x) { a.g = x.g; a.ala = x.ala; if (!a.pac) a.pac = x.pac; if (!a.doc) a.doc = x.doc; }
    else a.g = a.g || txt_(a.area) || 'SIN ÁREA';
    if (AUT_ABIERTA[a.est]) abiertasPorIng[a.ing] = true;
  });
  var detectadas = ingresos.filter(function (x) { return x.rc === 'AUT_PEND' && !abiertasPorIng[x.i] && !codigosRegistrados[x.i + '|' + norm_(x.resp)]; }).map(function (x) {
    return { id: 'D-' + x.i, ing: x.i, doc: x.doc, pac: x.pac, erp: x.erp, con: x.con, g: x.g, ala: x.ala,
      serv: '', cups: '', est: 'SOLICITADO', fs: x.f, fr: null, autz: 'Sin asignar', fuente: 'CODIGO', cod: x.resp, pri: 'MEDIA', obs: x.obs };
  });
  return registradas.concat(detectadas);
}

function autorizacionesPendientesPorIngreso_(ingresos) {
  var m = {};
  listaAutorizaciones_(ingresos).forEach(function (a) { if (AUT_ABIERTA[a.est]) m[a.ing] = (m[a.ing] || 0) + 1; });
  return m;
}

function bitacoraAut_(s, d) {
  exigir_(s, 'aut', 1);
  var id = txt_(d.id);
  return objetos_(H.SEGUIMIENTO).filter(function (o) { return txt_(o['ID AUTORIZACION']) === id; }).map(function (o) {
    return { f: ms_(o['FECHA Y HORA']), u: txt_(o['USUARIO']), t: txt_(o['OBSERVACION']) };
  });
}

function nota_(s, id, ingreso, texto) {
  appendFilas_(H.SEGUIMIENTO, [{ 'FECHA Y HORA': ahora_(), 'ID AUTORIZACION': id, 'INGRESO': ingreso, 'OBSERVACION': seguro_(texto), 'USUARIO DOCUMENTO': s.documento, 'USUARIO': s.nombre }]);
}

/**
 * Busca el paciente para registrar una autorización: primero en ingresos abiertos y luego en BASE_INGRESOS
 * (como lo hacía la versión anterior). Busca por número de ingreso, documento o nombre.
 */
function buscarIngresoReg_(s, d) {
  var q = norm_(d.q);
  if (q.length < 3) return [];
  var out = [], vistos = {}, ctx = contextoCatalogos_();
  var coincide = function (ing, doc, pac) { return ing === q || doc === q || norm_(ing).indexOf(q) === 0 || norm_(doc).indexOf(q) === 0 || q.split(' ').every(function (w) { return norm_(pac).indexOf(w) >= 0; }); };
  objetos_(H.INGRESOS).some(function (o) {
    var ing = txt_(o['INGRESO']);
    if (!ing || !coincide(ing, txt_(o['DOCUMENTO']), o['PACIENTE'])) return false;
    var x = derivarIngreso_(o, ctx);
    if (!veArea_(s, x.g, x.area)) return false;
    vistos[ing] = 1;
    out.push({ v: ing, l: ing + ' · ' + x.pac + ' · ' + x.doc + ' · abierto', fuente: 'ABIERTO', doc: x.doc, pac: x.pac, eps: x.ent, erp: x.erp, con: x.con, g: x.g, f: x.f, eg: x.eg, fe: x.fe, tipo: x.tipo, cama: x.cama });
    return out.length >= 15;
  });
  if (out.length < 15) {
    objetos_(H.BASE).some(function (o) {
      var ing = txt_(o['INGRESO']);
      if (!ing || vistos[ing] || !coincide(ing, txt_(o['DOCUMENTO']), o['PACIENTE'])) return false;
      var e = ctx.erp[norm_(o['EPS'])] || proponerErp_(o['EPS']);
      out.push({ v: ing, l: ing + ' · ' + txt_(o['PACIENTE']) + ' · ' + txt_(o['DOCUMENTO']) + ' · ' + (txt_(o['ESTADO']) || 'base'), fuente: 'BASE',
        doc: txt_(o['DOCUMENTO']), pac: txt_(o['PACIENTE']), eps: txt_(o['EPS']), erp: e.erp, con: e.contrato, g: txt_(o['AMBITO']) || txt_(o['INGRESO POR']),
        f: ms_(o['FECHA INGRESO']), eg: false, fe: null, tipo: txt_(o['AMBITO']), cama: txt_(o['CAMA']), folio: txt_(o['FOLIO HC']) });
      return out.length >= 15;
    });
  }
  return out;
}

/** Registro de una autorización con todos los campos de la versión anterior. */
function crearAut_(s, d) {
  exigir_(s, 'aut', 2);
  var ing = txt_(d.ingreso);
  if (!ing) throw new Error('Elige el ingreso del paciente.');
  if (!txt_(d.servicio)) throw new Error('Escribe la descripción del servicio a autorizar.');
  if (!txt_(d.registradoPor)) throw new Error('Elige quién registra.');
  if (!txt_(d.servicioRegistra)) throw new Error('Elige el servicio que registra.');
  var esEstancia = /ESTANCIA/i.test(d.tipoServicio || '');
  var desde = aFecha_(d.coberturaDesde), hasta = aFecha_(d.coberturaHasta);
  if (esEstancia && (!desde || !hasta)) throw new Error('Para una estancia escribe la cobertura desde y hasta.');
  if (desde && hasta && hasta < desde) throw new Error('La cobertura "hasta" no puede ser anterior a "desde".');
  return conBloqueo_(function () {
    var ctx = contextoCatalogos_(), x;
    var o = buscarFila_(H.INGRESOS, 'INGRESO', ing);
    if (o) x = derivarIngreso_(o, ctx);
    else {
      var b = buscarFila_(H.BASE, 'INGRESO', ing);
      if (!b) throw new Error('No encontré el ingreso ' + ing + ' ni en ingresos abiertos ni en BASE_INGRESOS.');
      var e = ctx.erp[norm_(b['EPS'])] || proponerErp_(b['EPS']);
      x = { i: ing, doc: txt_(b['DOCUMENTO']), pac: txt_(b['PACIENTE']), ent: txt_(b['EPS']), erp: e.erp, con: e.contrato,
        f: ms_(b['FECHA INGRESO']), eg: /FACTURADO|CERRADO/i.test(txt_(b['ESTADO'])), fe: null, tipo: txt_(b['AMBITO']) || txt_(b['INGRESO POR']), g: txt_(d.areaSolicitante) || may_(b['AMBITO']) || may_(b['INGRESO POR']) || 'SIN ÁREA', area: '' };
    }
    if (!veArea_(s, x.g, x.area)) throw new Error('Ese ingreso no pertenece a tu área.');
    var personal = objetos_(H.PERSONAL).filter(function (p) { return txt_(p['NOMBRE']) === txt_(d.registradoPor); })[0];
    var id = 'AUT-' + fmtFecha_(ahora_(), 'yyMMdd') + '-' + uuid_().slice(0, 5).toUpperCase();
    var fs = aFecha_(d.fechaSolicitud) || ahora_();
    var yaAutorizada = !!txt_(d.numAutorizacion);
    var autorizador = s.rol === 'AUTORIZADOR' ? s.nombre : (txt_(d.autorizador) || '');
    appendFilas_(H.AUT, [{
      'ID': id, 'INGRESO': x.i, 'DOCUMENTO': x.doc, 'PACIENTE': x.pac, 'EPS': x.ent, 'FECHA INGRESO': x.f ? new Date(x.f) : '',
      'EGRESO': x.eg ? 'SI' : 'NO', 'FECHA EGRESO': x.fe ? new Date(x.fe) : '', 'TIPO ATENCION': seguro_(d.tipoAtencion || x.tipo),
      'AREA SOLICITANTE': seguro_(d.areaSolicitante || x.g),
      'REGISTRADO POR DOCUMENTO': personal ? txt_(personal['DOCUMENTO']) : s.documento, 'REGISTRADO POR': seguro_(d.registradoPor),
      'SERVICIO QUE REGISTRA': seguro_(d.servicioRegistra), 'TIPO SERVICIO': seguro_(d.tipoServicio), 'DESCRIPCION SERVICIO': seguro_(d.servicio),
      'CUPS': seguro_(d.cups), 'FECHA SERVICIO': aFecha_(d.fechaServicio) || '', 'MODALIDAD ESTANCIA': esEstancia ? seguro_(d.modalidadEstancia) : '',
      'FECHA COBERTURA DESDE': desde || '', 'FECHA COBERTURA HASTA': hasta || '', 'NUM AUTORIZACION': seguro_(d.numAutorizacion), 'FOLIO': seguro_(d.folio),
      'ESTADO': yaAutorizada ? 'AUTORIZADO' : 'SOLICITADO', 'OBSERVACIONES': seguro_(d.observacion), 'FECHA CREACION': ahora_(), 'CREADO POR': s.nombre,
      'ULTIMA ACTUALIZACION': ahora_(), 'ACTUALIZADO POR': s.nombre, 'FECHA SOLICITUD': fs, 'FECHA RESPUESTA': yaAutorizada ? (aFecha_(d.fechaAutorizacion) || ahora_()) : '',
      'AUTORIZADOR': autorizador, 'FUENTE': d.codigo ? 'CODIGO' : 'APP', 'CODIGO RESPONSABLE': seguro_(d.codigo),
      'PRIORIDAD': ['ALTA','MEDIA','BAJA'].indexOf(may_(d.prioridad)) >= 0 ? may_(d.prioridad) : 'MEDIA', 'ERP': x.erp, 'CONTRATO': x.con
    }]);
    nota_(s, id, x.i, (d.codigo ? 'Trámite registrado a partir del código ' + d.codigo + ' en RESPONSABLE' : 'Solicitud registrada por ' + d.registradoPor) + (yaAutorizada ? ' · ya autorizada N° ' + d.numAutorizacion : ''));
    auditar_(s, 'CREACIÓN AUTORIZACIÓN', id, x.i, d.servicio);
    return { id: id };
  });
}

/** Corrige los datos del registro (servicio, CUPS, fechas, estancia, folio). Las autorizadas solo las corrige el administrador. */
function editarAut_(s, d) {
  exigir_(s, 'aut', 2);
  return conBloqueo_(function () {
    var o = buscarFila_(H.AUT, 'ID', txt_(d.id));
    if (!o) throw new Error('No encontré el trámite.');
    var est = normEstadoAut_(o['ESTADO']);
    if (!AUT_ABIERTA[est] && s.rol !== 'ADMINISTRADOR') throw new Error('El trámite está cerrado. Solo el administrador puede corregirlo.');
    if (!AUT_ABIERTA[est] && !txt_(d.motivo)) throw new Error('Escribe el motivo de la corrección.');
    var mapa = { servicio: 'DESCRIPCION SERVICIO', cups: 'CUPS', tipoServicio: 'TIPO SERVICIO', servicioRegistra: 'SERVICIO QUE REGISTRA', areaSolicitante: 'AREA SOLICITANTE',
      modalidadEstancia: 'MODALIDAD ESTANCIA', folio: 'FOLIO', prioridad: 'PRIORIDAD', registradoPor: 'REGISTRADO POR', tipoAtencion: 'TIPO ATENCION' };
    var fechas = { fechaServicio: 'FECHA SERVICIO', coberturaDesde: 'FECHA COBERTURA DESDE', coberturaHasta: 'FECHA COBERTURA HASTA', fechaSolicitud: 'FECHA SOLICITUD' };
    var c = { 'ULTIMA ACTUALIZACION': ahora_(), 'ACTUALIZADO POR': s.nombre }, cambios = [];
    Object.keys(mapa).forEach(function (k) { if (d[k] !== undefined && txt_(d[k]) !== txt_(o[mapa[k]])) { c[mapa[k]] = seguro_(d[k]); cambios.push(mapa[k].toLowerCase() + ': ' + txt_(d[k])); } });
    Object.keys(fechas).forEach(function (k) { if (d[k] === undefined) return; var f = aFecha_(d[k]), ant = aFecha_(o[fechas[k]]);
      if ((f ? f.getTime() : 0) !== (ant ? ant.getTime() : 0)) { c[fechas[k]] = f || ''; cambios.push(fechas[k].toLowerCase() + ': ' + (f ? fmtFecha_(f, 'dd/MM/yyyy HH:mm') : 'sin fecha')); } });
    if (!cambios.length) return { ok: true, sinCambios: true };
    actualizarFila_(H.AUT, o._fila, c);
    nota_(s, o['ID'], o['INGRESO'], 'Datos corregidos · ' + cambios.join(' · ') + (d.motivo ? ' · motivo: ' + d.motivo : ''));
    auditar_(s, 'EDICIÓN AUTORIZACIÓN', o['ID'], o['INGRESO'], cambios.join(' · '));
    return { ok: true };
  });
}

/** Acciones: radicar, tramite, autorizar, negar, nota, asignar, anular, corregir. */
function accionAut_(s, d) {
  exigir_(s, 'aut', 2);
  var id = txt_(d.id), acc = txt_(d.accion), obs = txt_(d.observacion);
  return conBloqueo_(function () {
    var o = buscarFila_(H.AUT, 'ID', id);
    if (!o) throw new Error('No encontré el trámite ' + id + '.');
    var est = normEstadoAut_(o['ESTADO']);
    var asignado = txt_(o['AUTORIZADOR']);
    var esAdmin = s.rol === 'ADMINISTRADOR';
    if (!esAdmin && asignado && asignado !== s.nombre && acc !== 'nota') throw new Error('Este trámite lo gestiona ' + asignado + '.');
    if (!AUT_ABIERTA[est] && !esAdmin && acc !== 'nota') throw new Error('El trámite está cerrado (' + est + '). Solo el administrador puede corregirlo.');
    if (!AUT_ABIERTA[est] && esAdmin && acc !== 'nota' && !obs) throw new Error('Para corregir un trámite cerrado escribe el motivo en la observación.');
    var c = { 'ULTIMA ACTUALIZACION': ahora_(), 'ACTUALIZADO POR': s.nombre };
    if (!asignado) c['AUTORIZADOR'] = s.rol === 'AUTORIZADOR' ? s.nombre : asignado;
    var texto;
    switch (acc) {
      case 'radicar':
        if (!txt_(d.numRadicado)) throw new Error('Escribe el número de radicado de la EPS.');
        c['ESTADO'] = 'RADICADO'; c['FECHA RADICACION'] = aFecha_(d.fecha) || ahora_(); c['NUM RADICADO'] = seguro_(d.numRadicado);
        texto = 'Radicada ante la EPS · N° ' + d.numRadicado; break;
      case 'tramite':
        c['ESTADO'] = 'EN TRAMITE'; texto = 'En trámite'; break;
      case 'autorizar':
        if (!txt_(d.numAutorizacion)) throw new Error('Escribe el número de autorización.');
        c['ESTADO'] = 'AUTORIZADO'; c['FECHA RESPUESTA'] = aFecha_(d.fecha) || ahora_(); c['NUM AUTORIZACION'] = seguro_(d.numAutorizacion);
        texto = 'Autorizada · N° ' + d.numAutorizacion; break;
      case 'negar':
        if (!obs) throw new Error('Escribe el motivo de la negación.');
        c['ESTADO'] = 'NEGADO'; c['FECHA RESPUESTA'] = aFecha_(d.fecha) || ahora_(); c['MOTIVO NEGACION'] = seguro_(obs);
        texto = 'Negada'; break;
      case 'asignar':
        if (!esAdmin) throw new Error('Solo el administrador reasigna trámites.');
        c['AUTORIZADOR'] = seguro_(d.autorizador); texto = 'Asignada a ' + d.autorizador; break;
      case 'anular':
        if (!obs) throw new Error('Escribe el motivo de la anulación.');
        c['ESTADO'] = 'ANULADO'; texto = 'Anulada'; break;
      case 'nota':
        if (!obs) throw new Error('Escribe la nota.');
        texto = ''; break;
      default: throw new Error('Acción no válida.');
    }
    if (!AUT_ABIERTA[est] && esAdmin && acc !== 'nota') texto = 'Corrección de trámite cerrado por administrador · ' + texto;
    actualizarFila_(H.AUT, o._fila, c);
    nota_(s, id, o['INGRESO'], [texto, obs].filter(String).join(' · '));
    auditar_(s, 'AUTORIZACIÓN: ' + acc.toUpperCase(), id, o['INGRESO'], obs);
    return { ok: true };
  });
}

function buscarCups_(s, d) {
  var q = norm_(d.q);
  if (q.length < 3) return [];
  var cache = CacheService.getScriptCache(), k = 'cups_' + sha256_(q).slice(0, 20), c = cache.get(k);
  if (c) return JSON.parse(c);
  var dd = leer_(H.CUPS), iC = dd.idx['CODIGO'], iD = dd.idx['DESCRIPCION'], out = [];
  if (iC === undefined) return [];
  var palabras = q.split(' ');
  for (var i = 0; i < dd.filas.length && out.length < 25; i++) {
    var cod = txt_(dd.filas[i][iC]), des = norm_(dd.filas[i][iD]);
    if (cod.indexOf(q) === 0 || palabras.every(function (p) { return des.indexOf(p) >= 0; })) out.push({ v: cod, l: cod + ' · ' + txt_(dd.filas[i][iD]) });
  }
  cache.put(k, JSON.stringify(out), 600);
  return out;
}
