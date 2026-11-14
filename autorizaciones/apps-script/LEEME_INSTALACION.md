# Centro de Autorizaciones · versión 3 · guía de instalación

Esta versión trabaja sobre la misma hoja que ya tienes (`SEGUIMIENTO AUTORIZACIONES COMPLETO OK`).
No borra datos: crea las hojas que faltan y agrega columnas **al final** de las existentes.

## Antes de empezar (5 minutos)

1. **Cierra el enlace público de la hoja.** En la hoja: *Compartir → Acceso general → Restringido*.
   Hoy está abierta a "cualquier persona con el enlace" y tiene datos de pacientes.
2. **Prueba primero en una copia.** *Archivo → Hacer una copia*. Instala todo en la copia, revísalo y
   cuando funcione haz lo mismo en la original (o empieza a usar la copia).

## Archivos (20)

| Tipo | Nombre exacto en el editor | Qué contiene |
|---|---|---|
| Script | `00_Config` | Hojas, columnas, roles, permisos, parámetros y códigos por defecto |
| Script | `01_Util` | Fechas, números ("1.234.567,89" → número), textos, auditoría |
| Script | `02_Hojas` | Lectura y escritura por nombre de encabezado |
| Script | `03_Seguridad` | Contraseñas, sesiones, bloqueo por intentos, permisos |
| Script | `04_Api` | Página web y punto de entrada único |
| Script | `10_Catalogos` | ERP › contrato, áreas › ala, códigos de RESPONSABLE, parámetros |
| Script | `11_Ingresos` | Análisis de cada ingreso (situación, días, hallazgos) |
| Script | `12_Carga` | Carga del Excel, cambios entre cargas, casos especiales |
| Script | `13_Autorizaciones` | Bandeja, trámites, bitácora, CUPS |
| Script | `14_Casos` | Gestor, compromiso, documentos, gestiones, cierre con soporte |
| Script | `15_Alertas` | Alertas por usuario y correo diario |
| Script | `16_Informes` | Reporte Excel e informe gerencial PDF/Word |
| Script | `17_IA` | Asistente IA (solo datos agregados) |
| Script | `18_Admin` | Usuarios, permisos, parámetros, catálogos |
| Script | `19_Menu` | Menú de la hoja e instalación |
| HTML | `Index` | Estructura de la página |
| HTML | `Estilos` | Diseño |
| HTML | `Componentes` | Listas desplegables, tablas, gráficos |
| HTML | `App` | Acceso, menú y navegación |
| HTML | `Vistas` | Pantallas de cada módulo |
| Manifiesto | `appsscript.json` | Zona horaria, permisos y publicación |

## Instalación paso a paso

1. En la copia de la hoja: *Extensiones → Apps Script*.
2. **Borra los archivos de la versión anterior** (Code, Analitica, Informe, Seguridad, Index, Dashboard, Acceso, Registro…).
   Si quedan, chocan con los nombres nuevos y el proyecto no guarda.
3. Crea cada archivo con el **nombre exacto** de la tabla (botón **+** → *Secuencia de comandos* o *HTML*;
   el editor agrega `.gs` o `.html` solo) y pega su contenido. Usa los archivos de este paquete, no versiones ofuscadas.
4. *Configuración del proyecto* (engranaje) → marca *Mostrar el archivo de manifiesto "appsscript.json"* →
   vuelve al editor, abre `appsscript.json` y reemplaza su contenido.
5. Guarda (Ctrl+S). Si no guarda, el editor marca en rojo la línea con el problema.
6. En la lista de funciones elige **`inicializarSistema`** y pulsa *Ejecutar*. Acepta los permisos que pide Google.
   En el *Registro de ejecución* aparece el **código de administrador inicial** (vale 24 horas).
7. *Implementar → Nueva implementación → Aplicación web*:
   *Ejecutar como*: **yo**; *Quién tiene acceso*: **Cualquier persona**. Copia la URL.
   (El acceso lo controla la plataforma con usuario y contraseña.)
8. Abre la URL → *Crear cuenta* → escribe tu documento, datos y contraseña → despliega
   *Soy el administrador inicial* y pega el código. Si tu documento ya existe en USUARIOS, esto le asigna la nueva contraseña.
9. Entra con tu documento o correo.

## Después de entrar

- **Usuarios de la versión anterior**: sus contraseñas no son compatibles. En *Administración › Usuarios*
  pulsa *Restablecer clave* y entrega la temporal; al entrar, cada persona la cambia.
  Los roles antiguos se reconocen solos: OPERADOR → Autorizador, RESPONSABLE_AREA → Coordinador de área.
- **Catálogos** (*Administración › Catálogos*): revisa ERP › contrato y áreas › ala. Lo que corrijas queda
  marcado como revisado y las cargas siguientes lo respetan.
- **Casos cerrados automáticamente**: en la hoja, menú *Centro de Autorizaciones → Reabrir casos cerrados
  automáticamente*. Los 140 "CERRADO EN DINÁMICA" sin soporte pasan a *Salió sin cierre* para que el gestor los cierre.
  (Aunque no lo ejecutes, la plataforma ya los muestra así.)
- **Alertas por correo**: menú *Instalar alertas diarias por correo* (7:00 a. m.).
- **Asistente IA** (opcional): *Configuración del proyecto → Propiedades del script* → agrega
  `ANTHROPIC_API_KEY` con tu clave. Solo recibe indicadores agregados, nunca nombres ni documentos.
- **Cada cambio de código**: *Implementar → Administrar implementaciones → Editar → Nueva versión*.

## Qué cambió respecto a la versión anterior

- **Menú en tres grupos**: Operación (Autorizaciones, Ingresos abiertos, Casos especiales),
  Análisis (Medición, Informes) y Configuración (Cargue de datos, Administración).
  Cada menú se despliega por secciones: trabajo diario → análisis → control, con contadores.
- **Listas desplegables nuevas** en todos los filtros: buscador, selección múltiple, número de registros por opción,
  opciones que dependen de los demás filtros (al elegir un área, *Ala* solo muestra las de esa área) y
  contratos agrupados bajo su ERP. Los filtros activos se ven como etiquetas que se quitan con una ✕.
  La plataforma recuerda tus filtros por pantalla.
- **Veracidad**: lee los códigos de RESPONSABLE (`AUTO.PEND`, `AUT.PEMD`, `PEND.AUTO`, `AUTO.PEN`…) como
  autorizaciones pendientes; unifica las variantes de ENTIDAD; infiere el área vacía desde INGRESO POR;
  mide el tiempo desde la solicitud; versiona las reglas para no mezclar series históricas.
- **Casos especiales**: ya no se cierran solos. Si el ingreso sale de abiertos quedan *Salió sin cierre* y alertan al gestor.
- **Se conservan** todos los análisis anteriores (dashboard, ingresos abiertos, informes, IA).

## Límites conocidos

- Probado con un simulador de Apps Script y un navegador automatizado (73 pruebas del servidor y el recorrido completo de la interfaz).
  La primera ejecución en tu Apps Script real es la prueba que falta.
- Los gráficos y el lector de Excel necesitan internet en el navegador.
- Con más de ~10.000 ingresos abiertos la carga inicial de la página se vuelve lenta; hoy tienes ~2.800.
