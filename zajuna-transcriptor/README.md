# Zajuna Transcriptor 🎓🎥➜📝

Programa para aprendices del SENA que **no quieren ver completas las sesiones grabadas**.
Abre Zajuna en un navegador y, **apenas inicias sesión**, hace lo siguiente:

1. Recorre todos tus cursos y encuentra las sesiones grabadas: enlaces de Google Drive,
   grabaciones de Teams/SharePoint, YouTube/Vimeo, videos subidos a Zajuna, y enlaces
   dentro de avisos y foros.
2. Descarga las grabaciones **nuevas**. Las que ya procesó no se repiten.
3. Las **transcribe** en tu computador con Whisper. El audio no sale de tu equipo.
4. Con Claude genera para cada sesión:
   - **Resumen**
   - **Puntos clave** con el minuto donde se dicen
   - **Evidencias que pide el instructor**: qué entregar, formato, contenido obligatorio,
     criterios de evaluación, fecha y forma de entrega
   - Fechas y compromisos, y dudas para preguntar al instructor
5. Arma `salida/INDICE.md` con todas las sesiones y **una sola lista de todas las evidencias pedidas**.
6. **Revisa las actividades (tareas) de Zajuna:** lee las instrucciones, la fecha de entrega, si ya la
   entregaste, la calificación y la retroalimentación, y descarga las guías adjuntas.
7. Para cada evidencia **pendiente o devuelta** arma un **BORRADOR en Word** que tú corriges y
   modificas antes de entregar. Para escribirlo usa:
   - las instrucciones de la actividad y la guía,
   - lo que dijo el instructor en las clases transcritas,
   - la retroalimentación del instructor, si fue devuelta,
   - los datos de **tu proyecto** (`mi_proyecto.md`).

   Además lee los **materiales de formación** del curso, **investiga en la web** fuentes reales
   (citadas en APA con su enlace) y hace una **segunda pasada de evaluación**: revisa el borrador
   criterio por criterio contra la guía y lo que pidió el instructor, y lo corrige.

   Cada borrador trae una **lista de verificación** con los requisitos y marca con `[COMPLETAR]` y
   `[FUENTE]` lo que debes poner tú. No inventa datos ni referencias.
   Todo queda resumido en `salida/ACTIVIDADES.md`.

> 📱 **No funciona en el celular.** Transcribir requiere un computador con Windows, Mac o Linux.
> Los resultados quedan en archivos de texto que sí puedes leer en el celular, por ejemplo
> si la carpeta `salida` está en Google Drive.

---

## Instalación (una sola vez)

1. Instala **Python 3.10 o superior**: <https://www.python.org/downloads/>
   En Windows, marca la casilla **"Add python.exe to PATH"**.
2. Descarga esta carpeta (`zajuna-transcriptor`) en tu computador.
3. *(Opcional, recomendado)* Para los resúmenes automáticos, crea una clave de la API de Claude en
   <https://console.anthropic.com/> y pégala sola en un archivo llamado `clave_api.txt` dentro de esta
   carpeta. **Sin clave también funciona**: transcribe y deja un archivo `… - pegar_en_claude.txt`
   que copias y pegas en la app de Claude para obtener el mismo resumen.

### Tu proyecto formativo (recomendado)

Copia `mi_proyecto.ejemplo.md` como **`mi_proyecto.md`** y llénalo con tu empresa, proceso, proveedores,
problemas y propuestas. Así los borradores hablan de tu caso y no de ejemplos genéricos.

## Uso

- **Windows:** doble clic en **`INSTALAR.bat`** (una vez: instala Python si falta, las librerías, el
  navegador y crea accesos directos en el escritorio). Después usa **"Asistente Zajuna"** del escritorio.
  También funciona `iniciar.bat` desde una terminal para pasar opciones.
- **Mac / Linux:** `./iniciar.sh` en la terminal

La primera vez instala lo necesario y tarda unos minutos. Después:

1. Se abre una ventana del navegador en Zajuna. **Inicia sesión normalmente.**
2. Apenas detecta el ingreso, empieza a buscar y procesar las grabaciones solo.
3. Si alguna grabación está en Google Drive o en Teams y te pide iniciar sesión con tu cuenta de Google
   o la de `@soy.sena.edu.co`, hazlo en esa misma ventana. Queda guardado para las próximas veces.
