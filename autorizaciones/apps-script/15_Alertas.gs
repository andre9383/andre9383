/**
 * Alertas por usuario. Se calculan en cada consulta a partir de los datos actuales
 * y se envían por correo una vez al día (activador instalado desde el menú).
 */

function horasAut_(a) { return ((a.fr || Date.now()) - (a.fs || Date.now())) / 36e5; }

function alertasDe_(s, D, p) {
  var out = [], rol = s.rol, todos = s.areas.indexOf('*') >= 0;
  var add = function (id, sev, mod, vista, t, d, n) { if (n) out.push({ id: id, sev: sev, mod: mod, vista: vista, t: t, d: d, n: n }); };
  var abiertas = D.auts.filter(function (a) { return AUT_ABIERTA[a.est]; });

  if (rol === 'AUTORIZADOR' || rol === 'ADMINISTRADOR') {
    var mias = rol === 'ADMINISTRADOR' ? abiertas : abiertas.filter(function (a) { return a.autz === s.nombre; });
    var crit = mias.filter(function (a) { return horasAut_(a) > p.CRITICO_AUT_HORAS; }).length;
    add('aut-crit', 'crit', 'aut', rol === 'ADMINISTRADOR' ? 'bandeja' : 'mias', crit + ' trámites con más de ' + p.CRITICO_AUT_HORAS + ' h sin respuesta', rol === 'ADMINISTRADOR' ? 'En toda la institución.' : 'Asignados a ti.', crit);
    var sobre = mias.filter(function (a) { var h = horasAut_(a); return h > p.META_AUT_HORAS && h <= p.CRITICO_AUT_HORAS; }).length;
    add('aut-meta', 'warn', 'aut', rol === 'ADMINISTRADOR' ? 'bandeja' : 'mias', sobre + ' trámites superan la meta de ' + p.META_AUT_HORAS + ' h', 'Haz seguimiento con la EPS antes de que pasen a crítico.', sobre);
    var sinRad = mias.filter(function (a) { return a.fuente !== 'CODIGO' && a.est === 'SOLICITADO'; }).length;
    add('aut-rad', 'info', 'aut', 'mias', sinRad + ' solicitudes sin radicar', 'Regístralas ante la EPS con su número de radicado.', rol === 'AUTORIZADOR' ? sinRad : 0);
    var cod = abiertas.filter(function (a) { return a.fuente === 'CODIGO' && a.id.indexOf('D-') === 0; }).length;
    add('aut-cod', 'warn', 'aut', 'bandeja', cod + ' pendientes solo existen como código en RESPONSABLE', 'No tienen trámite en la app y no se miden. Tómalas para registrarlas.', cod);
  }
  if (rol === 'GESTOR_CASOS' || rol === 'ADMINISTRADOR' || rol === 'COORDINADOR_GENERAL') {
    var mc = rol === 'GESTOR_CASOS' ? D.casos.filter(function (c) { return !c.gestor || c.gestor === s.nombre; }) : D.casos;
    var sal = mc.filter(function (c) { return c.est === EC.SALIO; }).length;
    add('cas-salio', 'crit', 'casos', 'salio', sal + ' casos salieron de ingresos abiertos sin cierre', 'Carga el soporte (factura o pagador) y cierra cada caso.', sal);
    var sinG = D.casos.filter(function (c) { return !c.gestor && c.est !== EC.CERRADO && c.est !== EC.SALIO; }).length;
    add('cas-sing', 'warn', 'casos', 'soat', sinG + ' casos especiales sin gestor asignado', 'Sin gestor no hay responsable ni fecha de compromiso.', sinG);
    var venc = mc.filter(function (c) { return c.fc && c.fc < Date.now() && c.est !== EC.CERRADO; }).length;
    add('cas-venc', 'warn', 'casos', 'soat', venc + ' compromisos vencidos', 'La próxima acción pasó su fecha.', venc);
    var sd = mc.filter(function (c) { return c.ban === 'SOAT_SIN_DOC' && c.enx && c.d > p.SOAT_DOC_DIAS && c.est !== EC.CERRADO; }).length;
    add('cas-sd', 'info', 'casos', 'sindoc', sd + ' accidentes con más de ' + p.SOAT_DOC_DIAS + ' días sin documentos', 'Sin FURIPS ni póliza no se puede cobrar al SOAT ni a ADRES.', sd);
  }
  if (rol === 'COORDINADOR_AREA' || rol === 'ADMINISTRADOR' || rol === 'COORDINADOR_GENERAL') {
    var ce = D.ingresos.filter(function (x) { return x.sit === 'CE' && x.d > p.CE_DIAS_CIERRE; }).length;
    add('ing-ce', 'warn', 'ing', 'ce', ce + ' atenciones de consulta externa superan ' + p.CE_DIAS_CIERRE + ' días sin cerrar', 'No llevan egreso, pero deben cerrarse para facturar.', ce);
    var cnl = D.ingresos.filter(function (x) { return x.sit === 'CAMA_NO_LIBERADA'; }).length;
    add('ing-cama', 'crit', 'ing', 'listado', cnl + ' pacientes egresados siguen con cama asignada', 'Liberar la cama o cerrar el ingreso.', cnl);
    var hp = D.ingresos.filter(function (x) { return x.sit === 'HOSPITALIZADO' && x.ap; }).length;
    add('ing-hosp', 'info', 'ing', 'hosp', hp + ' hospitalizados con autorizaciones pendientes', todos ? 'Todas las áreas.' : s.areas.join(', '), hp);
  }
  if (rol === 'ADMINISTRADOR') {
    var pend = objetos_(H.USUARIOS).filter(function (u) { return may_(u['ESTADO REGISTRO']) === 'PENDIENTE'; }).length;
    add('usr-pend', 'info', 'admin', 'usuarios', pend + ' solicitudes de registro por aprobar', 'Revisa rol y área antes de aprobar.', pend);
    var sinRev = objetos_(H.ERP).filter(function (o) { return may_(o['REVISADO']) !== 'SI' && +o['INGRESOS ULTIMA CARGA'] > 0; }).length;
    add('cat-erp', 'info', 'admin', 'catalogos', sinRev + ' textos de ENTIDAD sin revisar en el catálogo ERP', 'Confirma ERP, contrato y bandeja para que los totales sean exactos.', sinRev);
  }
  return out;
}

