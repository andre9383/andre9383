// Prueba de la interfaz real (Index + Estilos + Componentes + App + Vistas) contra el servidor simulado.
const fs = require('fs'), path = require('path'); const { chromium } = require('playwright');
const DIR = process.argv[2], OUT = process.argv[3];
const { crearEntorno } = require('./mock'); const { libroInicial, ENC_ING } = require('./semilla');
const { L, ing } = libroInicial(1200); const { ctx, env } = crearEntorno(L);
env.activeUser = 'owner@x.com'; ctx.inicializarSistema(); const cod = env.props.get('CODIGO_ADMIN_INICIAL'); env.activeUser = '';
// dejar todo listo: admin, una carga, usuarios aprobados
ctx.publico('registro', { documento: '1000001', nombre: 'Laura Méndez', correo: 'admin@x.com', area: 'URGENCIAS', clave: 'Clave2026', aceptaDatos: true, codigoAdmin: cod });
const tk = ctx.publico('login', { usuario: '1000001', clave: 'Clave2026' }).data.token;
const aObjs = rows => rows.map(r => { const o = {}; ENC_ING.forEach((h, i) => { const v = r[i]; o[h] = v instanceof Date ? v.toISOString() : v; }); return o; });
ctx.api(tk, 'cargarIngresos', { nombreArchivo: 'c1.xlsx', filas: aObjs(ing.slice(0, 1150)) });
const r2 = ing.slice(30).map(r => r.slice()); r2.filter(r => /SIN SEGURIDAD/.test(r[16])).slice(0, 4).forEach(r => { r[16] = 'CAPRESOCA EPS - URGENCIAS SIN - CUPS-SUBSIDIADO'; });
ctx.api(tk, 'cargarIngresos', { nombreArchivo: 'c2.xlsx', filas: aObjs(r2) });
['1000002', '1000003', '1000004'].forEach(d => ctx.api(tk, 'guardarUsuario', { doc: d, estado: 'APROBADO' }));
ctx.publico('registro', { documento: '3000001', nombre: 'Sofía Ávila', correo: 'sofia@x.com', area: 'URGENCIAS', clave: 'Clave2026', aceptaDatos: true });
const html = fs.readFileSync(path.join(DIR, 'Index.html'), 'utf8').replace(/<\?!= include\('(\w+)'\); \?>/g, (m, n) => fs.readFileSync(path.join(DIR, n + '.html'), 'utf8'));
const shim = `<script>(function(){function mk(st){return new Proxy({},{get(t,k){if(k==='withSuccessHandler')return f=>mk(Object.assign({},st,{ok:f}));if(k==='withFailureHandler')return f=>mk(Object.assign({},st,{fail:f}));return (...a)=>window.__gs(k,JSON.stringify(a)).then(r=>st.ok&&st.ok(JSON.parse(r))).catch(e=>st.fail&&st.fail(e));}});}window.google={script:{run:mk({})}};})();</script>`;
const page_html = html.replace('<head>', '<head>' + shim);
(async () => {
  const b = await chromium.launch(); const errs = [];
  const nueva = async (vp, scheme) => { const p = await b.newPage({ viewport: vp, deviceScaleFactor: 2, colorScheme: scheme || 'light' });
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/fonts|ERR_|Failed to load/.test(m.text())) errs.push(m.text()); });
    await p.exposeFunction('__gs', (fn, args) => { const a = JSON.parse(args); const r = ctx[fn](...a); return JSON.stringify(r); });
    await p.route('**/chart.umd.min.js', r => r.fulfill({ path: path.join(__dirname, '../node_modules/chart.js/dist/chart.umd.js'), contentType: 'text/javascript' }));
    await p.route('**/xlsx.full.min.js', r => r.fulfill({ path: path.join(__dirname, '../node_modules/xlsx/dist/xlsx.full.min.js'), contentType: 'text/javascript' }));
    await p.route('**/fonts.googleapis.com/**', r => r.abort()); await p.route('http://app.local/', r => r.fulfill({ body: page_html, contentType: 'text/html' }));
    await p.emulateMedia({ reducedMotion: 'reduce' }); await p.goto('http://app.local/'); await p.waitForTimeout(400); return p; };
  const p = await nueva({ width: 1440, height: 950 });
  await p.screenshot({ path: OUT + '/01-acceso.png' });
  await p.fill('#lU', 'admin@x.com'); await p.fill('#lC', 'Clave2026'); await p.click('#fLogin button[type=submit]'); await p.waitForTimeout(1500); if(!(await p.$('#nav .nav-btn'))){ console.log('ERR', errs, await p.textContent('#aErr').catch(()=>'-'), await p.textContent('body').then(t=>t.slice(0,400))); await b.close(); return; } await p.waitForTimeout(600);
  await p.screenshot({ path: OUT + '/02-inicio.png' });
  // menú agrupado: abrir Ingresos abiertos
  await p.hover('[data-mod="ing"]'); await p.waitForTimeout(300); await p.screenshot({ path: OUT + '/03-menu-ingresos.png' });
  await p.click('#mega [data-ir="ing/listado"]'); await p.waitForTimeout(700);
  // lista desplegable de contrato agrupada por ERP
  await p.click('[data-cb="ing/listado|con"]'); await p.waitForTimeout(200); await p.fill('#cbpq', 'capre'); await p.waitForTimeout(200);
  await p.screenshot({ path: OUT + '/04-lista-contrato.png' });
  await p.keyboard.press('ArrowDown'); await p.keyboard.press('Enter'); await p.waitForTimeout(300); await p.click('[data-cbx="cerrar"]');
  await p.click('[data-cb="ing/listado|g"]'); await p.waitForTimeout(200); await p.screenshot({ path: OUT + '/05-lista-area.png' });
  await p.locator('.cbp-o input').first().check(); await p.waitForTimeout(300); await p.click('[data-cbx="cerrar"]'); await p.waitForTimeout(500);
  await p.screenshot({ path: OUT + '/06-ingresos-filtrados.png' });
  await p.click('[data-clr="*"]'); await p.waitForTimeout(300); await p.click('tr.row'); await p.waitForTimeout(400); await p.screenshot({ path: OUT + '/07-detalle-ingreso.png' }); await p.click('.x');
  // casos especiales
  await p.click('[data-mod="casos"]'); await p.waitForTimeout(250); await p.screenshot({ path: OUT + '/08-menu-casos.png' });
  await p.click('#mega [data-ir="casos/salio"]'); await p.waitForTimeout(500); await p.screenshot({ path: OUT + '/09-casos-salieron.png' });
  await p.click('tr.row'); await p.waitForTimeout(600); await p.fill('#kS', 'FE-123'); await p.click('#fCasoCierre button'); await p.waitForTimeout(800);
  // autorizaciones: registrar desde código
  await p.evaluate(() => ir('aut/bandeja')); await p.waitForTimeout(500); await p.screenshot({ path: OUT + '/10-bandeja-aut.png' });
  await p.click('[data-qf="fuente|Solo código en RESPONSABLE"]'); await p.waitForTimeout(300); await p.click('tr.row'); await p.waitForTimeout(300); await p.click('[data-tomar]'); await p.waitForTimeout(300);
  await p.fill('#nServ', 'craneo'); await p.waitForTimeout(700); await p.screenshot({ path: OUT + '/11-nueva-solicitud.png' }); await p.keyboard.press('Enter'); await p.click('#fNueva button[type=submit]'); await p.waitForTimeout(800);
  // medición, informes, cargue, admin
  for (const [v, n] of [['med/resumen', '12-medicion'], ['med/erp', '13-medicion-erp'], ['med/casosm', '14-medicion-casos'], ['ing/conc', '15-concentracion'], ['ing/hall', '16-hallazgos'], ['ing/cambios', '17-cambios'], ['inf/informes', '18-informes'], ['carga/calidad', '19-calidad'], ['admin/usuarios', '20-usuarios'], ['admin/catalogos', '21-catalogos'], ['admin/permisos', '22-permisos'], ['casos/sss', '23-sin-seguridad'], ['ing/hosp', null], ['ing/ce', null], ['med/areas', null], ['med/gest', null], ['med/patron', null], ['med/evol', null], ['carga/cargar', null], ['carga/historial', null], ['admin/parametros', null], ['aut/historico', null], ['aut/mias', null], ['casos/soat', null], ['casos/sindoc', null], ['casos/cambio', null], ['casos/singes', null], ['inf/ia', null]]) {
    await p.evaluate(v => ir(v), v); await p.waitForTimeout(v.startsWith('admin') ? 900 : 450); if (n) await p.screenshot({ path: OUT + '/' + n + '.png' }); }
  // descarga excel y carga de archivo real con SheetJS
  await p.evaluate(() => ir('inf/informes')); await p.waitForTimeout(300);
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 5000 }).catch(() => null), p.click('[data-dl="excel"]')]); if (!dl) errs.push('No se disparó la descarga');
  const XLSX = require('../node_modules/xlsx'); const wb = XLSX.utils.book_new(); const filas = [['REPORTE INGRESOS ABIERTOS'], [], ENC_ING, ...r2.slice(0, 900).map(r => r.map(c => c instanceof Date ? c : c))];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(filas, { cellDates: true }), 'Hoja1'); XLSX.writeFile(wb, OUT + '/../prueba.xlsx');
  await p.evaluate(() => ir('carga/cargar')); await p.waitForTimeout(300); await p.setInputFiles('#fileIn', OUT + '/../prueba.xlsx'); await p.waitForTimeout(800); await p.click('#bConf'); await p.waitForTimeout(1500);
  await p.screenshot({ path: OUT + '/24-carga-resultado.png' });
  const res = await p.textContent('#valid'); if (!/Carga terminada/.test(res)) errs.push('Carga: ' + res);
  // celular
  const m = await nueva({ width: 390, height: 844 }); await m.fill('#lU', '1000001'); await m.fill('#lC', 'Clave2026'); await m.click('#fLogin button[type=submit]'); await m.waitForSelector('#nav .nav-btn'); await m.waitForTimeout(500);
  await m.evaluate(() => ir('ing/listado')); await m.waitForTimeout(600); const sw = await m.evaluate(() => document.documentElement.scrollWidth); if (sw > 392) errs.push('Celular desborda: ' + sw);
  await m.screenshot({ path: OUT + '/25-celular.png' });
  // modo oscuro
  const d = await nueva({ width: 1440, height: 950 }, 'dark'); await d.fill('#lU', '1000001'); await d.fill('#lC', 'Clave2026'); await d.click('#fLogin button[type=submit]'); await d.waitForSelector('#nav .nav-btn'); await d.evaluate(() => ir('med/erp')); await d.waitForTimeout(700); await d.screenshot({ path: OUT + '/26-oscuro.png' });
  await b.close();
  console.log('errores UI:', JSON.stringify(errs, null, 1)); console.log('errores servidor:', env.errores || 'ninguno');
})();
