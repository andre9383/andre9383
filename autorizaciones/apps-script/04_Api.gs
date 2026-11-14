/**
 * Punto de entrada web y despachador único.
 * El navegador solo puede llamar a doGet, include, publico y api.
 * Todas las demás funciones terminan en "_" y Apps Script no las expone.
 */

function doGet() {
  return HtmlService.createTemplateFromFile('Index').evaluate()
    .setTitle(APP.NOMBRE)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}

function include(nombre) {
  if (['Estilos', 'Componentes', 'App', 'Vistas'].indexOf(nombre) < 0) return '';
  return HtmlService.createHtmlOutputFromFile(nombre).getContent();
}

function respuesta_(fn) {
  try { return { ok: true, data: fn() }; }
  catch (e) {
    var msg = (e && e.message) || String(e);
    if (e instanceof TypeError || e instanceof ReferenceError || e instanceof RangeError || e instanceof SyntaxError) {
      console.error(e && e.stack || e);                       // error de programación: queda en Ejecuciones
      msg = 'Ocurrió un error interno. Si se repite, avisa al administrador (hora ' + fmtFecha_(ahora_(), 'HH:mm') + ').';
    }
    return { ok: false, error: msg };
  }
}

/** Acciones sin sesión. */
function publico(accion, datos) {
  return respuesta_(function () {
    datos = datos || {};
    switch (accion) {
      case 'login': return login_(datos);
      case 'registro': return registrar_(datos);
      case 'areasRegistro': return areasParaRegistro_();
      default: throw new Error('Acción no válida.');
    }
  });
}

/** Acciones con sesión: [función, módulo, nivel mínimo]. */
var ACCIONES_ = {
  datos:            [function (s) { return datosApp_(s); }, 'inicio', 1],
  cerrarSesion:     [function (s) { return cerrarSesion_(s.token); }, 'inicio', 1],
  cambiarClave:     [function (s, d) { return cambiarClave_(s, d); }, 'inicio', 1],
  bitacoraAut:      [function (s, d) { return bitacoraAut_(s, d); }, 'aut', 1],
  crearAut:         [function (s, d) { return crearAut_(s, d); }, 'aut', 2],
  accionAut:        [function (s, d) { return accionAut_(s, d); }, 'aut', 2],
  buscarCups:       [function (s, d) { return buscarCups_(s, d); }, 'aut', 1],
  gestionesCaso:    [function (s, d) { return gestionesCaso_(s, d); }, 'casos', 1],
  actualizarCaso:   [function (s, d) { return actualizarCaso_(s, d); }, 'casos', 2],
  gestionCaso:      [function (s, d) { return gestionCaso_(s, d); }, 'casos', 2],
  documentosCaso:   [function (s, d) { return documentosCaso_(s, d); }, 'casos', 2],
  cerrarCaso:       [function (s, d) { return cerrarCaso_(s, d); }, 'casos', 2],
  cargarIngresos:   [function (s, d) { return cargarIngresos_(s, d); }, 'carga', 2],
  reporteExcel:     [function (s, d) { return reporteExcel_(s, d); }, 'med', 1],
  informe:          [function (s, d) { return informe_(s, d); }, 'med', 1],
  preguntarIA:      [function (s, d) { return preguntarIA_(s, d); }, 'med', 1],
  adminDatos:       [function (s) { return adminDatos_(s); }, 'admin', 2],
  guardarUsuario:   [function (s, d) { return guardarUsuario_(s, d); }, 'admin', 2],
  restablecerClave: [function (s, d) { return restablecerClave_(s, d); }, 'admin', 2],
  guardarPermiso:   [function (s, d) { return guardarPermiso_(s, d); }, 'admin', 2],
  guardarParametro: [function (s, d) { return guardarParametro_(s, d); }, 'admin', 2],
  guardarCatalogo:  [function (s, d) { return guardarCatalogo_(s, d); }, 'admin', 2]
};

function api(token, accion, datos) {
  return respuesta_(function () {
    var def = ACCIONES_[accion];
    if (!def) throw new Error('Acción no válida.');
    var s = sesion_(token);
    if (s.cambiarClave && accion !== 'cambiarClave' && accion !== 'cerrarSesion' && accion !== 'datos') throw new Error('Debes cambiar tu contraseña antes de continuar.');
    exigir_(s, def[1], def[2]);
    return def[0](s, datos || {});
  });
}

function areasParaRegistro_() {
  var g = {};
  objetos_(H.AREAS).forEach(function (o) { if (txt_(o['GRUPO'])) g[txt_(o['GRUPO'])] = 1; });
  objetos_(H.LISTAS).forEach(function (o) { var v = txt_(o[Object.keys(o).filter(function (k) { return k !== '_fila'; })[0]]); if (v) g[may_(v)] = 1; });
  g['CONSULTA EXTERNA'] = 1; g['URGENCIAS'] = 1;
  return Object.keys(g).sort();
}

