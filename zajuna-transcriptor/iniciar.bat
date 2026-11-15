@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Zajuna Transcriptor

set PY=py -3
where py >nul 2>nul || set PY=python
%PY% --version >nul 2>nul || (
  echo No encontre Python. Instala Python 3.10 o superior desde https://www.python.org/downloads/
  echo y marca la casilla "Add python.exe to PATH" durante la instalacion.
  pause
  exit /b 1
)

if not exist .venv (
  echo Creando entorno de Python...
  %PY% -m venv .venv || (pause & exit /b 1)
)
call .venv\Scripts\activate.bat

if not exist .venv\instalado.txt (
  echo Instalando dependencias (solo la primera vez, tarda unos minutos^)...
  python -m pip install --upgrade pip
  pip install -r requirements.txt || (pause & exit /b 1)
  python -m playwright install chromium || (pause & exit /b 1)
  echo ok> .venv\instalado.txt
)

python zajuna_transcriptor.py %*
echo.
echo Resultados en la carpeta "salida". Abre salida\INDICE.md
pause
