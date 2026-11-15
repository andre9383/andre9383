@echo off
chcp 65001 >nul
cd /d "%~dp0"
if not exist ".venv\instalado.txt" call "%~dp0INSTALAR.bat"
if not exist ".venv\instalado.txt" exit /b 1
start "" ".venv\Scripts\pythonw.exe" "%~dp0gui.py"
