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

## Compilar
```bash
sudo apt-get install android-sdk-platform-23 aapt apksigner zipalign dalvik-exchange openjdk-17-jdk
GEMINI_KEY="tu_clave" PATH=$PATH:/usr/lib/android-sdk/build-tools/debian ./build.sh
# → build/TriLingo.apk
```
La clave es opcional al compilar: también se puede pegar en **Más → Ajustes** dentro de la app. Nunca subas `local.key` ni un APK con clave a un repositorio público.

Estructura: `src/` (actividad Java con WebView + puente de voz y Gemini), `assets/` (interfaz HTML/JS y contenido en `assets/data/`).
