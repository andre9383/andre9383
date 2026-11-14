/**
 * Seguridad: contraseñas con sal y clave secreta, sesiones con vencimiento,
 * bloqueo por intentos, roles y permisos por módulo.
 */

function pimienta_() {
  var p = prop_('PIMIENTA');
  if (!p) { p = uuid_() + uuid_(); prop_('PIMIENTA', p); }
  return p;
}

function hashClave_(clave, sal) {
  sal = sal || uuid_().replace(/-/g, '');
  var clavePim = pimienta_();
  var h = Utilities.computeHmacSha256Signature(sal + ':' + clave, clavePim);
  for (var i = 1; i < APP.HASH_ITERACIONES; i++) {
    h = Utilities.computeHmacSha256Signature(h, Utilities.newBlob(clavePim + sal).getBytes());
  }
  return 'v3$' + APP.HASH_ITERACIONES + '$' + sal + '$' + Utilities.base64Encode(h);
}

function verificarClave_(clave, guardado) {
  var g = txt_(guardado);
  if (g.indexOf('v3$') !== 0) return false;           // claves de versiones anteriores: el administrador debe restablecerlas
  var partes = g.split('$');
  var calc = hashClave_(clave, partes[2]);
  if (calc.length !== g.length) return false;
  var dif = 0;
  for (var i = 0; i < g.length; i++) dif |= g.charCodeAt(i) ^ calc.charCodeAt(i);
  return dif === 0;
}

function claveValida_(c) {
  c = txt_(c);
  return c.length >= 8 && /[A-Za-z]/.test(c) && /\d/.test(c);
}

function normRol_(r) {
  var x = may_(r).replace(/\s+/g, '_');
  return ROL_ALIAS[x] || (ROLES.indexOf(x) >= 0 ? x : 'CONSULTA');
}

function areasDe_(u) {
  return txt_(u['AREA']).split(/[;|]/).map(function (a) { return norm_(a); }).filter(String);
}

/** Matriz de permisos: base + lo que el administrador haya cambiado en la hoja PERMISOS. */
function permisos_() {
  var cache = CacheService.getScriptCache(), c = cache.get('permisos');
  if (c) return JSON.parse(c);
  var p = JSON.parse(JSON.stringify(PERMISOS_BASE));
  objetos_(H.PERMISOS).forEach(function (o) {
    var m = txt_(o['MODULO']), r = normRol_(o['ROL']);
    if (p[m] && r) p[m][r] = Math.max(0, Math.min(2, +o['NIVEL'] || 0));
  });
  p.admin.ADMINISTRADOR = 2;
  cache.put('permisos', JSON.stringify(p), 300);
  return p;
}

function permisosDeRol_(rol) {
  var p = permisos_(), out = {};
  MODULOS.forEach(function (m) { out[m] = (p[m] && p[m][rol]) || 0; });
  return out;
}

/* ---------------------------- Sesiones ---------------------------- */

function crearSesion_(u) {
  var token = uuid_() + uuid_().replace(/-/g, '');
  var rol = normRol_(u['ROL']);
  var s = {
    documento: txt_(u['DOCUMENTO']), nombre: txt_(u['NOMBRE']), correo: txt_(u['CORREO']),
    rol: rol, areas: ROLES_TODAS_AREAS.indexOf(rol) >= 0 ? ['*'] : areasDe_(u),
    inicio: Date.now(), ultimo: Date.now(),
    cambiarClave: may_(u['CAMBIAR CLAVE']) === 'SI'
  };
  CacheService.getScriptCache().put('ses_' + token, JSON.stringify(s), APP.SESION_MIN_INACTIVIDAD * 60);
  return { token: token, sesion: s };
}

