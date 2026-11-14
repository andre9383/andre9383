const { crearEntorno } = require('./mock'); const { libroInicial, filaIngreso, ENC_ING } = require('./semilla');
const { L, ing } = libroInicial(+process.env.N || 800);
const { ctx, env } = crearEntorno(L);
let ok = 0, fallos = [];
const sinFechas = (v, p = '') => { if (v instanceof Date) throw new Error('Date en respuesta ' + p); if (typeof v === 'function') throw new Error('function en respuesta ' + p); if (v && typeof v === 'object') Object.keys(v).forEach(k => sinFechas(v[k], p + '.' + k)); };
const t = (nombre, fn) => { try { const r = fn(); ok++; return r; } catch (e) { fallos.push(nombre + ': ' + e.message); } };
const api = (tok, a, d) => { const r = ctx.api(tok, a, d); sinFechas(r, a); const j = JSON.parse(JSON.stringify(r)); if (!j.ok) throw new Error(a + ' → ' + j.error); return j.data; };
const apiErr = (tok, a, d) => { const r = ctx.api(tok, a, d); if (r.ok) throw new Error(a + ' debía fallar'); return r.error; };
const pub = (a, d) => { const r = ctx.publico(a, d); sinFechas(r); if (!r.ok) throw new Error(a + ' → ' + r.error); return r.data; };
const T0 = Date.now();

// 1. Instalación y seguridad del menú
t('menú bloqueado desde la web', () => { env.activeUser = ''; let e; try { ctx.generarCodigoAdmin(); } catch (x) { e = x; } if (!e) throw new Error('generarCodigoAdmin se pudo llamar sin sesión de Google'); });
let codigo; t('inicializar', () => { env.activeUser = 'owner@x.com'; const m = ctx.inicializarSistema(); codigo = env.props.get('CODIGO_ADMIN_INICIAL'); if (!codigo) throw new Error('sin código: ' + m); env.activeUser = ''; });
t('columnas nuevas agregadas sin borrar', () => { const h = L.getSheetByName('CASOS_ESPECIALES').data[0]; if (!h.includes('ERP ACTUAL') || h[2] !== 'ESTADO') throw new Error(h.join(',')); if (L.getSheetByName('INGRESOS_ABIERTOS').getLastRow() !== ing.length + 1) throw new Error('INGRESOS alterado'); });
t('login con clave vieja falla', () => { const r = ctx.publico('login', { usuario: '1000001', clave: 'loquesea1' }); if (r.ok) throw new Error('entró con clave vieja'); });
t('registro admin con código', () => pub('registro', { documento: '1000001', nombre: 'Laura Mendez', correo: 'admin@x.com', area: 'URGENCIAS', clave: 'Clave2026', aceptaDatos: true, codigoAdmin: codigo }));
t('código de un solo uso', () => { if (env.props.get('CODIGO_ADMIN_INICIAL')) throw new Error('el código sigue activo'); });
const adm = t('login admin', () => pub('login', { usuario: 'admin@x.com', clave: 'Clave2026' }).token);
t('bloqueo por intentos', () => { for (let i = 0; i < 5; i++) ctx.publico('login', { usuario: '1000002', clave: 'malaClave1' }); const r = ctx.publico('login', { usuario: '1000002', clave: 'malaClave1' }); if (!/bloqueada/.test(r.error)) throw new Error(r.error); });
t('token inválido', () => { const e = apiErr('x'.repeat(50), 'datos'); if (e !== 'SESION_EXPIRADA') throw new Error(e); });
t('acción no válida', () => apiErr(adm, 'eval', {}));
t('fórmula neutralizada', () => { pub('registro', { documento: '2000009', nombre: '=HYPERLINK("x")', correo: 'f@x.com', area: 'URGENCIAS', clave: 'Clave2026', aceptaDatos: true }); const u = L.getSheetByName('USUARIOS').data.find(r => r[0] === '2000009'); if (!String(u[1]).startsWith("'")) throw new Error(u[1]); });

