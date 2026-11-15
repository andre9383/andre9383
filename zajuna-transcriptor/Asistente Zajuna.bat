@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Asistente Zajuna (no cierres esta ventana mientras uses el programa)
if not exist ".venv\instalado.txt" call "%~dp0INSTALAR.bat"
if not exist ".venv\instalado.txt" exit /b 1
echo Abriendo la ventana del Asistente Zajuna...
".venv\Scripts\python.exe" "%~dp0gui.py"
if errorlevel 1 (
  echo.
  echo ============================================================
  echo  La ventana del programa no pudo abrir. Este es el error:
  echo ============================================================
  if exist "error_ventana.txt" type "error_ventana.txt"
  echo.
  echo Toma una foto de esta ventana y enviala para corregirlo.
  pause
)
