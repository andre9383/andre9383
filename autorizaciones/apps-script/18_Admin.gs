/**
 * Administración: usuarios, permisos por rol, parámetros y catálogos.
 */

function adminDatos_(s) {
  exigir_(s, 'admin', 2);
  var usuarios = objetos_(H.USUARIOS).map(function (u) {
    return { doc: txt_(u['DOCUMENTO']), nombre: txt_(u['NOMBRE']), correo: txt_(u['CORREO']), rol: normRol_(u['ROL']), rolOriginal: txt_(u['ROL']),
      activo: may_(u['ACTIVO']) === 'SI', area: txt_(u['AREA']), estado: may_(u['ESTADO REGISTRO']) || 'APROBADO',
      registro: ms_(u['FECHA REGISTRO']), ultimo: ms_(u['ULTIMO ACCESO']), claveVieja: txt_(u['CLAVE HASH']).indexOf('v3$') !== 0 };
  });
  var tabla = function (n) { var d = leer_(n); return { enc: d.enc, filas: d.filas.map(function (r) { return r.map(function (c) { return c instanceof Date ? fmtFecha_(c) : c; }); }) }; };
  var params = PARAMETROS_BASE.map(function (r) { return { clave: r[0], valor: parametros_()[r[0]], desc: r[2] }; });
  return { usuarios: usuarios, roles: ROLES, modulos: MODULOS, permisos: permisos_(), parametros: params,
    erp: tabla(H.ERP), areas: tabla(H.AREAS), codigos: tabla(H.CODIGOS), areasDisponibles: areasParaRegistro_() };
}

function guardarUsuario_(s, d) {
  exigir_(s, 'admin', 2);
  return conBloqueo_(function () {
    var u = buscarFila_(H.USUARIOS, 'DOCUMENTO', txt_(d.doc));
    if (!u) throw new Error('No encontré el usuario.');
    var c = {};
    if (d.rol !== undefined) { if (ROLES.indexOf(d.rol) < 0) throw new Error('Rol no válido.'); c['ROL'] = d.rol; }
    if (d.area !== undefined) c['AREA'] = seguro_(d.area);
    if (d.activo !== undefined) c['ACTIVO'] = d.activo ? 'SI' : 'NO';
    if (d.estado === 'APROBADO') { c['ESTADO REGISTRO'] = 'APROBADO'; c['ACTIVO'] = 'SI'; c['APROBADO POR'] = s.nombre; c['FECHA APROBACION'] = ahora_(); }
    if (d.estado === 'RECHAZADO') { c['ESTADO REGISTRO'] = 'RECHAZADO'; c['ACTIVO'] = 'NO'; }
    if (txt_(d.doc) === s.documento && (c['ROL'] && c['ROL'] !== 'ADMINISTRADOR' || c['ACTIVO'] === 'NO')) throw new Error('No puedes quitarte tu propio rol de administrador ni desactivarte.');
    actualizarFila_(H.USUARIOS, u._fila, c);
    auditar_(s, d.estado === 'APROBADO' ? 'USUARIO APROBADO' : 'USUARIO ACTUALIZADO', txt_(d.doc), '', c);
    if (d.estado === 'APROBADO' && txt_(u['CORREO'])) {
      try { MailApp.sendEmail(txt_(u['CORREO']), APP.NOMBRE + ': acceso aprobado', 'Hola ' + txt_(u['NOMBRE']) + ', tu acceso fue aprobado con el rol ' + (c['ROL'] || u['ROL']) + '. Ya puedes ingresar con tu documento o correo y tu contraseña.'); }
      catch (e) { console.warn(e); }
    }
    return { ok: true };
  });
}

function restablecerClave_(s, d) {
  exigir_(s, 'admin', 2);
  var u = buscarFila_(H.USUARIOS, 'DOCUMENTO', txt_(d.doc));
  if (!u) throw new Error('No encontré el usuario.');
  var temporal = 'Tmp' + Math.floor(100000 + Math.random() * 899999) + uuid_().slice(0, 3);
  actualizarFila_(H.USUARIOS, u._fila, { 'CLAVE HASH': hashClave_(temporal), 'CAMBIAR CLAVE': 'SI', 'INTENTOS': 0, 'BLOQUEADO HASTA': '' });
  auditar_(s, 'RESTABLECER CONTRASEÑA', txt_(d.doc), '', '');
  return { temporal: temporal };
}

