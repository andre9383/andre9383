/**
 * Casos especiales: SOAT definido, SOAT sin documentos, sin seguridad social y neonatos.
 * Gestor, compromiso, lista de chequeo, bitácora y cierre con soporte.
 */

function esNeonato_(o) {
  return /RECIEN\s*NACIDO/.test(norm_(o['ENTIDAD']) + ' ' + norm_(o['CONTRATO'])) || /^RN\b|HIJO\s*DE/.test(norm_(o['PACIENTE'])) || may_(o['TIPO ID']) === 'MS';
}

function casosLista_(s, porIng) {
  asegurarEncabezados_(H.CASOS);
  return objetos_(H.CASOS).filter(function (o) { return txt_(o['ID CASO']) && may_(o['ANULADO']) !== 'SI'; }).map(function (o) {
    var x = porIng[txt_(o['INGRESO'])];
    var docs = txt_(o['DOCUMENTOS RECIBIDOS']).split('|').map(function (t) { return t.trim(); }).filter(String);
    return {
      id: txt_(o['ID CASO']), ban: txt_(o['BANDEJA']), est: estadoCaso_(o['ESTADO'], o['RESULTADO CIERRE']), ing: txt_(o['INGRESO']),
      fi: ms_(o['FECHA INGRESO']), tid: txt_(o['TIPO ID']), doc: txt_(o['DOCUMENTO']), pac: txt_(o['PACIENTE']), edad: aNumero_(o['EDAD']),
      area: txt_(o['AREA']), cama: txt_(o['CAMA']), ent: txt_(o['ENTIDAD']), con: txt_(o['CONTRATO']), val: aNumero_(o['VALOR']),
      eg: may_(o['EGRESADO']) === 'SI', gestor: txt_(o['GESTOR']), fap: ms_(o['FECHA APERTURA']), fug: ms_(o['FECHA ULTIMA GESTION']),
      ug: txt_(o['ULTIMA GESTION']), pa: txt_(o['PROXIMA ACCION']), fc: ms_(o['FECHA COMPROMISO']), fcierre: ms_(o['FECHA CIERRE']),
      rcierre: txt_(o['RESULTADO CIERRE']), sop: txt_(o['SOPORTE CIERRE']), enx: may_(o['EN EXCEL']) !== 'NO',
      facc: ms_(o['FECHA ACCIDENTE']), placa: txt_(o['PLACA']), aseg: txt_(o['ASEGURADORA']), poliza: txt_(o['POLIZA']), adres: txt_(o['CASO ADRES']),
      tram: txt_(o['TRAMITE']), ente: txt_(o['ENTE RESPONSABLE']), docs: docs, obs: txt_(o['OBSERVACIONES']),
      erpAct: txt_(o['ERP ACTUAL']) || (x ? x.erp : proponerErp_(o['ENTIDAD']).erp), fcp: ms_(o['FECHA CAMBIO PAGADOR']), fsal: ms_(o['FECHA SALIDA EXCEL']),
      neo: esNeonato_(o),
      g: x ? x.g : (proponerArea_(o['AREA'], o['SUB GRUPO']).grupo || 'SIN ÁREA'), ala: x ? x.ala : '', sit: x ? x.sit : 'FUERA', d: x ? x.d : (o['FECHA INGRESO'] ? diasEntre_(aFecha_(o['FECHA INGRESO'])) : 0)
    };
  }).filter(function (c) { return veArea_(s, c.g, c.area); });
}

function gestionesCaso_(s, d) {
  exigir_(s, 'casos', 1);
  var id = txt_(d.id);
  return objetos_(H.GESTIONES).filter(function (o) { return txt_(o['ID CASO']) === id && may_(o['ANULADA']) !== 'SI'; }).map(function (o) {
    return { f: ms_(o['FECHA Y HORA']), u: txt_(o['USUARIO']), tipo: txt_(o['TIPO GESTION']), t: txt_(o['DESCRIPCION']), r: txt_(o['RESULTADO']),
      ea: txt_(o['ESTADO ANTERIOR']), en: txt_(o['ESTADO NUEVO']), pa: txt_(o['PROXIMA ACCION']), fc: ms_(o['FECHA COMPROMISO']) };
  }).sort(function (a, b) { return (a.f || 0) - (b.f || 0); });
}