/** Valida el token y renueva la inactividad. Revisa en la hoja que la cuenta siga activa. */
function sesion_(token) {
  if (!token || typeof token !== 'string' || token.length < 40) throw new Error('SESION_EXPIRADA');
  var cache = CacheService.getScriptCache(), raw = cache.get('ses_' + token);
  if (!raw) throw new Error('SESION_EXPIRADA');
  var s = JSON.parse(raw);
  if (Date.now() - s.inicio > APP.SESION_HORAS_MAX * 36e5) { cache.remove('ses_' + token); throw new Error('SESION_EXPIRADA'); }
  if (Date.now() - (s.verificado || 0) > 5 * 60e3) {           // cada 5 minutos revisa la hoja
    var u = buscarFila_(H.USUARIOS, 'DOCUMENTO', s.documento);
    if (!u || may_(u['ACTIVO']) !== 'SI' || may_(u['ESTADO REGISTRO']) !== 'APROBADO') { cache.remove('ses_' + token); throw new Error('SESION_EXPIRADA'); }
    s.rol = normRol_(u['ROL']);
    s.areas = ROLES_TODAS_AREAS.indexOf(s.rol) >= 0 ? ['*'] : areasDe_(u);
    s.verificado = Date.now();
  }
  s.ultimo = Date.now();
  s.perm = permisosDeRol_(s.rol);
  cache.put('ses_' + token, JSON.stringify(s), APP.SESION_MIN_INACTIVIDAD * 60);
  s.token = token;
  return s;
}

function exigir_(s, modulo, nivel) {
  if ((s.perm[modulo] || 0) < (nivel || 1)) throw new Error('Tu rol no tiene permiso para esta acción.');
}

function veArea_(s, grupo, areaTexto) {
  if (s.areas.indexOf('*') >= 0) return true;
  var g = norm_(grupo), a = norm_(areaTexto);
  return s.areas.some(function (x) { return x === g || (a && a.indexOf(x) >= 0) || (g && g.indexOf(x) >= 0); });
}

/* ---------------------------- Acceso público ---------------------------- */

function login_(datos) {
  var ident = norm_(datos.usuario), clave = txt_(datos.clave);
  var generico = 'Usuario o contraseña incorrectos.';
  if (!ident || !clave) throw new Error(generico);
  var d = leer_(H.USUARIOS), fila = -1, u = null;
  for (var i = 0; i < d.filas.length; i++) {
    var r = d.filas[i];
    if (norm_(r[d.idx['DOCUMENTO']]) === ident || norm_(r[d.idx['CORREO']]) === ident) { fila = d.nums[i]; u = {}; d.enc.forEach(function (c, j) { u[c] = r[j]; }); break; }
  }
  if (!u) { Utilities.sleep(400); throw new Error(generico); }
  var bloq = aFecha_(u['BLOQUEADO HASTA']);
  if (bloq && bloq > ahora_()) throw new Error('Cuenta bloqueada por intentos fallidos. Intenta después de las ' + fmtFecha_(bloq, 'HH:mm') + '.');
  if (!verificarClave_(clave, u['CLAVE HASH'])) {
    var n = (+u['INTENTOS'] || 0) + 1, cambios = { 'INTENTOS': n };
    if (n >= APP.INTENTOS_MAX) { cambios['BLOQUEADO HASTA'] = new Date(Date.now() + APP.BLOQUEO_MIN * 60e3); cambios['INTENTOS'] = 0; }
    actualizarFila_(H.USUARIOS, fila, cambios);
    Utilities.sleep(400);
    throw new Error(generico);
  }
  if (may_(u['ESTADO REGISTRO']) === 'PENDIENTE') throw new Error('Tu registro está pendiente de aprobación por el administrador.');
  if (may_(u['ESTADO REGISTRO']) === 'RECHAZADO' || may_(u['ACTIVO']) !== 'SI') throw new Error('Tu cuenta no está activa. Comunícate con el administrador.');
  actualizarFila_(H.USUARIOS, fila, { 'INTENTOS': 0, 'BLOQUEADO HASTA': '', 'ULTIMO ACCESO': ahora_() });
  var r2 = crearSesion_(u);
  auditar_(r2.sesion, 'INICIO DE SESIÓN', '', '', '');
  return { token: r2.token, cambiarClave: r2.sesion.cambiarClave };
}

