"""Genera assets/data/jp/*.js a partir de jp_raw.json (extract_japanese.py) y es_cache.json (translate_es.py).
Uso: python3 -I build_jp_assets.py jp_raw.json es_cache.json <carpeta assets/data/jp>
"""
import json, os, re, sys

RAW, ES, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
raw = json.load(open(RAW, encoding='utf-8'))
es = json.load(open(ES, encoding='utf-8')) if os.path.exists(ES) else {}
os.makedirs(OUT, exist_ok=True)

# Número oficial de trazos de los kana. Los datos de origen dividen algunas curvas en varios trazos.
HIRA_N = dict(zip('あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん',
                  [3,2,2,2,3,3,4,1,3,2,3,1,2,3,1,4,2,1,1,2,4,3,2,2,1,3,1,4,1,4,3,2,3,2,3,3,2,2,2,2,1,2,1,2,3,1]))
KATA_N = dict(zip('アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン',
                  [2,2,3,3,3,2,3,2,3,2,3,3,2,2,2,3,3,3,3,2,2,2,2,4,1,2,2,1,1,4,2,3,2,2,3,2,2,3,2,2,2,1,3,2,3,2]))
SMALL = dict(zip('ぁぃぅぇぉゃゅょっゎァィゥェォャュョッヮ', 'あいうえおやゆよつわアイウエオヤユヨツワ'))
DAKU = {}
for a, b in zip('がぎぐげござじずぜぞだぢづでどばびぶべぼガギグゲゴザジズゼゾダヂヅデドバビブベボゔヴ',
                'かきくけこさしすせそたちつてとはひふへほカキクケコサシスセソタチツテトハヒフヘホうウ'):
    DAKU[a] = (b, 2)
for a, b in zip('ぱぴぷぺぽパピプペポ', 'はひふへほハヒフヘホ'):
    DAKU[a] = (b, 1)

def official(ch):
    if ch in HIRA_N: return HIRA_N[ch]
    if ch in KATA_N: return KATA_N[ch]
    if ch in SMALL: return official(SMALL[ch])
    if ch in DAKU:
        b = official(DAKU[ch][0]); return b + DAKU[ch][1] if b else None
    if ch == 'ー': return 1
    return None

# Uniones verificadas a mano (trazo inicial 1‑based, cuántos trazos se funden en uno) según el orden oficial.
MERGE = {'あ': (3, 2), 'お': (2, 2), 'す': (2, 2), 'な': (4, 2), 'ぬ': (2, 3), 'ね': (2, 2), 'の': (1, 2), 'は': (3, 2),
         'ほ': (4, 2), 'ま': (3, 2), 'み': (1, 2), 'む': (2, 2), 'め': (2, 2), 'よ': (2, 2), 'る': (1, 2)}

def base_of(ch):
    if ch in SMALL: return base_of(SMALL[ch])
    if ch in DAKU: return DAKU[ch][0]
    return ch

def fix_kana(ch, med):
    target = official(ch)
    b = base_of(ch)
    if target and len(med) > target and b in MERGE:
        s, n = MERGE[b]
        med = [list(x) for x in med]
        med = med[:s - 1] + [[p for x in med[s - 1:s - 1 + n] for p in x]] + med[s - 1 + n:]
    return fix_count(med, target)

def fix_count(med, target):
    """Une trazos consecutivos (fin de uno ≈ inicio del siguiente) hasta llegar al número oficial."""
    med = [list(s) for s in med]
    while target and len(med) > target:
        best, bi = None, 0
        for i in range(len(med) - 1):
            a, b = med[i][-1], med[i + 1][0]
            d = ((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2) ** .5
            if best is None or d < best:
                best, bi = d, i
        med[bi] = med[bi] + med[bi + 1]
        del med[bi + 1]
    return med

def enc_med(med):
    # trazos como listas planas [x1,y1,x2,y2,...] para ahorrar espacio
    return [[c for p in s for c in p] for s in med]

def dump(name, var, obj):
    with open(os.path.join(OUT, name), 'w', encoding='utf-8') as f:
        f.write('/* Generado por tools/build_jp_assets.py. Datos: KANJIDIC/JMdict (EDRDG, CC BY-SA 4.0) vía kanji-data (MIT); '
                'trazos: Make Me a Hanzi / animCJK vía hanzi-writer-data-jp (Arphic PL / LGPL). Traducción al español: Gemini. */\n')
        f.write(var + json.dumps(obj, ensure_ascii=False, separators=(',', ':')) + ';\n')

counts = {}
for lv in (5, 4, 3, 2, 1):
    rows = []
    for x in sorted(raw['kanji'], key=lambda x: (x['freq'] or 9999, x['strokes'])):
        if x['jlpt'] != lv:
            continue
        t = es.get(x['k'], {})
        wes = t.get('w', [])
        words = []
        for i, w in enumerate(x['words']):
            tr = wes[i] if i < len(wes) else None
            rd = tr[0] if isinstance(tr, list) and tr and tr[0] in w[1] else w[1][0]
            words.append([w[0], rd, (tr[1] if isinstance(tr, list) and len(tr) > 1 and tr[1] else w[2])])
        main = [r for r in x['kun'] if not r.startswith('-') and not r.endswith('-')] or x['kun']
        kun = [re.sub(r'\.(.+)', r'(\1)', r.strip('-')) for r in main]
        rows.append([x['k'], '・'.join(x['on']), '・'.join(dict.fromkeys(kun)), t.get('m') or ', '.join(x['en'][:3]), x['strokes'], x['grade'] or 0,
                     words, enc_med(fix_count(x['med'], x['strokes']))])
    counts[lv] = len(rows)
    dump('kanji-n%d.js' % lv, 'window.JPK=window.JPK||{};JPK[%d]=' % lv, rows)
fixed = {k: fix_kana(k, v) for k, v in raw['kana'].items()}
wrong = [k + str(len(v)) + '/' + str(official(k)) for k, v in fixed.items() if official(k) and len(v) != official(k)]
print('kana corregidos', sum(1 for k, v in raw['kana'].items() if official(k) and len(v) != official(k)), 'aún distintos (menos trazos en origen):', wrong)
dump('kana-strokes.js', 'window.JPSTROKES=Object.assign(window.JPSTROKES||{},', {k: enc_med(v) for k, v in fixed.items()})
# corregir cierre del Object.assign
p = os.path.join(OUT, 'kana-strokes.js'); s = open(p, encoding='utf-8').read().rstrip().rstrip(';') + ');\n'; open(p, 'w', encoding='utf-8').write(s)
dump('index.js', 'window.JPK_COUNTS=', counts)
print('ok', counts, 'traducidos', sum(1 for x in raw['kanji'] if x['k'] in es))
