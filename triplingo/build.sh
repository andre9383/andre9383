#!/usr/bin/env bash
# Compila TriLingo sin Android Studio. Requisitos (Ubuntu):
#   apt-get install android-sdk-platform-23 aapt apksigner zipalign dalvik-exchange openjdk-17-jdk
# Uso: GEMINI_KEY="tu_clave" ./build.sh   (la clave es opcional; también se puede poner en Ajustes dentro de la app)
set -euo pipefail
cd "$(dirname "$0")"
ANDROID_JAR=${ANDROID_JAR:-/usr/lib/android-sdk/platforms/android-23/android.jar}
DX=${DX:-/usr/lib/android-sdk/build-tools/debian/dx}
command -v dx >/dev/null && DX=$(command -v dx) || true
[ -x "$DX" ] || DX=$(ls /usr/lib/android-sdk/build-tools/*/dx | head -1)
OUT=build
rm -rf "$OUT"; mkdir -p "$OUT/gen" "$OUT/classes"

KEY=${GEMINI_KEY:-}
[ -z "$KEY" ] && [ -f local.key ] && KEY=$(tr -d '\n\r ' < local.key)
cat > src/com/triplingo/app/BuildKey.java <<JAVA
package com.triplingo.app;
final class BuildKey { static final String KEY = "${KEY}"; }
JAVA

aapt package -f -m -M AndroidManifest.xml -S res -A assets -I "$ANDROID_JAR" -J "$OUT/gen" -F "$OUT/app.unsigned.apk"
javac -nowarn --release 8 -encoding UTF-8 -classpath "$ANDROID_JAR" -d "$OUT/classes" \
  $(find src "$OUT/gen" -name '*.java') 2>&1 | grep -v "warning: \[options\]" || true
[ -f "$OUT/classes/com/triplingo/app/MainActivity.class" ] || { echo "javac falló"; exit 1; }
"$DX" --dex --min-sdk-version=21 --output="$OUT/classes.dex" "$OUT/classes"
(cd "$OUT" && aapt add app.unsigned.apk classes.dex >/dev/null)
zipalign -f 4 "$OUT/app.unsigned.apk" "$OUT/app.aligned.apk"

KS=${KEYSTORE:-triplingo.keystore}
if [ ! -f "$KS" ]; then
  keytool -genkeypair -keystore "$KS" -storepass triplingo -keypass triplingo -alias triplingo \
    -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=TriLingo, O=TriLingo, C=ES" >/dev/null 2>&1
fi
apksigner sign --ks "$KS" --ks-pass pass:triplingo --key-pass pass:triplingo --out "$OUT/TriLingo.apk" "$OUT/app.aligned.apk"
apksigner verify "$OUT/TriLingo.apk" && echo "OK -> $OUT/TriLingo.apk ($(du -h $OUT/TriLingo.apk | cut -f1))"
