@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Instalando Asistente Zajuna
echo ==========================================================
echo   Asistente Zajuna - Instalacion (solo se hace una vez)
echo ==========================================================
echo.

rem ---------- 0. Quitar el bloqueo de "archivo de internet" ----------
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-ChildItem -LiteralPath '%~dp0.' -Recurse -File | Unblock-File" >nul 2>nul

rem ---------- 1. Buscar Python 3.10 o superior ----------
set "PY="
for %%P in ("%LocalAppData%\Programs\Python\Python313\python.exe" "%LocalAppData%\Programs\Python\Python312\python.exe" "%LocalAppData%\Programs\Python\Python311\python.exe" "%LocalAppData%\Programs\Python\Python310\python.exe") do (
  if not defined PY if exist %%P set "PY=%%~P"
)
if not defined PY (
  py -3 -c "import sys; exit(0 if sys.version_info>=(3,10) else 1)" >nul 2>nul && set "PY=py -3"
)
if not defined PY (
  python -c "import sys; exit(0 if sys.version_info>=(3,10) else 1)" >nul 2>nul && set "PY=python"
)

if not defined PY (
  echo [1/4] No encontre Python. Lo descargo e instalo ^(unos minutos^)...
  powershell -NoProfile -ExecutionPolicy Bypass -Command "$ProgressPreference='SilentlyContinue'; Invoke-WebRequest -Uri 'https://www.python.org/ftp/python/3.12.8/python-3.12.8-amd64.exe' -OutFile '%TEMP%\python-instalador.exe'"
  if not exist "%TEMP%\python-instalador.exe" (
    echo.
    echo No se pudo descargar Python. Revisa tu internet o instalalo a mano desde
    echo https://www.python.org/downloads/  ^(marca "Add python.exe to PATH"^) y vuelve a abrir este archivo.
    pause
    exit /b 1
  )
  "%TEMP%\python-instalador.exe" /quiet InstallAllUsers=0 PrependPath=1 Include_launcher=1 Include_test=0
  set "PY=%LocalAppData%\Programs\Python\Python312\python.exe"
)
if not "%PY%"=="py -3" if not "%PY%"=="python" if not exist "%PY%" (
  echo No se pudo instalar Python automaticamente. Instalalo desde https://www.python.org/downloads/
  pause
  exit /b 1
)
echo [1/4] Python listo.

rem ---------- 2. Entorno propio de la aplicacion ----------
if not exist ".venv\Scripts\python.exe" (
  echo [2/4] Creando el entorno de la aplicacion...
  if "%PY%"=="py -3" (py -3 -m venv .venv) else if "%PY%"=="python" (python -m venv .venv) else ("%PY%" -m venv .venv)
)
if not exist ".venv\Scripts\python.exe" (
  echo No se pudo crear el entorno. Toma una foto de esta ventana y enviala.
  pause
  exit /b 1
)
echo [2/4] Entorno listo.

rem ---------- 3. Librerias y navegador ----------
echo [3/4] Instalando librerias y navegador ^(5 a 10 minutos la primera vez^)...
".venv\Scripts\python.exe" -m pip install --upgrade pip >nul
".venv\Scripts\python.exe" -m pip install -r requirements.txt
if errorlevel 1 (
  echo Fallo la instalacion de librerias. Toma una foto de esta ventana y enviala.
  pause
  exit /b 1
)
".venv\Scripts\python.exe" -m playwright install chromium
if errorlevel 1 (
  echo Fallo la instalacion del navegador. Toma una foto de esta ventana y enviala.
  pause
  exit /b 1
)
echo ok> ".venv\instalado.txt"
echo [3/4] Librerias listas.

rem ---------- 4. Accesos directos en el escritorio y menu Inicio ----------
echo [4/4] Creando accesos directos...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0crear_accesos.ps1"

echo.
echo ==========================================================
echo   LISTO. Abre "Asistente Zajuna" desde el escritorio o el menu Inicio.
echo   Si no aparece, abre "Asistente Zajuna.bat" en esta carpeta.
echo ==========================================================
pause