function casoEditable_(s, id) {
  exigir_(s, 'casos', 2);
  var o = buscarFila_(H.CASOS, 'ID CASO', id);
  if (!o) throw new Error('No encontré el caso.');
  var gestor = txt_(o['GESTOR']);
  if (s.rol !== 'ADMINISTRADOR' && gestor && gestor !== s.nombre) throw new Error('Este caso lo gestiona ' + gestor + '.');
  return o;
}

function registrarGestion_(s, o, tipo, texto, resultado, estadoNuevo, pa, fc) {
  var antes = estadoCaso_(o['ESTADO'], o['RESULTADO CIERRE']);
  var g = { 'ID GESTION': uuid_(), 'FECHA Y HORA': ahora_(), 'ID CASO': o['ID CASO'], 'INGRESO': o['INGRESO'], 'BANDEJA': o['BANDEJA'],
    'TIPO GESTION': seguro_(tipo), 'DESCRIPCION': seguro_(texto), 'RESULTADO': seguro_(resultado || ''), 'ESTADO ANTERIOR': antes, 'ESTADO NUEVO': estadoNuevo || antes,
    'PROXIMA ACCION': seguro_(pa || ''), 'FECHA COMPROMISO': fc || '', 'USUARIO CORREO': s.correo, 'USUARIO': s.nombre, 'ANULADA': 'NO' };
  g['HUELLA'] = sha256_([g['ID GESTION'], g['ID CASO'], g['DESCRIPCION'], g['ESTADO NUEVO'], s.documento].join('|'));
  appendFilas_(H.GESTIONES, [g]);
}

function actualizarCaso_(s, d) {
  return conBloqueo_(function () {
    var o = casoEditable_(s, txt_(d.id)), c = { 'ULTIMA ACTUALIZACION': ahora_(), 'ACTUALIZADO POR': s.nombre }, cambios = [];
    var campos = { gestor: 'GESTOR', proximaAccion: 'PROXIMA ACCION', placa: 'PLACA', aseguradora: 'ASEGURADORA', poliza: 'POLIZA',
      casoAdres: 'CASO ADRES', tramite: 'TRAMITE', enteResponsable: 'ENTE RESPONSABLE', observaciones: 'OBSERVACIONES' };
    Object.keys(campos).forEach(function (k) { if (d[k] !== undefined && txt_(d[k]) !== txt_(o[campos[k]])) { c[campos[k]] = seguro_(d[k]); cambios.push(campos[k].toLowerCase() + ': ' + txt_(d[k])); } });
    ['fechaCompromiso', 'fechaAccidente'].forEach(function (k) {
      if (d[k] === undefined) return;
      var col = k === 'fechaCompromiso' ? 'FECHA COMPROMISO' : 'FECHA ACCIDENTE', f = aFecha_(d[k]);
      c[col] = f || ''; cambios.push(col.toLowerCase() + ': ' + (f ? fmtFecha_(f, 'dd/MM/yyyy') : 'sin fecha'));
    });
    if (c['GESTOR'] !== undefined) {
      if (s.rol !== 'ADMINISTRADOR' && c['GESTOR'] && c['GESTOR'] !== s.nombre) throw new Error('Solo el administrador asigna casos a otra persona.');
      var u = objetos_(H.USUARIOS).filter(function (x) { return txt_(x['NOMBRE']) === c['GESTOR']; })[0];
      c['GESTOR CORREO'] = u ? txt_(u['CORREO']) : '';
    }
    if (!cambios.length) return { ok: true, sinCambios: true };
    var est = estadoCaso_(o['ESTADO'], o['RESULTADO CIERRE']);
    if (est === EC.NUEVO && (c['GESTOR'] || o['GESTOR'])) c['ESTADO'] = EC.GESTION;
    actualizarFila_(H.CASOS, o._fila, c);
    registrarGestion_(s, o, 'Actualización de datos', cambios.join(' · '), '', c['ESTADO'], c['PROXIMA ACCION'], c['FECHA COMPROMISO']);
    return { ok: true };
  });
}

