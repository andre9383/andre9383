/**
 * Menú de la hoja e instalación. Estas funciones se ejecutan desde la hoja o el editor.
 *
 * Seguridad: Apps Script deja llamar desde el navegador cualquier función que no termine en "_".
 * Por eso ninguna de estas funciones DEVUELVE nada: el código de administrador solo se muestra
 * en el Registro de ejecución del editor y en la alerta de la hoja, que solo ven los editores del archivo.
 */

function onOpen() {
  SpreadsheetApp.getUi().createMenu(APP.NOMBRE)
    .addItem('1. Inicializar o actualizar hojas', 'inicializarSistema')
    .addItem('2. Generar código de administrador inicial', 'generarCodigoAdmin')
    .addItem('3. Instalar alertas diarias por correo', 'instalarActivadores')
    .addItem('Recuperar acceso de administrador', 'recuperarAccesoAdmin')
    .addSeparator()
    .addItem('Reabrir casos cerrados automáticamente', 'migrarCasosCerradosAutomaticamente')
    .addToUi();
}

function mostrar_(msg) {
  console.log(msg);
  try { SpreadsheetApp.getUi().alert(msg); } catch (e) { /* ejecutado desde el editor: queda en el Registro de ejecución */ }
}

/** Crea las hojas que falten y agrega columnas nuevas al final. No borra datos. */
function inicializarSistema() {
  Object.keys(ENC).forEach(function (n) { asegurarEncabezados_(n); });
  if (!objetos_(H.PARAMETROS).length) appendFilas_(H.PARAMETROS, PARAMETROS_BASE.map(function (r) { return { 'CLAVE': r[0], 'VALOR': r[1], 'DESCRIPCION': r[2], 'ACTUALIZADO': ahora_(), 'USUARIO': 'Instalación' }; }));
  if (!objetos_(H.CODIGOS).length) appendFilas_(H.CODIGOS, CODIGOS_BASE.map(function (r) { return { 'PATRON': r[0], 'CLAVE': r[1], 'SIGNIFICADO': r[2], 'ACTIVO': r[3] }; }));
  pimienta_();
  var tieneAdmin = objetos_(H.USUARIOS).some(function (u) { return normRol_(u['ROL']) === 'ADMINISTRADOR' && txt_(u['CLAVE HASH']).indexOf('v3$') === 0 && esSi_(u['ACTIVO']); });
  var msg = 'Hojas listas.';
  if (!tieneAdmin) msg += ' Código de administrador inicial (vale 24 horas): ' + crearCodigoAdmin_() + '. Úsalo en la aplicación: "Crear cuenta" › "Soy el administrador inicial".';
  mostrar_(msg);
}

/** Código de un solo uso para crear (o recuperar) la cuenta de administrador. Vence en 24 horas. */
function generarCodigoAdmin() {
  mostrar_('Código de administrador inicial (vale 24 horas): ' + crearCodigoAdmin_());
}

function crearCodigoAdmin_() {
  var c = ('' + Math.floor(100000 + Math.random() * 899999)) + '-' + uuid_().slice(0, 4).toUpperCase();
  prop_('CODIGO_ADMIN_INICIAL', c);
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'vencerCodigoAdmin') ScriptApp.deleteTrigger(t); });
  try { ScriptApp.newTrigger('vencerCodigoAdmin').timeBased().after(24 * 36e5).create(); } catch (e) { console.warn(e); }
  return c;
}
function vencerCodigoAdmin() { PropertiesService.getScriptProperties().deleteProperty('CODIGO_ADMIN_INICIAL'); }

function instalarActivadores() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (['ejecutarAlertasProgramadas', 'actualizarControlAutomatico'].indexOf(t.getHandlerFunction()) >= 0) ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('ejecutarAlertasProgramadas').timeBased().everyDays(1).atHour(7).inTimezone(APP.ZONA).create();
  mostrar_('Alerta diaria por correo instalada a las 7:00.');
}

/**
 * Los casos que la versión anterior cerró sola como "CERRADO EN DINÁMICA" pasan a "SALIÓ SIN CIERRE"
 * para que el gestor cargue el soporte. Se registra una gestión por cada uno.
 */
