@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Asistente Zajuna - actividades
if not exist ".venv\instalado.txt" call "%~dp0INSTALAR.bat"
if not exist ".venv\instalado.txt" exit /b 1
echo Se abrira el navegador: INICIA SESION EN ZAJUNA. Solo se revisan actividades, guias y materiales.
".venv\Scripts\python.exe" zajuna_transcriptor.py --solo-actividades %*
start "" "%~dp0salida"
pause