4. Al terminar, abre **`salida/INDICE.md`**.

La sesión del navegador queda guardada en `perfil_navegador/`, así que normalmente
no tendrás que volver a escribir la contraseña. El programa **nunca guarda ni lee tu contraseña**.

### Opciones útiles

| Comando | Qué hace |
|---|---|
| `iniciar.bat --solo-listar` | Solo muestra qué grabaciones encontró, sin descargar nada |
| `iniciar.bat --curso "logísticos"` | Procesa solo los cursos cuyo nombre contiene ese texto |
| `iniciar.bat --max 3` | Procesa como máximo 3 grabaciones nuevas en esta ejecución |
| `iniciar.bat --modelo-whisper medium` | Transcripción más precisa pero más lenta (`tiny`, `base`, `small` *por defecto*, `medium`, `large-v3`) |
| `iniciar.bat --conservar-videos` | No borra los videos después de transcribirlos |
| `iniciar.bat --desde 01/10/2026` | Solo grabaciones cuyo título tenga fecha desde ese día (Zajuna pone la fecha en el título) |
| `iniciar.bat --excluir ingles` | Omite las grabaciones cuyo título contenga esas palabras (separadas por coma) |
| `iniciar.bat --solo-actividades` | Solo revisa actividades y arma borradores (sin grabaciones) |
| `iniciar.bat --solo-grabaciones` | Solo grabaciones, sin revisar actividades |
| `iniciar.bat --rehacer-borradores` | Vuelve a armar los borradores (por ejemplo, después de llenar `mi_proyecto.md`) |
| `iniciar.bat --borradores-todas` | Arma borradores también de las actividades ya entregadas |
| `iniciar.bat --sin-navegador` | No abre Zajuna; solo procesa `videos_manuales/` y `enlaces.txt` |

### Grabaciones que no están en Zajuna

Muchos instructores comparten la grabación por correo o por Drive:

- Si ya la descargaste, ponla en la carpeta **`videos_manuales/`**.
- Si tienes el enlace, copia `enlaces.ejemplo.txt` como **`enlaces.txt`** y pega un enlace por línea.

## Qué tan rápido es

Con el modelo `small` en un portátil normal, **una clase de 1 hora tarda entre 10 y 25 minutos** en
transcribirse. Puedes dejarlo trabajando y volver luego. Si lo cierras, continúa donde iba la
próxima vez que lo abras.

## Limitaciones conocidas

- **Teams/SharePoint:** solo descarga si el instructor permitió descargar la grabación y entraste con tu
  cuenta `@soy.sena.edu.co` en la ventana del programa. Si no se puede, queda en el índice como
  `error_descarga`. En ese caso descárgala a mano y ponla en `videos_manuales/`.
- **BigBlueButton, Zoom y carpetas de Drive** no se descargan solas. Quedan listadas en el índice para
  abrirlas a mano.
- Las sesiones de **inglés** se transcriben detectando el idioma automáticamente.
- Los **cuestionarios** aparecen en `ACTIVIDADES.md` para que no se te pasen, pero se resuelven
  directamente en Zajuna (no se arma borrador).
- La transcripción automática puede tener errores con nombres propios o códigos. El resumen intenta
  corregirlos y marca lo que no es claro en **"Pendiente por aclarar"**.
- **Los borradores son un punto de partida, no un trabajo para copiar y entregar.** Revísalos,
  escríbelos con tus palabras y completa los datos reales. El SENA evalúa tu aprendizaje y puede
  detectar textos que no son tuyos.
- **El resumen no reemplaza la guía de aprendizaje.** Revisa siempre la guía oficial y el cronograma en Zajuna.

## Privacidad

- `perfil_navegador/` contiene tu sesión iniciada. **No lo compartas.**
- `clave_api.txt` es tu clave de API. **No la compartas.**
- `mi_proyecto.md` tiene datos de tu empresa. Está excluido de GitHub.
- Los videos se transcriben en tu computador. Solo el **texto** de la transcripción se envía a Claude,
  y solo si configuraste la clave.
- `.gitignore` excluye todo lo anterior y la carpeta `salida/` para que nunca se suba a GitHub.
