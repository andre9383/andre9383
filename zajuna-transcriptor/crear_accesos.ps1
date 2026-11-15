# Crea los accesos directos del Asistente Zajuna en el Escritorio y en el menu Inicio.
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
$nombres = @('Asistente Zajuna', 'Asistente Zajuna - solo actividades')
$creados = 0
foreach ($d in $destinos) {
    if (-not (Test-Path -LiteralPath $d)) { continue }
    foreach ($n in $nombres) {
        $bat = Join-Path $dir ($n + '.bat')
        if (-not (Test-Path -LiteralPath $bat)) { continue }
        try {
            $l = $ws.CreateShortcut((Join-Path $d ($n + '.lnk')))
            $l.TargetPath = $bat
            $l.WorkingDirectory = $dir
            $l.IconLocation = "$env:SystemRoot\System32\shell32.dll,13"
            $l.Save()
            Write-Host ("  Acceso directo creado: " + (Join-Path $d ($n + '.lnk')))
            $creados++
        } catch {
            Write-Host ("  No se pudo crear en " + $d + ": " + $_.Exception.Message)
        }
    }
}
if ($creados -eq 0) {
    Write-Host "  No se pudieron crear accesos directos. Abre 'Asistente Zajuna.bat' directamente desde la carpeta."
}
