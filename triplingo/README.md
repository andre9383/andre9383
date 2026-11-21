# TriLingo 🇬🇧🇧🇷🇯🇵

App Android para aprender **inglés, portugués (Brasil) y japonés** en un plan de 6 meses (24 semanas, A1 → C1), con teoría, práctica, voz e IA (Gemini).

## Funciones
- **Plan 3×** diario: Aprende → Practica → Usa, con 1 unidad por semana por idioma.
- **72 unidades** (24 por idioma): teoría, vocabulario, ejemplos y quiz final (80% para avanzar o saltar unidades).
- **Ejercicios interactivos**: opción múltiple, escucha, ordenar frases, escritura y pronunciación con puntuación.
- **Repetición espaciada** (SM-2) que mezcla los tres idiomas.
- **Voz**: síntesis (TTS) y reconocimiento de voz nativos de Android; laboratorio de *shadowing*.
- **IA (Gemini)**: conversaciones de rol con corrección, tutor, explicaciones ampliadas, ejercicios infinitos, técnica Feynman, corrección de textos y lecturas graduadas.
- Entrenador de **hiragana/katakana**, modo enfoque (Pomodoro), estadísticas y racha.

### Novedades 2.0
- **7 niveles** por idioma: Básico (pre‑A1), A1, A2, B1, B2, C1 y C2 (32 unidades), ruta visual y **test de nivel**.
- **Escritura japonesa**: lienzo para dibujar hiragana, katakana y 102 kanji con guía, evaluación automática, conteo de trazos y orden de trazos animado ([KanjiVG](https://kanjivg.tagaini.net/), CC BY‑SA 3.0, se descarga con internet). Teclado romaji→kana integrado.
- **Kanji**: tabla N5 con lecturas on/kun, ejemplos, audio, quiz y repaso.
- **Canciones** tradicionales de dominio público con subtítulos, karaoke, completar letra, cantar con evaluación; pegar la letra de tus canciones o crear canciones con IA.
- **Libros**: fragmentos de clásicos de dominio público (Carroll, Austen, Machado de Assis, Sōseki, Akutagawa, Miyazawa) y cuentos graduados, con lector interactivo.
- **Modo niños** (niveles 1 y 2): 12 unidades con imágenes, juegos de "¿Dónde está?", parejas y repetir en voz alta, y estrellas.
### Novedades 2.4 — Métodos de los mejores canales de YouTube
Investigados en las charlas y vídeos más vistos (Chris Lonsdale · TEDx, Lýdia Machová · TED, Sid Efromovich · TEDx, Trenton, Joseph Everett) y aplicados como rutinas:
- **Inmersión**: canales verificados por idioma y nivel, registro de minutos y horas de input con hitos.
- **Minado de frases** desde libros, canciones y chats directo al repaso espaciado.
- **Entrena el oído** con pares mínimos; **shadowing 3×** (lento/normal/rápido).
- **Habla contigo**: monólogo de 1 minuto con transcripción y feedback de la IA.
- **Núcleo de 50 palabras + caja de herramientas** por idioma.
- **Modo padre lingüístico** en el chat: la IA reformula en vez de corregir.
- **Escuchar a ciegas** en libros (tolerar la ambigüedad).

### Novedades 2.2 — Escritura japonesa completa
- **Hiragana y katakana completos** (15 lecciones cada uno): básicos, dakuten/handakuten, combinados (yōon), っ/ッ pequeña, vocales largas y katakana extendido.
- **2.211 kanji del JLPT (N5→N1)** en lecciones de 10, ordenados por frecuencia, con lecturas on/kun, significado en español y 3 palabras de ejemplo.
- Cada lección: aprender (orden de trazos animado) → escribir **trazo a trazo** (detecta orden y dirección) → quiz → escribir de memoria. Todo sin conexión.
- Datos regenerables con `tools/extract_japanese.py`, `tools/translate_es.py` y `tools/build_jp_assets.py` (créditos en `assets/licenses/CREDITS.txt`).
- Nuevos ejercicios: parejas, dictado y completar huecos; **cuaderno de errores**; efectos de sonido; tamaño de letra ajustable.

## Compilar
```bash
sudo apt-get install android-sdk-platform-23 aapt apksigner zipalign dalvik-exchange openjdk-17-jdk
GEMINI_KEY="tu_clave" PATH=$PATH:/usr/lib/android-sdk/build-tools/debian ./build.sh
# → build/TriLingo.apk
```
La clave es opcional al compilar: también se puede pegar en **Más → Ajustes** dentro de la app. Nunca subas `local.key` ni un APK con clave a un repositorio público.

Estructura: `src/` (actividad Java con WebView + puente de voz y Gemini), `assets/` (interfaz HTML/JS y contenido en `assets/data/`).