// 2. Datos y derivación sobre la carga existente
let D = t('datos admin', () => api(adm, 'datos'));
t('valor convertido y áreas inferidas', () => { const x = D.ingresos.find(z => z.val > 0); if (typeof x.val !== 'number') throw new Error('valor'); if (!D.ingresos.some(z => z.inf && z.g === 'CONSULTA EXTERNA')) throw new Error('sin CE inferida'); });
t('ERP unificada', () => { const c = D.ingresos.filter(z => z.erp === 'CAPRESOCA'); const cons = new Set(c.map(z => z.con)); if (!cons.has('CTO 283-2025 · PGP') || !cons.has('SIN CONTRATO')) throw new Error([...cons].join('|')); const n = D.ingresos.filter(z => z.erp === 'NUEVA EPS'); if (!n.some(z => z.con === '101')) throw new Error('101'); });
t('bandejas', () => { const b = new Set(D.ingresos.map(z => z.ban)); ['SOAT_DEFINIDO', 'SOAT_SIN_DOC', 'SIN_SS', 'EPS', 'PARTICULAR'].forEach(k => { if (!b.has(k)) throw new Error('falta ' + k + ' en ' + [...b]); }); if (D.ingresos.find(z => /FOMAG/.test(z.ent)).ban !== 'EPS') throw new Error('FOMAG mal'); });
t('pendientes por código detectadas', () => { const d = D.auts.filter(a => a.id.startsWith('D-')); if (d.length < 10) throw new Error(d.length); if (!D.ingresos.some(x => x.ap)) throw new Error('sin ap'); });
t('legado CERRADO EN DINÁMICA → SALIÓ', () => { if (D.casos.filter(c => c.est === 'SALIÓ SIN CIERRE').length !== 6) throw new Error(D.casos.map(c => c.est).join(',')); });
t('legado AUTORIZADO medible', () => { const r = D.auts.find(a => a.id === 'R-0'); if (r.est !== 'AUTORIZADO' || !(r.fr > r.fs)) throw new Error(JSON.stringify(r)); });
t('alertas admin', () => { const ids = D.alertas.map(a => a.id); ['aut-cod', 'cas-salio', 'ing-cama', 'usr-pend'].forEach(k => { if (!ids.includes(k)) throw new Error('falta ' + k + ' en ' + ids); }); });
t('hallazgos', () => { if (!D.ingresos.some(x => (x.h || []).includes('Egresado con cama asignada'))) throw new Error('h'); });

