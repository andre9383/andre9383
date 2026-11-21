"""Traduce al español los significados de los kanji y sus palabras de ejemplo con Gemini.
Uso: GEMINI_KEY=... python3 -I translate_es.py jp_raw.json es_cache.json
El resultado se guarda incrementalmente en es_cache.json (se puede reanudar).
"""
import json, os, sys, time, urllib.request, urllib.error

RAW, CACHE = sys.argv[1], sys.argv[2]
KEY = os.environ['GEMINI_KEY']
MODELS = ['gemini-flash-lite-latest', 'gemini-3.5-flash-lite', 'gemini-flash-latest']
data = json.load(open(RAW, encoding='utf-8'))['kanji']
cache = json.load(open(CACHE, encoding='utf-8')) if os.path.exists(CACHE) else {}

def call(prompt):
    body = json.dumps({'contents': [{'role': 'user', 'parts': [{'text': prompt}]}],
                       'generationConfig': {'temperature': 0.2, 'responseMimeType': 'application/json'}}).encode()
    for attempt in range(6):
        m = MODELS[attempt % len(MODELS)]
        req = urllib.request.Request('https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent' % m, data=body,
                                     headers={'Content-Type': 'application/json', 'x-goog-api-key': KEY})
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                j = json.load(r)
            txt = ''.join(p.get('text', '') for p in j['candidates'][0]['content']['parts'] if not p.get('thought'))
            return json.loads(txt)
        except Exception as e:
            print('  retry', m, str(e)[:80], flush=True)
            time.sleep(3 + attempt * 3)
    raise RuntimeError('fallo')

todo = [x for x in data if x['k'] not in cache]
B = 40
import threading
from concurrent.futures import ThreadPoolExecutor
lock = threading.Lock()

def work(batch):
    items = [{'k': x['k'], 'en': x['en'], 'w': [[w[0], w[1], w[2]] for w in x['words']]} for x in batch]
    prompt = ('Eres lexicógrafo japonés‑español. Para cada kanji da su significado principal en español (1‑4 palabras, separadas por coma) '
              'y, para cada palabra de ejemplo (w = [escritura, [lecturas posibles], glosa inglesa]), elige la lectura más común en el japonés actual '
              '(una de las posibles, en hiragana) y da su traducción breve al español (1‑4 palabras, sentido más común). '
              'Devuelve SOLO JSON: {"<kanji>": {"m": "significado", "w": [["lectura", "traducción"], ...]}} con una entrada en "w" por palabra, en el mismo orden.\n'
              + json.dumps(items, ensure_ascii=False))
    try:
        res = call(prompt)
    except Exception as e:
        print('batch fallo', e, flush=True); return
    with lock:
        for x in batch:
            r = res.get(x['k']) if isinstance(res, dict) else None
            if r and isinstance(r.get('m'), str):
                cache[x['k']] = r
        json.dump(cache, open(CACHE, 'w', encoding='utf-8'), ensure_ascii=False)
        print('ok', len(cache), '/', len(data), flush=True)

with ThreadPoolExecutor(5) as ex:
    list(ex.map(work, [todo[i:i + B] for i in range(0, len(todo), B)]))
print('listo', len(cache))
