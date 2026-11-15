@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Creando accesos directos en el Escritorio y en el menu Inicio...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0crear_accesos.ps1"
echo.
pause
