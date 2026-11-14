# Pruebas

Simulador de Apps Script en Node para probar el código sin tocar la hoja real. Los datos son inventados, con la misma estructura de la hoja.

```bash
node prueba.js ../apps-script          # 73 pruebas del servidor
N=2800 node prueba.js ../apps-script   # mismo volumen que la hoja real
node ui.js ../apps-script ./capturas   # recorrido de la interfaz (requiere playwright, chart.js y xlsx)
```
