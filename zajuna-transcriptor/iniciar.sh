#!/usr/bin/env bash
# Lanzador para macOS y Linux.
set -euo pipefail
cd "$(dirname "$0")"

PY=python3
command -v "$PY" >/dev/null || { echo "Instala Python 3.10 o superior: https://www.python.org/downloads/"; exit 1; }

if [ ! -d .venv ]; then
  echo "Creando entorno de Python..."
  "$PY" -m venv .venv
fi
# shellcheck disable=SC1091
source .venv/bin/activate

if [ ! -f .venv/instalado.txt ]; then
  echo "Instalando dependencias (solo la primera vez, tarda unos minutos)..."
  python -m pip install --upgrade pip
  pip install -r requirements.txt
  python -m playwright install chromium
  echo ok > .venv/instalado.txt
fi

python zajuna_transcriptor.py "$@"
echo
echo 'Resultados en la carpeta "salida". Abre salida/INDICE.md'