// 3. Primera carga por la app (misma data, fechas como texto ISO como las manda el navegador)
const aObjs = rows => rows.map(r => { const o = {}; ENC_ING.forEach((h, i) => { const v = r[i]; o[h] = v instanceof Date ? v.toISOString() : v; }); return o; });
let R1 = t('carga 1', () => api(adm, 'cargarIngresos', { nombreArchivo: 'c1.xlsx', filas: aObjs(ing) }));
t('carga 1 crea casos', () => { if (!(R1.casosCreados > 20)) throw new Error(JSON.stringify(R1)); if (R1.filas !== ing.length) throw new Error('filas'); });
t('catálogo ERP con bandeja', () => { const e = L.getSheetByName('ERP_CONTRATOS'); const h = e.data[0]; const r = e.data.find(x => x[0] === 'CAPRESOCA EPS - CONTRIBUTIVO'); if (r[h.indexOf('CONTRATO')] !== 'CONTRIBUTIVO') throw new Error('no corrigió RIBUTIVO: ' + r); });
t('fechas guardadas como Date', () => { if (!(L.getSheetByName('INGRESOS_ABIERTOS').data[1][1] instanceof Date)) throw new Error('fecha texto'); });
// 4. Segunda carga con cambios
const ing2 = ing.slice(40).map(r => r.slice());
const sinSS = ing2.filter(r => /SIN SEGURIDAD/.test(r[16])).slice(0, 3); sinSS.forEach(r => { r[16] = 'CAPRESOCA EPS - URGENCIAS SIN - CUPS-SUBSIDIADO'; });
for (let i = 0; i < 25; i++) ing2.push(filaIngreso(5000 + i));
const salenEspeciales = ing.slice(0, 40).filter(r => /SOAT|SEGUROS|SIN SEG|ADRES|RECIEN/.test(r[16])).length;
let R2 = t('carga 2', () => api(adm, 'cargarIngresos', { nombreArchivo: 'c2.xlsx', filas: aObjs(ing2) }));
t('carga 2 cambios', () => { if (R2.salieron !== 40 || R2.nuevos !== 25 || R2.cambioPagador !== 3) throw new Error(JSON.stringify(R2)); if (R2.casosSalieron !== salenEspeciales) throw new Error('casos salieron ' + R2.casosSalieron + ' vs ' + salenEspeciales); });
t('carga del mismo día reemplaza fotografía', () => { const h = L.getSheetByName('HISTORICO_ABIERTOS'); const hoy = h.data.slice(1).filter(r => r[0] instanceof Date && r[0].toDateString() === new Date().toDateString()); if (hoy.length !== 1) throw new Error(hoy.length); });
D = t('datos tras carga 2', () => api(adm, 'datos'));
t('cambios visibles', () => { if (D.cambios.filter(c => c.tipo === 'SALIÓ DE ABIERTOS').length !== 40) throw new Error(D.cambios.length); });
t('pagador asignado', () => { if (D.casos.filter(c => c.est === 'PAGADOR ASIGNADO').length !== 3) throw new Error(D.casos.filter(c => c.est === 'PAGADOR ASIGNADO').length); });
t('ningún caso cerrado solo', () => { if (D.casos.some(c => c.est === 'CERRADO')) throw new Error('se cerró solo'); });
t('gestiones automáticas con huella', () => { const g = L.getSheetByName('GESTIONES_CASOS'); const hi = g.data[0].indexOf('HUELLA'); if (g.data.slice(1).some(r => !r[hi])) throw new Error('sin huella'); });

// 5. Autorizaciones
if (!D) { console.log(fallos); process.exit(1); }
const det = D.auts.find(a => a.id.startsWith('D-'));
const nueva = t('crear desde código', () => api(adm, 'crearAut', { ingreso: det.ing, servicio: 'TOMOGRAFIA', cups: '879111', prioridad: 'alta', codigo: det.cod }).id);
t('radicar sin número falla', () => apiErr(adm, 'accionAut', { id: nueva, accion: 'radicar' }));
t('radicar', () => api(adm, 'accionAut', { id: nueva, accion: 'radicar', numRadicado: '55231' }));
t('autorizar', () => api(adm, 'accionAut', { id: nueva, accion: 'autorizar', numAutorizacion: '998877' }));
t('bitácora', () => { const b = api(adm, 'bitacoraAut', { id: nueva }); if (b.length !== 3) throw new Error(b.length); });
t('corrección cerrada exige motivo', () => apiErr(adm, 'accionAut', { id: nueva, accion: 'tramite' }));
t('cups', () => { const c = api(adm, 'buscarCups', { q: 'craneo' }); if (!c.length) throw new Error('sin cups'); });
D = t('datos', () => api(adm, 'datos'));
t('detectada desaparece al registrar', () => { if (D.auts.some(a => a.id === 'D-' + det.ing)) throw new Error('sigue detectada'); const a = D.auts.find(z => z.id === nueva); if (a.est !== 'AUTORIZADO' || a.fuente !== 'CODIGO') throw new Error(JSON.stringify(a)); });