function gestionCaso_(s, d) {
  if (!txt_(d.descripcion)) throw new Error('Describe la gestión realizada.');
  return conBloqueo_(function () {
    var o = casoEditable_(s, txt_(d.id)), est = estadoCaso_(o['ESTADO'], o['RESULTADO CIERRE']);
    if (est === EC.CERRADO) throw new Error('El caso está cerrado.');
    var fc = aFecha_(d.fechaCompromiso);
    var c = { 'FECHA ULTIMA GESTION': ahora_(), 'ULTIMA GESTION': seguro_(txt_(d.tipo) + ': ' + txt_(d.descripcion)).slice(0, 500),
      'ULTIMA ACTUALIZACION': ahora_(), 'ACTUALIZADO POR': s.nombre };
    if (d.proximaAccion !== undefined) c['PROXIMA ACCION'] = seguro_(d.proximaAccion);
    if (fc) c['FECHA COMPROMISO'] = fc;
    if (!txt_(o['GESTOR'])) { c['GESTOR'] = s.nombre; c['GESTOR CORREO'] = s.correo; }
    if (est === EC.NUEVO) c['ESTADO'] = EC.GESTION;
    actualizarFila_(H.CASOS, o._fila, c);
    registrarGestion_(s, o, d.tipo || 'Otra', d.descripcion, d.resultado, c['ESTADO'], d.proximaAccion, fc);
    return { ok: true };
  });
}

function documentosCaso_(s, d) {
  return conBloqueo_(function () {
    var o = casoEditable_(s, txt_(d.id));
    var lista = (d.docs || []).map(seguro_).filter(String);
    var antes = txt_(o['DOCUMENTOS RECIBIDOS']).split('|').map(function (t) { return t.trim(); }).filter(String);
    var nuevos = lista.filter(function (x) { return antes.indexOf(x) < 0; }), quitados = antes.filter(function (x) { return lista.indexOf(x) < 0; });
    actualizarFila_(H.CASOS, o._fila, { 'DOCUMENTOS RECIBIDOS': lista.join(' | '), 'ULTIMA ACTUALIZACION': ahora_(), 'ACTUALIZADO POR': s.nombre });
    var t = [nuevos.length ? 'Recibido: ' + nuevos.join(', ') : '', quitados.length ? 'Retirado: ' + quitados.join(', ') : ''].filter(String).join(' · ');
    if (t) registrarGestion_(s, o, 'Revisión de documentos', t, '', '', '', '');
    return { ok: true };
  });
}

function cerrarCaso_(s, d) {
  var soporte = txt_(d.soporte);
  if (soporte.length < 4) throw new Error('Escribe el soporte del cierre: número de factura, pagador asignado o motivo.');
  return conBloqueo_(function () {
    var o = casoEditable_(s, txt_(d.id));
    actualizarFila_(H.CASOS, o._fila, { 'ESTADO': EC.CERRADO, 'FECHA CIERRE': ahora_(), 'RESULTADO CIERRE': seguro_(d.resultado || 'Cerrado con soporte'),
      'SOPORTE CIERRE': seguro_(soporte), 'ULTIMA ACTUALIZACION': ahora_(), 'ACTUALIZADO POR': s.nombre });
    registrarGestion_(s, o, 'Cierre', 'Caso cerrado · soporte: ' + soporte, d.resultado || 'Cerrado', EC.CERRADO, '', '');
    auditar_(s, 'CIERRE CASO ESPECIAL', o['ID CASO'], o['INGRESO'], soporte);
    return { ok: true };
  });
}
