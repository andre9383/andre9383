# Crea el acceso directo "Asistente Zajuna" en el Escritorio y en el menu Inicio.
# Abre la ventana del programa (gui.py) sin consola negra.
# (Solo caracteres ASCII: PowerShell 5.1 lee mal las tildes sin BOM.)
$ErrorActionPreference = 'Continue'
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Quita el bloqueo "archivo descargado de internet" de todos los archivos de la carpeta
Get-ChildItem -LiteralPath $dir -Recurse -File -ErrorAction SilentlyContinue | Unblock-File -ErrorAction SilentlyContinue

$ws = New-Object -ComObject WScript.Shell
$destinos = @(
    [Environment]::GetFolderPath('Desktop'),
    (Join-Path ([Environment]::GetFolderPath('StartMenu')) 'Programs')
)
$pythonw = Join-Path $dir '.venv\Scripts\pythonw.exe'
$gui = Join-Path $dir 'gui.py'
$bat = Join-Path $dir 'Asistente Zajuna.bat'
$creados = 0
foreach ($d in $destinos) {
    if (-not (Test-Path -LiteralPath $d)) { continue }
    # Quita el acceso directo viejo de "solo actividades" (ahora esta dentro de la ventana)
    Remove-Item -LiteralPath (Join-Path $d 'Asistente Zajuna - solo actividades.lnk') -ErrorAction SilentlyContinue
    try {
        $l = $ws.CreateShortcut((Join-Path $d 'Asistente Zajuna.lnk'))
        if ((Test-Path -LiteralPath $pythonw) -and (Test-Path -LiteralPath $gui)) {
            $l.TargetPath = $pythonw
            $l.Arguments = '"' + $gui + '"'
        } else {
            $l.TargetPath = $bat
        }
        $l.WorkingDirectory = $dir
        $l.IconLocation = "$env:SystemRoot\System32\shell32.dll,13"
        $l.Description = 'Asistente Zajuna - SENA'
        $l.Save()
        Write-Host ("  Acceso directo creado: " + (Join-Path $d 'Asistente Zajuna.lnk'))
        $creados++
    } catch {
        Write-Host ("  No se pudo crear en " + $d + ": " + $_.Exception.Message)
    }
}
if ($creados -eq 0) {
    Write-Host "  No se pudieron crear accesos directos. Abre 'Asistente Zajuna.bat' directamente desde la carpeta."
}
