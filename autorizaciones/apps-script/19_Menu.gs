/**
 * Menú de la hoja e instalación. Estas funciones se ejecutan desde la hoja o el editor, no desde la app.
 */

function onOpen() {
  SpreadsheetApp.getUi().createMenu(APP.NOMBRE)
    .addItem('1. Inicializar o actualizar hojas', 'inicializarSistema')
    .addItem('2. Generar código de administrador inicial', 'generarCodigoAdmin')
    .addItem('3. Instalar alertas diarias por correo', 'instalarActivadores')
    .addSeparator()
    .addItem('Reabrir casos cerrados automáticamente', 'migrarCasosCerradosAutomaticamente')
    .addToUi();
}

/**
 * Apps Script deja llamar desde el navegador cualquier función sin "_" al final.
 * Estas funciones de instalación solo deben correr desde la hoja o el editor, por una persona con sesión de Google.
 * Desde la app web (anónima) Session.getActiveUser() llega vacío y se rechaza.
 */
function soloDesdeHoja_() {
  var activo = '', efectivo = '';
  try { activo = Session.getActiveUser().getEmail(); efectivo = Session.getEffectiveUser().getEmail(); } catch (e) {}
  if (!activo || activo !== efectivo) throw new Error('Esta función solo se ejecuta desde el menú de la hoja o desde el editor.');
}

/** Crea las hojas que falten y agrega columnas nuevas al final. No borra datos. */
function inicializarSistema() {
  soloDesdeHoja_();
  Object.keys(ENC).forEach(function (n) { asegurarEncabezados_(n); });
  if (!objetos_(H.PARAMETROS).length) appendFilas_(H.PARAMETROS, PARAMETROS_BASE.map(function (r) { return { 'CLAVE': r[0], 'VALOR': r[1], 'DESCRIPCION': r[2], 'ACTUALIZADO': ahora_(), 'USUARIO': 'Instalación' }; }));
  if (!objetos_(H.CODIGOS).length) appendFilas_(H.CODIGOS, CODIGOS_BASE.map(function (r) { return { 'PATRON': r[0], 'CLAVE': r[1], 'SIGNIFICADO': r[2], 'ACTIVO': r[3] }; }));
  pimienta_();
  var tieneAdmin = objetos_(H.USUARIOS).some(function (u) { return normRol_(u['ROL']) === 'ADMINISTRADOR' && txt_(u['CLAVE HASH']).indexOf('v3$') === 0 && may_(u['ACTIVO']) === 'SI'; });
  var msg = 'Hojas listas.';
  if (!tieneAdmin) { var c = generarCodigoAdmin(true); msg += ' Código de administrador inicial: ' + c + ' (úsalo en "Crear cuenta" › "Soy el administrador inicial").'; }
  console.log(msg);
  try { SpreadsheetApp.getUi().alert(msg); } catch (e) { /* ejecutado desde el editor */ }
  return msg;
}

/** Código de un solo uso para crear (o recuperar) la cuenta de administrador. Vence en 24 horas. */
function generarCodigoAdmin(silencioso) {
  soloDesdeHoja_();
  var c = ('' + Math.floor(100000 + Math.random() * 899999)) + '-' + uuid_().slice(0, 4).toUpperCase();
  prop_('CODIGO_ADMIN_INICIAL', c);
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'vencerCodigoAdmin') ScriptApp.deleteTrigger(t); });
  try { ScriptApp.newTrigger('vencerCodigoAdmin').timeBased().after(24 * 36e5).create(); } catch (e) { console.warn(e); }
  if (silencioso !== true) { console.log('Código: ' + c); try { SpreadsheetApp.getUi().alert('Código de administrador inicial (24 horas): ' + c); } catch (e) {} }
  return c;
}
function vencerCodigoAdmin() { PropertiesService.getScriptProperties().deleteProperty('CODIGO_ADMIN_INICIAL'); }

function instalarActivadores() {
  soloDesdeHoja_();
  ScriptApp.getProjectTriggers().forEach(function (t) { if (['ejecutarAlertasProgramadas', 'actualizarControlAutomatico'].indexOf(t.getHandlerFunction()) >= 0) ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('ejecutarAlertasProgramadas').timeBased().everyDays(1).atHour(7).inTimezone(APP.ZONA).create();
  var msg = 'Alerta diaria por correo instalada a las 7:00.';
  console.log(msg);
  try { SpreadsheetApp.getUi().alert(msg); } catch (e) {}
}

/**
 * Los casos que la versión anterior cerró sola como "CERRADO EN DINÁMICA" pasan a "SALIÓ SIN CIERRE"
 * para que el gestor cargue el soporte. Se registra una gestión por cada uno.
 */
function migrarCasosCerradosAutomaticamente() {
  soloDesdeHoja_();
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
  var msg = n + ' casos pasaron a "' + EC.SALIO + '".';
  console.log(msg);
  try { SpreadsheetApp.getUi().alert(msg); } catch (e) {}
  return n;
}