/** Activador diario: envía a cada usuario sus alertas por correo. */
function ejecutarAlertasProgramadas() {
  var ultima = +(prop_('ALERTAS_ULTIMO_ENVIO') || 0);   // máximo una ejecución cada 20 horas (evita envíos repetidos)
  if (Date.now() - ultima < 20 * 36e5) return 'Ya se enviaron hoy.';
  prop_('ALERTAS_ULTIMO_ENVIO', Date.now());
  var p = parametros_();
  var usuarios = objetos_(H.USUARIOS).filter(function (u) { return may_(u['ACTIVO']) === 'SI' && may_(u['ESTADO REGISTRO']) === 'APROBADO' && txt_(u['CORREO']); });
  usuarios.forEach(function (u) {
    try {
      var rol = normRol_(u['ROL']);
      var s = { documento: txt_(u['DOCUMENTO']), nombre: txt_(u['NOMBRE']), correo: txt_(u['CORREO']), rol: rol,
        areas: ROLES_TODAS_AREAS.indexOf(rol) >= 0 ? ['*'] : areasDe_(u), perm: permisosDeRol_(rol) };
      var D = datosBase_(s);
      var al = alertasDe_(s, D, p).filter(function (a) { return a.sev !== 'info'; });
      if (!al.length) return;
      var cuerpo = 'Hola ' + s.nombre.split(' ')[0] + ',\n\nTienes estas alertas en ' + APP.NOMBRE + ':\n\n' +
        al.map(function (a) { return '• ' + a.t + '. ' + a.d; }).join('\n') + '\n\nIngresa a la plataforma para gestionarlas.';
      MailApp.sendEmail(s.correo, APP.NOMBRE + ': ' + al.length + ' alertas', cuerpo);
    } catch (e) { console.error('alerta ' + u['DOCUMENTO'], e); }
  });
  var extra = txt_(p.ALERTAS_DESTINATARIOS);
  if (extra) {
    var sAdmin = { documento: 'SISTEMA', nombre: 'Resumen', correo: '', rol: 'ADMINISTRADOR', areas: ['*'], perm: permisosDeRol_('ADMINISTRADOR') };
    var al2 = alertasDe_(sAdmin, datosBase_(sAdmin), p);
    if (al2.length) MailApp.sendEmail(extra, APP.NOMBRE + ': resumen de alertas', al2.map(function (a) { return '• ' + a.t; }).join('\n'));
  }
}