function guardarPermiso_(s, d) {
  exigir_(s, 'admin', 2);
  if (MODULOS.indexOf(d.modulo) < 0 || ROLES.indexOf(d.rol) < 0) throw new Error('Módulo o rol no válido.');
  if (d.modulo === 'admin' && d.rol === 'ADMINISTRADOR') throw new Error('El administrador siempre conserva el acceso a Administración.');
  var nivel = Math.max(0, Math.min(2, +d.nivel || 0));
  conBloqueo_(function () {
    var dd = leer_(H.PERMISOS), fila = null;
    dd.filas.forEach(function (r, i) { if (txt_(r[dd.idx['MODULO']]) === d.modulo && normRol_(r[dd.idx['ROL']]) === d.rol) fila = dd.nums[i]; });
    if (fila) actualizarFila_(H.PERMISOS, fila, { 'NIVEL': nivel });
    else appendFilas_(H.PERMISOS, [{ 'MODULO': d.modulo, 'ROL': d.rol, 'NIVEL': nivel }]);
  });
  CacheService.getScriptCache().remove('permisos');
  auditar_(s, 'PERMISO CAMBIADO', d.modulo, '', d.rol + ' = ' + nivel);
  return { ok: true };
}

function guardarParametro_(s, d) {
  exigir_(s, 'admin', 2);
  var base = PARAMETROS_BASE.filter(function (r) { return r[0] === d.clave; })[0];
  if (!base) throw new Error('Parámetro no válido.');
  var valor = typeof base[1] === 'number' ? Math.max(1, +d.valor || 0) : seguro_(d.valor);
  conBloqueo_(function () {
    var o = buscarFila_(H.PARAMETROS, 'CLAVE', d.clave);
    var c = { 'CLAVE': d.clave, 'VALOR': valor, 'DESCRIPCION': base[2], 'ACTUALIZADO': ahora_(), 'USUARIO': s.nombre };
    if (o) actualizarFila_(H.PARAMETROS, o._fila, c); else appendFilas_(H.PARAMETROS, [c]);
    if (typeof base[1] === 'number') {                // cambia una regla: nueva versión para no mezclar series
      var v = 'v3-' + fmtFecha_(ahora_(), 'yyyyMMdd-HHmm');
      var ov = buscarFila_(H.PARAMETROS, 'CLAVE', 'REGLA_VERSION');
      var cv = { 'CLAVE': 'REGLA_VERSION', 'VALOR': v, 'DESCRIPCION': PARAMETROS_BASE[5][2], 'ACTUALIZADO': ahora_(), 'USUARIO': s.nombre };
      if (ov) actualizarFila_(H.PARAMETROS, ov._fila, cv); else appendFilas_(H.PARAMETROS, [cv]);
    }
  });
  auditar_(s, 'PARÁMETRO CAMBIADO', d.clave, '', String(valor));
  return { ok: true };
}

/** Guarda filas editadas de un catálogo (ERP, áreas o códigos). Marca REVISADO = SI. */
function guardarCatalogo_(s, d) {
  exigir_(s, 'admin', 2);
  var nombre = { erp: H.ERP, areas: H.AREAS, codigos: H.CODIGOS }[d.catalogo];
  if (!nombre) throw new Error('Catálogo no válido.');
  var cambios = d.cambios || [];
  conBloqueo_(function () {
    var dd = leer_(nombre), clave = d.catalogo === 'codigos' ? 'PATRON' : 'TEXTO ORIGINAL';
    cambios.forEach(function (c) {
      if (d.catalogo === 'codigos' && c['PATRON']) { try { new RegExp(c['PATRON']); } catch (e) { throw new Error('El patrón "' + c['PATRON'] + '" no es válido.'); } }
      var fila = null;
      dd.filas.forEach(function (r, i) { if (txt_(r[dd.idx[clave]]) === txt_(c._clave || c[clave])) fila = dd.nums[i]; });
      var obj = {};
      Object.keys(c).forEach(function (k) { if (k !== '_clave' && ENC[nombre].indexOf(k) >= 0) obj[k] = seguro_(c[k]); });
      if (d.catalogo !== 'codigos') obj['REVISADO'] = 'SI';
      if (fila) actualizarFila_(nombre, fila, obj); else appendFilas_(nombre, [obj]);
    });
  });
  auditar_(s, 'CATÁLOGO ACTUALIZADO', d.catalogo, '', cambios.length + ' filas');
  return { ok: true };
}