function registrar_(datos) {
  var doc = txt_(datos.documento).replace(/[^\dA-Za-z]/g, ''), nombre = seguro_(datos.nombre), correo = txt_(datos.correo).toLowerCase();
  var area = seguro_(datos.area), clave = txt_(datos.clave), codigo = txt_(datos.codigoAdmin);
  if (!/^[A-Za-z0-9]{5,15}$/.test(doc)) throw new Error('Escribe un número de documento válido (5 a 15 caracteres).');
  if (nombre.length < 5) throw new Error('Escribe tu nombre completo.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) throw new Error('Escribe un correo válido.');
  if (!claveValida_(clave)) throw new Error('La contraseña debe tener al menos 8 caracteres, con letras y números.');
  if (!datos.aceptaDatos) throw new Error('Debes autorizar el tratamiento de datos personales (Ley 1581 de 2012).');
  return conBloqueo_(function () {
    var esAdminInicial = codigo && codigo === prop_('CODIGO_ADMIN_INICIAL');
    var existente = buscarFila_(H.USUARIOS, 'DOCUMENTO', doc);
    if (existente && !esAdminInicial) throw new Error('Ya existe un usuario con ese documento. Si olvidaste la contraseña, pide al administrador que la restablezca.');
    var porCorreo = buscarFila_(H.USUARIOS, 'CORREO', correo);
    if (porCorreo && txt_(porCorreo['DOCUMENTO']) !== doc) throw new Error('Ese correo ya está registrado con otro documento.');
    var fila = {
      'DOCUMENTO': doc, 'NOMBRE': nombre, 'CORREO': correo, 'AREA': area, 'FECHA REGISTRO': ahora_(),
      'CLAVE HASH': hashClave_(clave), 'CAMBIAR CLAVE': 'NO', 'INTENTOS': 0, 'BLOQUEADO HASTA': ''
    };
    if (esAdminInicial) {
      fila['ROL'] = 'ADMINISTRADOR'; fila['ACTIVO'] = 'SI'; fila['ESTADO REGISTRO'] = 'APROBADO';
      fila['APROBADO POR'] = 'CÓDIGO INICIAL'; fila['FECHA APROBACION'] = ahora_();
      if (existente) actualizarFila_(H.USUARIOS, existente._fila, fila); else appendFilas_(H.USUARIOS, [fila]);
      PropertiesService.getScriptProperties().deleteProperty('CODIGO_ADMIN_INICIAL');
      auditar_(null, 'ADMINISTRADOR CREADO CON CÓDIGO INICIAL', doc, '', nombre);
      return { mensaje: 'Cuenta de administrador lista. Ya puedes iniciar sesión.' };
    }
    fila['ROL'] = 'AUTORIZADOR'; fila['ACTIVO'] = 'NO'; fila['ESTADO REGISTRO'] = 'PENDIENTE';
    appendFilas_(H.USUARIOS, [fila]);
    auditar_(null, 'SOLICITUD DE REGISTRO', doc, '', nombre + ' · ' + area);
    try {
      var admins = objetos_(H.USUARIOS).filter(function (u) { return normRol_(u['ROL']) === 'ADMINISTRADOR' && may_(u['ACTIVO']) === 'SI' && u['CORREO']; });
      if (admins.length) MailApp.sendEmail(admins.map(function (a) { return a['CORREO']; }).join(','), APP.NOMBRE + ': nueva solicitud de registro',
        nombre + ' (' + doc + ', ' + area + ') pidió acceso. Apruébalo o recházalo en Administración › Usuarios.');
    } catch (e) { console.warn('correo registro', e); }
    return { mensaje: 'Registro enviado. El administrador debe aprobarlo antes de que puedas entrar.' };
  });
}

function cambiarClave_(s, datos) {
  if (!claveValida_(datos.nueva)) throw new Error('La nueva contraseña debe tener al menos 8 caracteres, con letras y números.');
  var u = buscarFila_(H.USUARIOS, 'DOCUMENTO', s.documento);
  if (!u || !verificarClave_(txt_(datos.actual), u['CLAVE HASH'])) throw new Error('La contraseña actual no es correcta.');
  actualizarFila_(H.USUARIOS, u._fila, { 'CLAVE HASH': hashClave_(txt_(datos.nueva)), 'CAMBIAR CLAVE': 'NO' });
  auditar_(s, 'CAMBIO DE CONTRASEÑA', '', '', '');
  var raw = CacheService.getScriptCache().get('ses_' + s.token);
  if (raw) { var x = JSON.parse(raw); x.cambiarClave = false; CacheService.getScriptCache().put('ses_' + s.token, JSON.stringify(x), APP.SESION_MIN_INACTIVIDAD * 60); }
  return { mensaje: 'Contraseña actualizada.' };
}

function cerrarSesion_(token) {
  if (token) CacheService.getScriptCache().remove('ses_' + token);
  return { ok: true };
}
