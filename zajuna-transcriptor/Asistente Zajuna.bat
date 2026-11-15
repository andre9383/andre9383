@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Asistente Zajuna
if not exist ".venv\instalado.txt" call "%~dp0INSTALAR.bat"
if not exist ".venv\instalado.txt" exit /b 1

echo.
echo Se abrira el navegador: INICIA SESION EN ZAJUNA y deja que trabaje.
echo Si quieres solo las grabaciones desde una fecha, escribela (ej: 27/10/2026).
set /p DESDE="Desde que fecha (Enter = todas): "
set "ARGS="
if not "%DESDE%"=="" set "ARGS=--desde %DESDE%"
set /p INGLES="Incluir las sesiones de ingles? (s/n, Enter = no): "
if /i not "%INGLES%"=="s" set "ARGS=%ARGS% --excluir ingles"

".venv\Scripts\python.exe" zajuna_transcriptor.py %ARGS% %*
echo.
echo Resultados en la carpeta "salida":
echo   - ACTIVIDADES.md  (actividades y borradores en Word)
echo   - INDICE.md       (resumenes de las clases)
start "" "%~dp0salida"
pause