function migrarCasosCerradosAutomaticamente() {
  var d = leer_(H.CASOS), n = 0, gest = [];
  d.filas.forEach(function (r, i) {
    var e = norm_(r[d.idx['ESTADO']]), res = txt_(r[d.idx['RESULTADO CIERRE']]);
    if (e.indexOf('CERRADO EN DINAMICA') === 0 && (!res || res === RESULTADO_CIERRE_AUTOMATICO)) {
      actualizarFila_(H.CASOS, d.nums[i], { 'ESTADO': EC.SALIO, 'FECHA SALIDA EXCEL': aFecha_(r[d.idx['FECHA CIERRE']]) || ahora_() });
      gest.push(gestionAuto_(r[d.idx['ID CASO']], r[d.idx['INGRESO']], r[d.idx['BANDEJA']], 'CERRADO EN DINÁMICA', EC.SALIO, 'Reabierto: el cierre había sido automático, sin soporte. Falta cargar soporte y cerrar.'));
      n++;
    }
  });
  appendFilas_(H.GESTIONES, gest);
  mostrar_(n + ' casos pasaron a "' + EC.SALIO + '".');
}

/**
 * Asigna una contraseña temporal a un administrador. Desde la hoja pide el documento;
 * desde el editor usa el primer ADMINISTRADOR de la hoja USUARIOS.
 * La contraseña solo se muestra en la alerta de la hoja o en el Registro de ejecución.
 */
function recuperarAccesoAdmin() {
  var ui = null;
  try { ui = SpreadsheetApp.getUi(); } catch (e) { /* desde el editor no hay ventana */ }
  if (!ui) {
    mostrar_('Esta opción debe ejecutarse desde la HOJA, no desde el editor: abre la hoja de cálculo, recárgala (F5) y usa el menú ' +
      APP.NOMBRE + ' › Recuperar acceso de administrador. Ahí te pedirá tu número de documento.');
    return;
  }
  var ultima = +(prop_('RECUPERACION_ADMIN') || 0);
  if (Date.now() - ultima < 60e3) { mostrar_('Espera un minuto antes de volver a usar la recuperación.'); return; }
  var r = ui.prompt('Recuperar acceso de administrador', 'Escribe tu número de documento (sin puntos):', ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  var doc = txt_(r.getResponseText()).replace(/[^\dA-Za-z]/g, '');
  if (!/^[A-Za-z0-9]{5,15}$/.test(doc)) { mostrar_('Escribe un documento válido (5 a 15 caracteres).'); return; }
  prop_('RECUPERACION_ADMIN', Date.now());
  asegurarEncabezados_(H.USUARIOS);
  var u = objetos_(H.USUARIOS).filter(function (o) { return txt_(o['DOCUMENTO']).replace(/[^\dA-Za-z]/g, '') === doc; })[0];
  var temporal = 'Adm' + Math.floor(100000 + Math.random() * 899999) + uuid_().slice(0, 3);
  var datos = { 'ROL': 'ADMINISTRADOR', 'ACTIVO': 'SI', 'ESTADO REGISTRO': 'APROBADO', 'APROBADO POR': 'RECUPERACIÓN DESDE LA HOJA', 'FECHA APROBACION': ahora_(),
    'CLAVE HASH': hashClave_(temporal), 'CAMBIAR CLAVE': 'SI', 'INTENTOS': 0, 'BLOQUEADO HASTA': '' };
  var nombre;
  if (u) { actualizarFila_(H.USUARIOS, u._fila, datos); nombre = txt_(u['NOMBRE']); }
  else {
    var rn = ui.prompt('Usuario nuevo', 'El documento ' + doc + ' no está en USUARIOS. Escribe tu nombre completo para crearlo como administrador:', ui.ButtonSet.OK_CANCEL);
    if (rn.getSelectedButton() !== ui.Button.OK) return;
    nombre = seguro_(rn.getResponseText()) || 'Administrador';
    datos['DOCUMENTO'] = doc; datos['NOMBRE'] = nombre; datos['FECHA REGISTRO'] = ahora_();
    appendFilas_(H.USUARIOS, [datos]);
  }
  auditar_(null, 'RECUPERACIÓN DE ACCESO ADMINISTRADOR', doc, '', u ? 'usuario existente' : 'usuario creado');
  mostrar_('Listo.\nUsuario: ' + doc + ' (' + nombre + ')\nContraseña temporal: ' + temporal +
    '\n\nEntra a la aplicación con ese documento y esa contraseña; te pedirá cambiarla.\nSi la aplicación no la reconoce, publica una nueva versión: Implementar › Administrar implementaciones › Editar › Nueva versión.');
}
