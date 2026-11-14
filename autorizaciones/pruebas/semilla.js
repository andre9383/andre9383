// Datos de prueba con la MISMA estructura y los mismos defectos de la hoja real (valores inventados).
const { SS, Sheet } = require('./mock');
let seed = 77; const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const pick = a => a[Math.floor(rnd() * a.length)], int = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const HOY = new Date(2026, 10, 14, 10, 0);
const AREAS = ['URGENCIAS OBSERVACION ADULTO', 'HOSPITALIZACION EST. GRAL 5 PISO ALA 2 - ORTOPEDIA', 'HOSPITALIZACION ESTANCIA GRAL 4 PISO ALA 1 - QUIRURGICOS', 'HOSPITALIZACION EST. GRAL 5 PISO ALA 1 - MEDICINA INTERNA', 'HOSPITALIZACION ESTANCIA GRAL 4 PISO ALA 2 - MATERNO', 'QUIROFANOS SALAS - CIRUGÍA GENERAL', 'AREA CASANARE - UNIDAD DE CUIDADO CRITICO Y OBSERVACION', 'HOSPITALIZACION EST. GRAL 4 PISO ALA 2 - PEDIATRIA', 'HOSP. RECIEN NACIDOS NEONATAL', 'UNIDAD CUIDADOS INTENSIVOS ADULTOS'];
const ENT = ['CAPRESOCA EPS - URGENCIAS SIN - CUPS-SUBSIDIADO', 'CAPRESOCA EPS - CTO-283-2025 *PGP *', 'CAPRESOCA EPS- .2026', 'NUEVA EMPRESA PROMOTORA DE SALUD S.A. - EN INTERVENCION BAJO LA MEDIDA DE TOMA DE POSESION', 'NUEVA EMP PROMOTORA DE SALUD S.A.-EN INTERVENCION BAJO LA MEDIDA DE TOMA DE POSESION-101_EVN_891855029', 'ENTIDAD PROMOTORA DE SALUD SANITAS S.A.S', 'ENTIDAD PROMOTORA DE SALUD SANITAS S.A.S.-SUBSIDIADO', 'FIDEICOMISOS PATRIMONIOS AUTONOMOS FIDUCIARIA LA PREVISORA S.A.-FOMAG', 'PARTICULARES-CUPS', 'LA PREVISORA S.A. COMPAÑÍA DE SEGUROS  SOAT- 2025', 'EQUIDAD SEGUROS SOAT (DECRETO 2644 DEL 2022)-CUPS', 'SEGUROS GENERALES SURAMERICANA S.A.-CUPS', 'ADMINISTRADORA DE LOS RECURSOS DEL SISTEMA GENERAL DE SEGURIDAD SOCIAL EN SALUD - ADRES', 'SIN SEGURIDAD SOCIAL - SECRETARIA DE SALUD', 'RECIEN NACIDO- SIN SEGURIDAD SOCIAL-CUPS'];
const W = [9, 8, 4, 7, 6, 5, 3, 2, 2, 3, 2, 2, 2, 4, 2];
const wp = () => { let s = W.reduce((a, b) => a + b), r = rnd() * s; for (let i = 0; i < W.length; i++) if ((r -= W[i]) <= 0) return ENT[i]; return ENT[0]; };
const RESP = ['AUTO.PEND.KANB', 'AUT.PEMD.YJSU', 'PEND.AUTO.LMR', 'AUTO.PEN.DCR', 'SOAT.XFACT.KYCC', ' SOAT.XFACT.JG', 'AUTOK.4P.NOV.03', 'HX.4PISO.NOV.04', 'BRIG.DIB.SONRIS', 'PEND.LINEA.MRT'];
const NOM = ['ANA', 'LUIS', 'MARIA', 'JOSE', 'CARMEN', 'JUAN', 'ROSA', 'PEDRO'], APE = ['PEREZ', 'GOMEZ', 'DIAZ', 'TORRES', 'ROJAS', 'PARRA'];
const valorTxt = n => n.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const ENC_ING = ['INGRESO', 'FECHA ING.', 'USUARIO', 'ESTADO', 'INGRESO POR', 'TIPO ING.', 'EGRESO', 'FECHA EGR.', 'USUARIO EGRESO', 'AREA', 'SUB GRUPO', 'CAMA', 'TIPO ID', 'DOCUMENTO', 'PACIENTE', 'EDAD (AÑOS)', 'ENTIDAD', 'RESPONSABLE', 'OBSERVACIONES', 'VALOR', 'PLAN BENEFICIO', 'NOMBRE PLAN', 'DIAG EGRESO'];
function filaIngreso(i) {
  const ent = wp(), rn = /RECIEN/.test(ent);
  const por = rn ? 'NACIDO_HOSPITAL' : pick(['URGENCIAS', 'URGENCIAS', 'CONSULTA EXTERNA', 'CONSULTA EXTERNA', 'REMITIDO', '']);
  const conArea = por !== 'CONSULTA EXTERNA' && (rn || rnd() < 0.55);
  const area = rn ? AREAS[8] : conArea ? pick(AREAS) : '';
  const d = por === 'CONSULTA EXTERNA' ? int(0, 25) : int(0, 110);
  const eg = por !== 'CONSULTA EXTERNA' && rnd() < 0.4;
  const cama = area && (!eg || rnd() < 0.6) && !/QUIROFANO/.test(area) ? 'C' + int(100, 599) : pick(['', '', '0', '-']);
  const fIng = new Date(HOY - d * 864e5 - int(0, 20) * 36e5);
  return ['' + (2050000 + i * 17), fIng, pick(['ADM.URG.01', 'ADM.CE.02', 'FACT.4P']), rnd() < 0.26 ? 'BLOQUEADO' : 'REGISTRADO', por, area ? 'HOSPITALARIO' : 'AMBULATORIO',
    eg ? int(500000, 850000) : '', eg ? new Date(+fIng + int(1, Math.max(1, d)) * 864e5) : '', eg ? 'FACT.4P' : '', area, area ? area.replace(/^HOSPITALIZACION (EST\. GRAL|ESTANCIA GRAL)/, 'HOSPITALIZACIÓN') : '', cama,
    rn ? 'MS' : 'CC', rn ? 'MS' + int(100000, 999999) : '' + int(1000000, 1199999999), (rn ? 'RN HIJO DE ' : '') + pick(NOM) + ' ' + pick(APE) + ' ' + pick(APE), rn ? 0 : int(1, 90),
    ent, rnd() < 0.3 ? pick(RESP) : '', rnd() < 0.2 ? 'PENDIENTE CARTA' : '', rnd() < 0.03 ? '' : valorTxt(int(40, 45000) * 1000 + int(0, 99) / 100), '', '', eg && rnd() < 0.85 ? 'S062' : ''];
}
function libroInicial(n) {
  const L = new SS('SEGUIMIENTO AUTORIZACIONES COMPLETO OK');
  const add = (nombre, filas) => { const s = new Sheet(nombre, filas.map(r => r.slice())); L.sheets.push(s); return s; };
  add('Hoja 1', []);
  const ing = []; for (let i = 0; i < n; i++) ing.push(filaIngreso(i));
  add('INGRESOS_ABIERTOS', [ENC_ING, ...ing]);
  add('USUARIOS', [['DOCUMENTO', 'NOMBRE', 'CORREO', 'ROL', 'ACTIVO', 'AREA', 'FECHA REGISTRO', 'ESTADO REGISTRO', 'APROBADO POR', 'FECHA APROBACION', 'CLAVE HASH', 'CAMBIAR CLAVE', 'ULTIMO ACCESO', 'PERMISOS EXTRA'],
    ['1000001', 'LAURA MENDEZ', 'admin@x.com', 'ADMINISTRADOR', 'SI', '', HOY, 'APROBADO', '', '', 'hash-viejo-sha', 'NO', '', ''],
    ['1000002', 'JORGE SILVA', 'jorge@x.com', 'OPERADOR', 'SI', '', HOY, 'APROBADO', '', '', 'hash-viejo', 'NO', '', ''],
    ['1000003', 'KAREN CAMARGO', 'karen@x.com', 'GESTOR_CASOS', 'SI', '', HOY, 'APROBADO', '', '', 'hash-viejo', 'NO', '', ''],
    ['1000004', 'DIANA ROJAS', 'diana@x.com', 'RESPONSABLE_AREA', 'SI', 'HOSPITALIZACION 4 PISO', HOY, 'APROBADO', '', '', 'hash-viejo', 'NO', '', '']]);
  add('SEG_Usuarios', [['usuario', 'nombre', 'rol', 'areas', 'salt', 'hash', 'activo'], ['admin', 'Admin', 'ADMINISTRADOR', '*', 's', 'h', true]]);
  const CE = ['ID CASO', 'BANDEJA', 'ESTADO', 'INGRESO', 'FECHA INGRESO', 'TIPO ID', 'DOCUMENTO', 'PACIENTE', 'EDAD', 'AREA', 'CAMA', 'ENTIDAD', 'CONTRATO', 'PLAN', 'VALOR', 'EGRESADO', 'FECHA EGRESO', 'ORIGEN', 'GESTOR CORREO', 'GESTOR', 'FECHA APERTURA', 'CREADO POR', 'FECHA ULTIMA GESTION', 'ULTIMA GESTION', 'PROXIMA ACCION', 'FECHA COMPROMISO', 'FECHA DEFINICION', 'FECHA CIERRE', 'RESULTADO CIERRE', 'EN EXCEL', 'FECHA ULTIMA CARGA', 'FECHA ACCIDENTE', 'PLACA', 'ASEGURADORA', 'POLIZA', 'CASO ADRES', 'SITUACION', 'TRAMITE', 'ENTE RESPONSABLE', 'DOCUMENTOS RECIBIDOS', 'OBSERVACIONES', 'ANULADO', 'MOTIVO ANULACION', 'ULTIMA ACTUALIZACION', 'ACTUALIZADO POR', 'INGRESO POR', 'TIPO INGRESO', 'SUB GRUPO'];
  const casos = [];
  // legado: 6 cerrados automáticamente (ingresos que ya no están), 3 definidos de ingresos actuales
  for (let k = 0; k < 6; k++) { const r = CE.map(() => ''); Object.assign(r, { 0: 'old-' + k, 1: 'SOAT_DEFINIDO', 2: 'CERRADO EN DINÁMICA', 3: '19' + k, 7: 'PACIENTE VIEJO', 11: 'EQUIDAD SEGUROS SOAT', 17: 'AUTOMATICO', 27: HOY, 28: 'El ingreso ya no aparece en el Excel de ingresos abiertos (cerrado en Dinámica).', 29: 'NO', 41: 'NO' }); casos.push(r); }
  ing.filter(r => /SEGUROS|SOAT/.test(r[16])).slice(0, 3).forEach((x, k) => { const r = CE.map(() => ''); Object.assign(r, { 0: 'leg-' + k, 1: 'SOAT_DEFINIDO', 2: 'DEFINIDO - PENDIENTE DE CIERRE', 3: x[0], 6: x[13], 7: x[14], 11: x[16], 17: 'AUTOMATICO', 29: 'SI', 41: 'NO' }); casos.push(r); });
  add('CASOS_ESPECIALES', [CE, ...casos]);
  add('GESTIONES_CASOS', [['ID GESTION', 'FECHA Y HORA', 'ID CASO', 'INGRESO', 'BANDEJA', 'TIPO GESTION', 'DESCRIPCION', 'RESULTADO', 'ESTADO ANTERIOR', 'ESTADO NUEVO', 'PROXIMA ACCION', 'FECHA COMPROMISO', 'USUARIO CORREO', 'USUARIO', 'ANULADA', 'MOTIVO ANULACION', 'EDITADA POR', 'FECHA EDICION', 'CORRIGE A GESTION', 'MOTIVO CORRECCION', 'HUELLA']]);
  const RA = ['ID', 'INGRESO', 'DOCUMENTO', 'PACIENTE', 'EPS', 'FECHA INGRESO', 'EGRESO', 'FECHA EGRESO', 'TIPO ATENCION', 'AREA SOLICITANTE', 'REGISTRADO POR DOCUMENTO', 'REGISTRADO POR', 'SERVICIO QUE REGISTRA', 'TIPO SERVICIO', 'DESCRIPCION SERVICIO', 'CUPS', 'FECHA SERVICIO', 'MODALIDAD ESTANCIA', 'FECHA COBERTURA DESDE', 'FECHA COBERTURA HASTA', 'NUM AUTORIZACION', 'FOLIO', 'ESTADO', 'OBSERVACIONES', 'FECHA CREACION', 'CREADO POR', 'ULTIMA ACTUALIZACION', 'ACTUALIZADO POR'];
  const ra = [ing[1], ing[2]].map((x, k) => { const r = RA.map(() => ''); Object.assign(r, { 0: 'R-' + k, 1: x[0], 2: x[13], 3: x[14], 4: x[16], 9: 'Internación 4 piso', 14: 'TAC SIMPLE', 22: 'AUTORIZADO', 24: new Date(HOY - 5 * 864e5), 25: 'JORGE SILVA', 26: new Date(HOY - 3 * 864e5), 27: 'JORGE SILVA' }); return r; });
  add('REGISTROS_AUTORIZACIONES', [RA, ...ra]);
  add('SEGUIMIENTO', [['FECHA Y HORA', 'ID AUTORIZACION', 'INGRESO', 'OBSERVACION', 'USUARIO DOCUMENTO', 'USUARIO']]);
  add('HISTORICO', [['FECHA Y HORA', 'ID REGISTRO', 'INGRESO', 'ACCION', 'USUARIO DOCUMENTO', 'USUARIO', 'DETALLE']]);
  const HA = [['FECHA', 'TOTAL', 'VALOR TOTAL', 'EGRESADOS ABIERTOS', 'MAS DE 30 DIAS', 'CON AUTORIZACION PENDIENTE']];
  for (let k = 12; k >= 1; k--) HA.push([new Date(HOY - k * 2 * 864e5), n + int(-40, 40), 7.8e9 + int(-5, 5) * 1e8, int(380, 420), k > 9 ? 840 : int(40, 55), 0]);
  add('HISTORICO_ABIERTOS', HA);
  add('ERP_CONTRATOS', [['TEXTO ORIGINAL', 'ERP', 'CONTRATO', 'PROPUESTA AUTOMATICA', 'INGRESOS ULTIMA CARGA'], ['CAPRESOCA EPS - CONTRIBUTIVO', 'CAPRESOCA EPS', 'RIBUTIVO', 'CAPRESOCA EPS / RIBUTIVO', 3], ['CAPRESOCA EPS- .2026', 'CAPRESOCA EPS', '2026', '', 4]]);
  add('CUPS', [['CODIGO', 'DESCRIPCION'], ['879111', 'TOMOGRAFIA COMPUTADA DE CRANEO SIMPLE'], ['883101', 'RESONANCIA MAGNETICA DE CEREBRO'], ['881201', 'ECOCARDIOGRAMA TRANSTORACICO'], ['890402', 'INTERCONSULTA POR NEUROCIRUGIA']]);
  add('LISTAS', [['AREA SOLICITANTE / SERVICIO QUE REGISTRA'], ['Urgencias'], ['Internación 4 piso'], ['Consulta Externa']]);
  add('PERSONAL', [['DOCUMENTO', 'NOMBRE'], ['1', 'X']]);
  return { L, ing, ENC_ING, HOY };
}
module.exports = { libroInicial, filaIngreso, ENC_ING };