// 6. Usuarios y roles
t('aprobar migrados', () => { ['1000002', '1000003', '1000004'].forEach(d => api(adm, 'guardarUsuario', { doc: d, estado: 'APROBADO' })); });
const clv = {}; t('restablecer', () => { ['1000002', '1000003', '1000004'].forEach(d => { clv[d] = api(adm, 'restablecerClave', { doc: d }).temporal; }); });
const aut = t('login autorizador temporal', () => pub('login', { usuario: 'jorge@x.com', clave: clv['1000002'] }));
t('obliga a cambiar clave', () => { const e = apiErr(aut.token, 'crearAut', { ingreso: '1', servicio: 'x' }); if (!/cambiar tu contraseña/.test(e)) throw new Error(e); });
t('cambiar clave', () => api(aut.token, 'cambiarClave', { actual: clv['1000002'], nueva: 'Nueva2026x' }));
t('rol legado OPERADOR = AUTORIZADOR', () => { const d = api(aut.token, 'datos'); if (d.yo.rol !== 'AUTORIZADOR' || d.yo.perm.aut !== 2 || d.yo.perm.admin !== 0) throw new Error(JSON.stringify(d.yo)); });
t('autorizador no administra', () => apiErr(aut.token, 'adminDatos'));
t('autorizador no carga', () => apiErr(aut.token, 'cargarIngresos', { filas: [{}] }));
const ges = t('gestor', () => { const l = pub('login', { usuario: '1000003', clave: clv['1000003'] }); api(l.token, 'cambiarClave', { actual: clv['1000003'], nueva: 'Gestor2026' }); return l.token; });
const caso = D.casos.find(c => c.est === 'SALIÓ SIN CIERRE');
t('gestor toma caso', () => api(ges, 'gestionCaso', { id: caso.id, tipo: 'Llamada telefónica', descripcion: 'Se confirma factura' }));
t('gestor documentos', () => api(ges, 'documentosCaso', { id: caso.id, docs: ['FURIPS diligenciado', 'Póliza SOAT vigente'] }));
t('cierre sin soporte falla', () => apiErr(ges, 'cerrarCaso', { id: caso.id, soporte: '' }));
t('cierre con soporte', () => api(ges, 'cerrarCaso', { id: caso.id, soporte: 'FE-123456', resultado: 'Facturado' }));
t('otro gestor no edita caso ajeno', () => { const otro = D.casos.find(c => c.est !== 'CERRADO' && c.id !== caso.id); api(adm, 'actualizarCaso', { id: otro.id, gestor: 'LAURA MENDEZ' }); const e = apiErr(ges, 'gestionCaso', { id: otro.id, tipo: 'Otra', descripcion: 'x' }); if (!/gestiona/.test(e)) throw new Error(e); });
t('gestiones del caso', () => { const g = api(ges, 'gestionesCaso', { id: caso.id }); if (g.length < 3) throw new Error(g.length); });
const coord = t('coordinador de área', () => { const l = pub('login', { usuario: 'diana@x.com', clave: clv['1000004'] }); api(l.token, 'cambiarClave', { actual: clv['1000004'], nueva: 'Coord2026x' }); return l.token; });
t('coordinador solo ve su área', () => { const d = api(coord, 'datos'); const gs = new Set(d.ingresos.map(x => x.g)); if (gs.size !== 1 || !gs.has('HOSPITALIZACION 4 PISO')) throw new Error([...gs]); if (d.auts.some(a => a.g !== 'HOSPITALIZACION 4 PISO')) throw new Error('auts fuera de área'); });