/* ------------------------------------------------------------------ */

/** Datos ya filtrados por el área del usuario. Base de pantallas, alertas, informes e IA. */
function datosBase_(s) {
  var ctx = contextoCatalogos_();
  var todos = ingresosDerivados_(ctx);
  var auts = listaAutorizaciones_(todos);
  var pend = {};
  auts.forEach(function (a) { if (AUT_ABIERTA[a.est]) pend[a.ing] = (pend[a.ing] || 0) + 1; });
  var porIng = {};
  todos.forEach(function (x) { x.ap = pend[x.i] || 0; porIng[x.i] = x; });
  var ingresos = todos.filter(function (x) { return veArea_(s, x.g, x.area); });
  return {
    ingresos: ingresos,
    auts: auts.filter(function (a) { return veArea_(s, a.g, a.area); }),
    casos: (s.perm.casos || 0) >= 1 ? casosLista_(s, porIng) : []
  };
}

function datosApp_(s) {
  var p = parametros_();
  var D = datosBase_(s);
  var multi = {};
  D.ingresos.forEach(function (x) { if (x.doc) multi[x.doc] = (multi[x.doc] || 0) + 1; });
  D.ingresos.forEach(function (x) { x.h = hallazgosIngreso_(x, p, multi); delete x.plan; delete x.area; delete x.sg; });   // lo que la pantalla no usa no viaja
  var hist = objetos_(H.HIST_ABIERTOS).map(function (o) {
    return { f: ms_(o['FECHA']), total: aNumero_(o['TOTAL']), valor: aNumero_(o['VALOR TOTAL']), eg: aNumero_(o['EGRESADOS ABIERTOS']),
      m30: aNumero_(o['MAS DE 30 DIAS']), ap: aNumero_(o['CON AUTORIZACION PENDIENTE']), hosp: aNumero_(o['HOSPITALIZADOS']),
      ce: aNumero_(o['CONSULTA EXTERNA FUERA DE PLAZO']), cama: aNumero_(o['EGRESADOS CON CAMA']), casos: aNumero_(o['CASOS ESPECIALES ABIERTOS']),
      nuevos: aNumero_(o['NUEVOS']), salieron: aNumero_(o['SALIERON']), regla: txt_(o['REGLA VERSION']), archivo: txt_(o['ARCHIVO']) };
  }).filter(function (h) { return h.f; }).sort(function (a, b) { return a.f - b.f; });
  var ultimaCarga = hist.length ? hist[hist.length - 1].f : null;
  var cambios = [];
  if ((s.perm.ing || 0) >= 1 && ultimaCarga) {
    var dia = fmtFecha_(new Date(ultimaCarga), 'yyyy-MM-dd');
    cambios = objetos_(H.CAMBIOS).filter(function (o) { var f = aFecha_(o['FECHA CARGA']); return f && fmtFecha_(f, 'yyyy-MM-dd') === dia; })
      .map(function (o) { return { i: txt_(o['INGRESO']), tipo: txt_(o['TIPO CAMBIO']), antes: txt_(o['ANTES']), ahora: txt_(o['AHORA']), doc: txt_(o['DOCUMENTO']), pac: txt_(o['PACIENTE']), g: txt_(o['AREA']), val: aNumero_(o['VALOR']) }; })
      .filter(function (c) { return veArea_(s, c.g, c.g); });
  }
  var usuarios = objetos_(H.USUARIOS).filter(function (u) { return may_(u['ACTIVO']) === 'SI'; });
  return {
    yo: { nombre: s.nombre, documento: s.documento, rol: s.rol, areas: s.areas, perm: s.perm, cambiarClave: !!s.cambiarClave },
    param: p, ahora: Date.now(), ultimaCarga: ultimaCarga,
    ingresos: (s.perm.ing || 0) >= 1 || (s.perm.casos || 0) >= 1 ? D.ingresos : [],
    auts: (s.perm.aut || 0) >= 1 || (s.perm.med || 0) >= 1 ? D.auts : [],
    casos: D.casos, hist: hist, cambios: cambios,
    alertas: alertasDe_(s, D, p),
    gestores: usuarios.filter(function (u) { return normRol_(u['ROL']) === 'GESTOR_CASOS' || normRol_(u['ROL']) === 'ADMINISTRADOR'; }).map(function (u) { return txt_(u['NOMBRE']); }),
    autorizadores: usuarios.filter(function (u) { return normRol_(u['ROL']) === 'AUTORIZADOR'; }).map(function (u) { return txt_(u['NOMBRE']); }),
    docsCaso: DOCS_CASO, iaActiva: !!prop_('ANTHROPIC_API_KEY')
  };
}
