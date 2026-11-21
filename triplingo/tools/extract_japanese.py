"""Extrae datos de kanji (N5–N1) y trazos (kana + kanji) para TriLingo.

Fuentes (descargar de npm y descomprimir):
  kanji-data (MIT; datos de KANJIDIC/JMdict © EDRDG, CC BY-SA 4.0)
  @k1low/hanzi-writer-data-jp (Make Me a Hanzi / animCJK; licencias Arphic PL y LGPL)

Uso: python3 -I extract_japanese.py <ruta kanji-data/package> <ruta hanzi-writer-data-jp/package> <salida.json>
"""
import json, os, sys

KD, HW, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
meta = json.load(open(os.path.join(KD, 'data', 'kanji-meta.json'), encoding='utf-8'))
levels = {n: json.load(open(os.path.join(KD, 'data', 'lists', 'jlpt-%d.json' % n), encoding='utf-8')) for n in range(1, 6)}

# índice de palabras por kanji
words = {}
wdir = os.path.join(KD, 'data', 'words')
for f in os.listdir(wdir):
    for k, v in json.load(open(os.path.join(wdir, f), encoding='utf-8')).items():
        words[k] = v

GOOD = {'news1': 3, 'ichi1': 3, 'spec1': 2, 'spec2': 1, 'news2': 1, 'ichi2': 1}

def best_words(k, n=3):
    cands = []
    for w in words.get(k, []):
        gl = [g for m in w.get('meanings', []) for g in m.get('glosses', [])]
        best = {}
        for v in w.get('variants', []):
            wr, pr = v.get('written', ''), v.get('pronounced', '')
            if k not in wr or not pr or len(wr) > 4:
                continue
            score = sum(GOOD.get(p, 0) for p in v.get('priorities', []))
            if score == 0:
                continue
            nf = [int(p[2:]) for p in v.get('priorities', []) if p.startswith('nf')]
            score -= (min(nf) / 50 if nf else 1) + len(wr) * 0.3
            b = best.get(wr)
            if not b or score > b[0]:
                best[wr] = [score, [pr]]
            elif abs(score - b[0]) < 1e-9 and pr not in b[1]:
                b[1].append(pr)
        if best:
            wr, (sc, prs) = max(best.items(), key=lambda kv: kv[1][0])
            cands.append((sc, wr, prs, '; '.join(gl[:2])))
    cands.sort(key=lambda x: -x[0])
    seen, out = set(), []
    for c in cands:
        if c[1] in seen:
            continue
        seen.add(c[1]); out.append([c[1], c[2], c[3]])  # [escritura, [lecturas candidatas], glosa]
        if len(out) >= n:
            break
    return out

def medians(ch):
    p = os.path.join(HW, ch + '.json')
    if not os.path.exists(p):
        return None
    d = json.load(open(p, encoding='utf-8'))
    return [[[int(x), int(y)] for x, y in s] for s in d['medians']]

kanji = []
for lv in (5, 4, 3, 2, 1):
    for k in levels[lv]:
        m = meta.get(k)
        if not m:
            continue
        kanji.append({'k': k, 'jlpt': lv, 'on': m['on_readings'], 'kun': m['kun_readings'], 'en': m['meanings'][:4],
                      'strokes': m['stroke_count'], 'grade': m.get('grade'), 'freq': m.get('freq_mainichi_shinbun'),
                      'words': best_words(k), 'med': medians(k)})
kana = {}
for f in os.listdir(HW):
    if f.endswith('.json') and len(f) == 6:
        ch = f[0]
        if 0x3040 <= ord(ch) <= 0x30ff:
            kana[ch] = medians(ch)
json.dump({'kanji': kanji, 'kana': kana}, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False)
print('kanji', len(kanji), 'sin trazos', sum(1 for x in kanji if not x['med']), 'kana', len(kana),
      'sin palabras', sum(1 for x in kanji if not x['words']))