// 7. Administración, parámetros y catálogos
t('permiso', () => { api(adm, 'guardarPermiso', { modulo: 'med', rol: 'AUTORIZADOR', nivel: 1 }); const d = api(aut.token, 'datos'); if (d.yo.perm.med !== 1) throw new Error('no aplicó'); });
t('admin no se quita admin', () => apiErr(adm, 'guardarUsuario', { doc: '1000001', rol: 'CONSULTA' }));
t('parámetro y versión', () => { const v0 = api(adm, 'datos').param.REGLA_VERSION; api(adm, 'guardarParametro', { clave: 'CE_DIAS_CIERRE', valor: 5 }); const p = api(adm, 'datos').param; if (p.CE_DIAS_CIERRE !== 5 || p.REGLA_VERSION === v0) throw new Error(JSON.stringify(p)); });
t('catálogo ERP corrige', () => { api(adm, 'guardarCatalogo', { catalogo: 'erp', cambios: [{ _clave: 'PARTICULARES-CUPS', 'TEXTO ORIGINAL': 'PARTICULARES-CUPS', ERP: 'PARTICULAR DIRECTO', CONTRATO: 'CONTADO', BANDEJA: 'PARTICULAR' }] }); const d = api(adm, 'datos'); if (!d.ingresos.some(x => x.erp === 'PARTICULAR DIRECTO')) throw new Error('no aplicó'); });
t('catálogo código inválido', () => apiErr(adm, 'guardarCatalogo', { catalogo: 'codigos', cambios: [{ PATRON: '([', CLAVE: 'X', SIGNIFICADO: 'x' }] }));
t('adminDatos', () => { const a = api(adm, 'adminDatos'); if (!a.usuarios.length || !a.erp.filas.length) throw new Error('vacío'); });

// 8. Informes e IA
t('excel', () => { const r = api(adm, 'reporteExcel', {}); if (!r.b64 || !/xlsx$/.test(r.nombre)) throw new Error('sin archivo'); if (!env.fetches.some(f => /drive\/v3\/files/.test(f.url) && f.o.method === 'delete')) throw new Error('no borró temporal'); });
t('ia sin clave', () => { const e = apiErr(adm, 'preguntarIA', { pregunta: 'Resume' }); if (!/no está activado/.test(e)) throw new Error(e); });
env.props.set('ANTHROPIC_API_KEY', 'sk-test');
t('ia', () => { const r = api(adm, 'preguntarIA', { pregunta: '¿Qué ERP priorizo?' }); if (!r.texto) throw new Error('sin texto'); const b = env.iaBody; if (b.model !== 'claude-opus-5-5' || b.fallbacks !== 'default' || env.iaHeaders['anthropic-beta'] !== 'server-side-fallback-2026-07-01') throw new Error(JSON.stringify(b).slice(0, 200)); if (/RN HIJO|PACIENTE|\b20500\d\d\b/.test(b.messages[0].content)) throw new Error('datos personales enviados a la IA'); });
t('ia autorizador no', () => apiErr(aut.token, 'preguntarIA', { pregunta: 'hola mundo' }));
t('informe pdf con IA', () => { env.tablas = 0; const r = api(adm, 'informe', { formato: 'pdf', conIA: true }); if (!/pdf$/.test(r.nombre) || env.tablas < 8) throw new Error(r.nombre + ' tablas ' + env.tablas); });
t('informe word', () => { const r = api(adm, 'informe', { formato: 'docx' }); if (!/docx$/.test(r.nombre)) throw new Error(r.nombre); });

// 9. Menú y alertas
t('migrar casos legado', () => { env.activeUser = 'owner@x.com'; ctx.migrarCasosCerradosAutomaticamente(); env.activeUser = ''; const e = L.getSheetByName('CASOS_ESPECIALES'); const i = e.data[0].indexOf('ESTADO'); if (e.data.slice(1).some(r => /DIN[ÁA]MICA/.test(r[i]))) throw new Error('quedó CERRADO EN DINÁMICA'); });
t('alertas por correo', () => { env.mails.length = 0; ctx.ejecutarAlertasProgramadas(); if (env.mails.length < 2) throw new Error(env.mails.length); const n = env.mails.length; ctx.ejecutarAlertasProgramadas(); if (env.mails.length !== n) throw new Error('reenvió'); });
t('cerrar sesión', () => { api(adm, 'cerrarSesion'); const e = apiErr(adm, 'datos'); if (e !== 'SESION_EXPIRADA') throw new Error(e); });

console.log(`\n${ok} pruebas correctas, ${fallos.length} fallidas · ${(Date.now() - T0)} ms · filas ${ing.length}`);
fallos.forEach(f => console.log('  ✗ ' + f));
if (env.errores) console.log('errores registrados:', env.errores.slice(0, 5));
module.exports = { ctx, env, L };
