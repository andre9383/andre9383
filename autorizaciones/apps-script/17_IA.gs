/**
 * Asistente IA (Claude). Solo recibe indicadores agregados: nunca nombres, documentos ni números de ingreso.
 * La clave va en Propiedades del script: ANTHROPIC_API_KEY.
 */

function preguntarIA_(s, d) {
  if (['ADMINISTRADOR', 'COORDINADOR_GENERAL', 'COORDINADOR_AREA'].indexOf(s.rol) < 0) throw new Error('El asistente IA está disponible para administración y coordinación.');
  var clave = prop_('ANTHROPIC_API_KEY');
  if (!clave) throw new Error('El asistente IA no está activado. El administrador debe agregar ANTHROPIC_API_KEY en Propiedades del script.');
  var pregunta = txt_(d.pregunta).slice(0, 1500);
  if (pregunta.length < 5) throw new Error('Escribe tu pregunta.');

  if (!d.interno) {                                  // límite de consultas por usuario
    var cache = CacheService.getScriptCache(), k = 'ia_' + s.documento, n = +(cache.get(k) || 0);
    if (n >= APP.IA_LIMITE_CONSULTAS) throw new Error('Alcanzaste el límite de ' + APP.IA_LIMITE_CONSULTAS + ' consultas en ' + APP.IA_VENTANA_HORAS + ' horas.');
    cache.put(k, String(n + 1), APP.IA_VENTANA_HORAS * 3600);
  }

  var p = parametros_(), R = resumenAgregado_(datosBase_(s), p);
  var sistema = 'Eres analista de facturación y autorizaciones de una institución de salud en Colombia. ' +
    'Respondes en español, con frases cortas y concretas, a partir SOLO de los indicadores que recibes en JSON. ' +
    'Si un dato no está en el JSON, dilo en vez de suponerlo. Cuando propongas acciones, indica responsable sugerido y plazo. ' +
    'No inventes nombres de personas ni cifras.';
  var cuerpo = {
    model: APP.IA_MODELO,
    max_tokens: 4000,
    output_config: { effort: 'medium' },
    fallbacks: 'default',
    system: sistema,
    messages: [{ role: 'user', content: 'Indicadores del corte (JSON):\n' + JSON.stringify(R) + '\n\nPregunta: ' + pregunta }]
  };
  var r = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    headers: { 'x-api-key': clave, 'anthropic-version': '2026-10-21', 'anthropic-beta': 'server-side-fallback-2026-07-01' },
    payload: JSON.stringify(cuerpo)
  });
  var code = r.getResponseCode(), j;
  try { j = JSON.parse(r.getContentText()); } catch (e) { j = {}; }
  if (code === 429 || code === 529) throw new Error('El servicio de IA está ocupado. Intenta de nuevo en un minuto.');
  if (code === 401 || code === 403) throw new Error('La clave de la IA no es válida. Revisa ANTHROPIC_API_KEY.');
  if (code !== 200) throw new Error('La IA respondió con error ' + code + (j.error && j.error.message ? ': ' + j.error.message : '.'));
  if (j.stop_reason === 'refusal') throw new Error('La IA no respondió esta pregunta. Reformúlala enfocada en los indicadores.');
  var texto = (j.content || []).filter(function (c) { return c.type === 'text'; }).map(function (c) { return c.text; }).join('\n').trim();
  if (!texto) throw new Error('La IA no devolvió texto.');
  if (!d.interno) auditar_(s, 'CONSULTA IA', '', '', pregunta.slice(0, 200));
  return { texto: texto, truncado: j.stop_reason === 'max_tokens' };
}
