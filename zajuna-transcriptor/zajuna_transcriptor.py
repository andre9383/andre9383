#!/usr/bin/env python3
"""
Zajuna Transcriptor
===================

Abre un navegador, espera a que inicies sesión en Zajuna (SENA) y luego:

1. Recorre tus cursos y busca las sesiones grabadas (Google Drive, Teams/SharePoint,
   YouTube/Vimeo, videos subidos a Zajuna, enlaces dentro de avisos y foros).
2. Descarga cada grabación nueva.
3. La transcribe en tu computador con Whisper (faster-whisper).
4. Con la API de Claude genera: resumen, puntos clave y cómo pide el instructor
   cada evidencia (qué entregar, formato, criterios y fechas).

Lo ya procesado se guarda en salida/estado.json para no repetirlo.

Uso rápido:
    python zajuna_transcriptor.py                  # flujo completo
    python zajuna_transcriptor.py --solo-listar    # solo muestra las grabaciones encontradas
    python zajuna_transcriptor.py --sin-navegador  # solo procesa videos_manuales/ y enlaces.txt
"""

from __future__ import annotations

import argparse
import datetime as dt
import glob
import json
import os
import re
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path
from urllib.parse import parse_qs, urljoin, urlparse

RAIZ = Path(__file__).resolve().parent
URL_INICIO = os.environ.get("ZAJUNA_URL", "https://zajuna.sena.edu.co/")
EXT_MEDIA = (".mp4", ".m4a", ".mp3", ".webm", ".mkv", ".mov", ".wav", ".ogg", ".avi", ".m4v")
PALABRAS_SESION = (
    "grabaci", "sesi", "encuentro", "clase", "video", "reuni", "webinar",
    "sincr", "tutor", "asesor", "explicaci", "evidencia", "inducci",
)
# Páginas de Moodle/Zajuna que vale la pena abrir buscando enlaces a grabaciones.
MODULOS_A_EXPLORAR = (
    "/mod/url/view.php", "/mod/page/view.php", "/mod/forum/view.php",
    "/mod/forum/discuss.php", "/mod/book/view.php", "/mod/label/view.php",
    "/mod/resource/view.php", "/mod/folder/view.php", "/mod/lesson/view.php",
    "/mod/assign/view.php",
)


# --------------------------------------------------------------------------- #
# Utilidades
# --------------------------------------------------------------------------- #
def log(msg: str) -> None:
    print(f"[{dt.datetime.now():%H:%M:%S}] {msg}", flush=True)


def nombre_seguro(texto: str, max_len: int = 90) -> str:
    texto = re.sub(r"[\\/:*?\"<>|\r\n\t]+", " ", texto).strip()
    texto = re.sub(r"\s+", " ", texto)
    return (texto[:max_len].rstrip(" .") or "sin_titulo")


def hhmmss(segundos: float) -> str:
    s = int(segundos)
    return f"{s // 3600:02d}:{s % 3600 // 60:02d}:{s % 60:02d}"


@dataclass
class Grabacion:
    url: str
    titulo: str
    curso: str
    tipo: str  # drive | sharepoint | youtube | directo | moodle | carpeta_drive | bbb | otro
    origen: str = ""  # página donde se encontró

    def clave(self) -> str:
        if self.tipo == "drive":
            fid = id_drive(self.url)
            if fid:
                return f"drive:{fid}"
        return self.url.split("#")[0]


@dataclass
class Estado:
    ruta: Path
    datos: dict = field(default_factory=dict)

    @classmethod
    def cargar(cls, ruta: Path) -> "Estado":
        if ruta.exists():
            try:
                return cls(ruta, json.loads(ruta.read_text(encoding="utf-8")))
            except json.JSONDecodeError:
                log(f"Aviso: {ruta.name} estaba dañado; se empieza uno nuevo.")
        return cls(ruta, {})

    def guardar(self) -> None:
        self.ruta.parent.mkdir(parents=True, exist_ok=True)
        tmp = self.ruta.with_suffix(".tmp")
        tmp.write_text(json.dumps(self.datos, ensure_ascii=False, indent=2), encoding="utf-8")
        tmp.replace(self.ruta)

    def get(self, clave: str) -> dict:
        return self.datos.setdefault(clave, {})

    def listo(self, clave: str, con_resumen: bool) -> bool:
        d = self.datos.get(clave, {})
        if d.get("estado") in ("no_es_video", "manual"):
            return True
        if con_resumen:
            return bool(d.get("resumen"))
        return bool(d.get("transcripcion"))


# --------------------------------------------------------------------------- #
# Clasificación de enlaces
# --------------------------------------------------------------------------- #
def id_drive(url: str) -> str | None:
    m = re.search(r"/file/d/([A-Za-z0-9_-]{10,})", url)
    if m:
        return m.group(1)
    q = parse_qs(urlparse(url).query)
    if "id" in q and "drive" in urlparse(url).netloc:
        return q["id"][0]
    return None


def clasificar(url: str, texto: str) -> str | None:
    """Devuelve el tipo de grabación o None si el enlace no parece un video."""
    u = url.lower()
    host = urlparse(u).netloc
    txt = texto.lower()
    pide_sesion = any(p in txt for p in PALABRAS_SESION)

    if "drive.google.com" in host or "docs.google.com" in host or "drive.usercontent.google.com" in host:
        if "/folders/" in u:
            return "carpeta_drive" if pide_sesion else None
        if id_drive(url) and ("/document/" not in u and "/spreadsheets/" not in u and "/presentation/" not in u):
            return "drive"
        return None
    if "sharepoint.com" in host or "stream.office.com" in host or "microsoftstream.com" in host:
        if "/:v:/" in u or "stream.aspx" in u or "stream.office.com" in host or u.split("?")[0].endswith(EXT_MEDIA):
            return "sharepoint"
        return "sharepoint" if pide_sesion and "/:f:/" not in u else None
    if any(h in host for h in ("youtube.com", "youtu.be", "vimeo.com")):
        return "youtube"
    if "bigbluebutton" in u or "/mod/bigbluebuttonbn/" in u or "/playback/" in u:
        return "bbb"
    if "zoom.us/rec" in u:
        return "otro"
    if u.split("?")[0].endswith(EXT_MEDIA):
        return "moodle" if "/pluginfile.php" in u else "directo"
    return None


# --------------------------------------------------------------------------- #
# Navegador (Playwright)
# --------------------------------------------------------------------------- #
JS_ENLACES = """
() => {
  const out = [];
  const contexto = el => {
    const s = el.closest('li.section, .course-section, section, .activity, article, .forumpost, .card');
    const h = s ? s.querySelector('h1,h2,h3,h4,.sectionname,.instancename') : null;
    return h ? h.innerText.trim().slice(0, 120) : '';
  };
  document.querySelectorAll('a[href]').forEach(a => out.push({
      url: a.href, texto: (a.innerText || a.title || a.getAttribute('aria-label') || '').trim().slice(0, 200),
      contexto: contexto(a)}));
  document.querySelectorAll('iframe[src], video[src], source[src], embed[src]').forEach(e => out.push({
      url: e.src, texto: (e.title || '').trim().slice(0, 200), contexto: contexto(e) || document.title}));
  return out;
}
"""


class Zajuna:
    def __init__(self, pw, perfil: Path, headless: bool = False):
        extra = {}
        if os.environ.get("ZAJUNA_CHROMIUM"):  # ruta opcional a un Chromium/Chrome ya instalado
            extra["executable_path"] = os.environ["ZAJUNA_CHROMIUM"]
        elif os.environ.get("ZAJUNA_CANAL"):  # p. ej. "chrome" o "msedge" para usar el navegador del sistema
            extra["channel"] = os.environ["ZAJUNA_CANAL"]
        self.ctx = pw.chromium.launch_persistent_context(
            str(perfil), headless=headless, accept_downloads=True, **extra,
            viewport={"width": 1280, "height": 860}, locale="es-CO",
        )
        self.page = self.ctx.pages[0] if self.ctx.pages else self.ctx.new_page()
        self.wwwroot = ""
        self.sesskey = ""

    def cerrar(self) -> None:
        try:
            self.ctx.close()
        except Exception:
            pass

    # --- Inicio de sesión -------------------------------------------------- #
    def esperar_ingreso(self, minutos: int = 20) -> None:
        from playwright.sync_api import Error as PWError

        log("Abriendo Zajuna. Inicia sesión en la ventana del navegador…")
        try:
            self.page.goto(URL_INICIO, wait_until="domcontentloaded", timeout=90_000)
        except PWError as e:
            log(f"No se pudo abrir {URL_INICIO}: {e}. Escribe la dirección a mano en el navegador.")
        limite = time.time() + minutos * 60
        while time.time() < limite:
            for pg in list(self.ctx.pages):
                info = self._info_moodle(pg)
                if info:
                    self.page = pg
                    self.wwwroot, self.sesskey = info
                    log(f"Ingreso detectado ✅  ({self.wwwroot})")
                    return
            time.sleep(2)
        raise SystemExit("No se detectó el ingreso a Zajuna a tiempo. Vuelve a ejecutar el programa.")

    @staticmethod
    def _info_moodle(pg) -> tuple[str, str] | None:
        try:
            if "/login/" in pg.url:
                return None
            r = pg.evaluate(
                """() => {
                  const c = window.M && M.cfg;
                  if (!c || !c.sesskey || !c.wwwroot) return null;
                  const logueado = !!document.querySelector('a[href*="login/logout.php"], .usermenu .userbutton, #user-menu-toggle');
                  return logueado ? [c.wwwroot, c.sesskey] : null;
                }"""
            )
            return tuple(r) if r else None
        except Exception:
            return None

    # --- Cursos ------------------------------------------------------------ #
    def cursos(self) -> list[tuple[str, str]]:
        """Lista (nombre, url) de los cursos matriculados."""
        cursos: dict[str, str] = {}
        try:
            r = self.page.evaluate(
                """async ([root, key]) => {
                  const body = [{index: 0, methodname: 'core_course_get_enrolled_courses_by_timeline_classification',
                                 args: {offset: 0, limit: 0, classification: 'all', sort: 'fullname'}}];
                  const res = await fetch(`${root}/lib/ajax/service.php?sesskey=${key}&info=core_course_get_enrolled_courses_by_timeline_classification`,
                                          {method: 'POST', body: JSON.stringify(body), credentials: 'same-origin',
                                           headers: {'Content-Type': 'application/json'}});
                  return await res.json();
                }""",
                [self.wwwroot, self.sesskey],
            )
            for c in (r[0].get("data") or {}).get("courses", []) if isinstance(r, list) and r else []:
                cursos[c.get("viewurl") or f"{self.wwwroot}/course/view.php?id={c['id']}"] = c.get("fullname", "")
        except Exception as e:
            log(f"La lista de cursos por API falló ({e}); se buscan en la página.")
        if not cursos:
            for ruta in ("/my/courses.php", "/my/", "/course/index.php"):
                try:
                    self.page.goto(self.wwwroot + ruta, wait_until="networkidle", timeout=60_000)
                except Exception:
                    continue
                for e in self.page.evaluate(JS_ENLACES):
                    if "/course/view.php?id=" in e["url"]:
                        cursos.setdefault(e["url"].split("#")[0], e["texto"] or "Curso")
        return [(n or "Curso", u) for u, n in cursos.items()]

    # --- Exploración ------------------------------------------------------- #
    def _enlaces(self, url: str) -> tuple[str, list[dict]]:
        from playwright.sync_api import Error as PWError

        if "/mod/url/view.php" in url:
            # Los recursos tipo URL suelen redirigir directo al enlace externo: se lee la redirección sin abrirla.
            try:
                r = self.ctx.request.get(url, max_redirects=0, timeout=30_000)
                destino = r.headers.get("location")
                if 300 <= r.status < 400 and destino:
                    return urljoin(url, destino), []
            except PWError:
                pass
        try:
            self.page.goto(url, wait_until="domcontentloaded", timeout=60_000)
            try:
                self.page.wait_for_load_state("networkidle", timeout=10_000)
            except PWError:
                pass
            return self.page.url, self.page.evaluate(JS_ENLACES)
        except PWError as e:
            if "Download is starting" in str(e):
                return url, [{"url": url, "texto": "", "contexto": "", "descarga": True}]
            log(f"   no se pudo abrir {url[:90]}: {str(e).splitlines()[0]}")
            return url, []

    def buscar_grabaciones(self, cursos: list[tuple[str, str]], filtro: str = "") -> list[Grabacion]:
        encontradas: dict[str, Grabacion] = {}
        for nombre, url_curso in cursos:
            if filtro and filtro.lower() not in nombre.lower():
                continue
            log(f"Curso: {nombre}")
            pendientes = [(url_curso, "", 0)]
            vistas: set[str] = set()
            while pendientes:
                url, ctx_txt, prof = pendientes.pop(0)
                base = url.split("#")[0]
                if base in vistas:
                    continue
                vistas.add(base)
                final, enlaces = self._enlaces(url)
                # mod/url redirige directo al recurso externo
                if not final.startswith(self.wwwroot) or (not enlaces and final != url):
                    tipo = clasificar(final, ctx_txt)
                    if tipo:
                        self._agregar(encontradas, Grabacion(final, ctx_txt or self.page.title(), nombre, tipo, url))
                    continue
                for e in enlaces:
                    u, texto = e["url"], " ".join(x for x in (e["texto"], e["contexto"]) if x)
                    if not u or u.startswith(("javascript:", "mailto:")):
                        continue
                    if "/pluginfile.php" in u and "forcedownload" not in u and u.split("?")[0].lower().endswith(EXT_MEDIA):
                        u = u + ("&" if "?" in u else "?") + "forcedownload=1"
                    tipo = "moodle" if e.get("descarga") else clasificar(u, texto)
                    if tipo:
                        self._agregar(encontradas, Grabacion(u, e["texto"] or e["contexto"] or ctx_txt, nombre, tipo, final))
                        continue
                    if u.startswith(self.wwwroot) and prof < 2 and any(m in u for m in MODULOS_A_EXPLORAR):
                        # En foros solo se exploran los hilos (discuss.php) desde la vista del foro
                        if "/mod/forum/discuss.php" in u and prof > 1:
                            continue
                        pendientes.append((u, e["texto"], prof + 1))
        return list(encontradas.values())

    @staticmethod
    def _agregar(destino: dict, g: Grabacion) -> None:
        if g.clave() not in destino:
            destino[g.clave()] = g
            log(f"   🎥 {g.tipo:<11} {g.titulo[:70]}")

    # --- Descarga ---------------------------------------------------------- #
    def descargar(self, g: Grabacion, carpeta: Path) -> Path | None:
        carpeta.mkdir(parents=True, exist_ok=True)
        if g.tipo == "youtube" or g.tipo == "directo":
            return descargar_ytdlp(g.url, carpeta, nombre_seguro(g.titulo))
        url = g.url
        if g.tipo == "drive":
            url = f"https://drive.usercontent.google.com/download?id={id_drive(g.url)}&export=download&confirm=t"
        elif g.tipo == "sharepoint":
            url = url + ("&" if "?" in url else "?") + "download=1"
        return self._descargar_navegador(url, carpeta, g.titulo)

    def _descargar_navegador(self, url: str, carpeta: Path, titulo: str) -> Path | None:
        from playwright.sync_api import Error as PWError

        page = self.ctx.new_page()
        descargas = []
        page.on("download", lambda d: descargas.append(d))
        page.on("popup", lambda p: p.on("download", lambda d: descargas.append(d)))
        try:
            page.goto(url, wait_until="commit", timeout=90_000)
        except PWError:
            pass  # Chromium aborta la navegación cuando empieza una descarga
        inicio, clic = time.time(), False
        while not descargas and time.time() - inicio < 120:
            page.wait_for_timeout(1000)
            if page.url.startswith("chrome-error://"):
                log("   El sitio no respondió (sin conexión o bloqueado).")
                break
            if not clic and time.time() - inicio > 6:
                for sel in ("#uc-download-link", "form#download-form [type=submit]", "a:has-text('Descargar')",
                            "button:has-text('Descargar')", "a:has-text('Download')", "button:has-text('Download')"):
                    try:
                        if page.locator(sel).count():
                            page.locator(sel).first.click()
                            clic = True
                            break
                    except PWError:
                        pass
            if time.time() - inicio > 25 and ("accounts.google.com" in page.url or "login.microsoftonline.com" in page.url):
                log("   Pide iniciar sesión (Google/Microsoft). Hazlo en el navegador; espero hasta 5 minutos…")
                inicio = time.time() + 180
        if not descargas:
            log("   No arrancó la descarga (sin permiso de descarga o requiere abrirlo a mano).")
            page.close()
            return None
        d = descargas[0]
        nombre = d.suggested_filename or "grabacion.mp4"
        ruta = carpeta / f"{nombre_seguro(titulo, 60)} - {nombre_seguro(nombre, 60)}"
        log(f"   Descargando {nombre}…")
        d.save_as(str(ruta))
        page.close()
        return ruta


def descargar_ytdlp(url: str, carpeta: Path, titulo: str) -> Path | None:
    try:
        import yt_dlp
    except ImportError:
        log("   Falta yt-dlp (pip install yt-dlp).")
        return None
    opts = {
        "format": "bestaudio/best",
        "outtmpl": str(carpeta / f"{nombre_seguro(titulo, 60)} - %(title).60s.%(ext)s"),
        "quiet": True, "no_warnings": True, "noplaylist": True,
    }
    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(url, download=True)
            return Path(ydl.prepare_filename(info))
    except Exception as e:
        log(f"   yt-dlp no pudo descargar: {str(e).splitlines()[0]}")
        return None


# --------------------------------------------------------------------------- #
# Transcripción
# --------------------------------------------------------------------------- #
def tiene_audio(ruta: Path) -> bool:
    try:
        import av

        with av.open(str(ruta)) as c:
            return any(s.type == "audio" for s in c.streams)
    except Exception:
        return False


_MODELO = None


def transcribir(ruta: Path, destino: Path, modelo: str) -> Path:
    global _MODELO
    from faster_whisper import WhisperModel

    if _MODELO is None:
        log(f"Cargando modelo Whisper '{modelo}' (la primera vez se descarga, puede tardar)…")
        _MODELO = WhisperModel(modelo, device="auto", compute_type="int8")
    log(f"   Transcribiendo {ruta.name} …")
    segmentos, info = _MODELO.transcribe(str(ruta), language="es", vad_filter=True, beam_size=5)
    duracion = info.duration or 0
    lineas, ultimo = [], 0.0
    for s in segmentos:
        lineas.append(f"[{hhmmss(s.start)}] {s.text.strip()}")
        if duracion and s.end - ultimo > 120:
            ultimo = s.end
            log(f"      {s.end / duracion:5.0%} ({hhmmss(s.end)} de {hhmmss(duracion)})")
    destino.write_text("\n".join(lineas) + "\n", encoding="utf-8")
    log(f"   Transcripción lista: {destino.name}")
    return destino


# --------------------------------------------------------------------------- #
# Resumen con Claude
# --------------------------------------------------------------------------- #
SISTEMA = """Eres un asistente académico para un aprendiz del SENA (Colombia) en formación virtual en la \
plataforma Zajuna. Recibes la transcripción automática de una sesión grabada por el instructor. La \
transcripción puede tener errores de reconocimiento de voz: interpreta con sentido común, corrige \
nombres y siglas evidentes (por ejemplo códigos de evidencia como GA2-210101051-AA1-EV01) y no \
inventes nada que no esté en la transcripción. Si algo no es claro, dilo explícitamente.

Responde en español, en Markdown, con exactamente estas secciones y encabezados:

## Resumen
Un párrafo de 5 a 8 líneas con el propósito y el contenido de la sesión.

## Puntos clave
Viñetas con los conceptos, explicaciones y recomendaciones importantes. Incluye la marca de tiempo \
[hh:mm:ss] donde se mencionan.

## Evidencias que pide el instructor
Para cada evidencia mencionada, un bloque con:
- **Evidencia:** nombre y código (si se menciona)
- **Qué entregar:** producto concreto
- **Formato y extensión:** tipo de archivo, normas (APA, etc.), número de páginas, diapositivas, duración de video…
- **Contenido obligatorio:** lo que debe incluir, punto por punto
- **Criterios de evaluación / errores que no acepta:** según lo que dijo el instructor
- **Fecha y forma de entrega:** dónde y cuándo se sube
- **Momento en el video:** [hh:mm:ss]
Si en la sesión no se pide ninguna evidencia, escribe "No se mencionan evidencias en esta sesión."

## Fechas y compromisos
Viñetas con fechas, plazos, próximas sesiones y avisos administrativos.

## Pendiente por aclarar
Dudas o partes ambiguas que conviene preguntar al instructor."""


def resumir(transcripcion: Path, destino: Path, titulo: str, curso: str, modelo: str) -> Path | None:
    import anthropic

    texto = transcripcion.read_text(encoding="utf-8")
    log(f"   Resumiendo con Claude ({len(texto):,} caracteres)…")
    client = anthropic.Anthropic()
    try:
        with client.beta.messages.stream(
            model=modelo,
            max_tokens=32000,
            betas=["server-side-fallback-2026-07-01"],
            fallbacks="default",
            thinking={"type": "adaptive"},
            output_config={"effort": "high"},
            system=SISTEMA,
            messages=[{
                "role": "user",
                "content": f"Curso: {curso}\nSesión: {titulo}\n\n<transcripcion>\n{texto}\n</transcripcion>",
            }],
        ) as stream:
            resp = stream.get_final_message()
    except anthropic.AuthenticationError:
        log("   La clave ANTHROPIC_API_KEY no es válida. Se deja solo la transcripción.")
        return None
    except anthropic.RateLimitError:
        log("   Límite de uso de la API alcanzado; se reintentará en la próxima ejecución.")
        return None
    except anthropic.APIStatusError as e:
        log(f"   Error de la API ({e.status_code}): {e.message}")
        return None
    except anthropic.APIConnectionError as e:
        log(f"   Sin conexión con la API de Claude: {e}")
        return None
    if resp.stop_reason == "refusal":
        log("   Claude no pudo resumir esta transcripción (rechazo de seguridad).")
        return None
    cuerpo = "".join(b.text for b in resp.content if b.type == "text").strip()
    if resp.stop_reason == "max_tokens":
        cuerpo += "\n\n> ⚠️ El resumen quedó incompleto por longitud."
    destino.write_text(f"# {titulo}\n\n*Curso:* {curso}  \n*Generado:* {dt.date.today()}\n\n{cuerpo}\n",
                       encoding="utf-8")
    log(f"   Resumen listo: {destino.name}")
    return destino


def prompt_manual(transcripcion: Path, destino: Path, titulo: str, curso: str) -> Path:
    """Sin clave de API: deja un texto listo para pegar en la app de Claude."""
    texto = transcripcion.read_text(encoding="utf-8")
    destino.write_text(
        f"{SISTEMA}\n\nCurso: {curso}\nSesión: {titulo}\n\n<transcripcion>\n{texto}\n</transcripcion>\n",
        encoding="utf-8",
    )
    return destino


def seccion(md: str, encabezado: str) -> str:
    m = re.search(rf"^## {re.escape(encabezado)}\s*\n(.*?)(?=^## |\Z)", md, flags=re.S | re.M)
    return m.group(1).strip() if m else ""


def escribir_indice(estado: Estado, salida: Path) -> Path:
    filas = sorted(estado.datos.items(), key=lambda kv: (kv[1].get("curso", ""), kv[1].get("fecha", "")))
    partes = ["# Sesiones grabadas – índice\n", f"_Actualizado: {dt.datetime.now():%Y-%m-%d %H:%M}_\n"]
    partes.append("| Curso | Sesión | Estado | Transcripción | Resumen |\n|---|---|---|---|---|")
    for _, d in filas:
        def enlace(clave: str, texto: str) -> str:
            try:
                return f"[{texto}](<{Path(d[clave]).relative_to(salida).as_posix()}>)"
            except (KeyError, ValueError):
                return ""
        t = enlace("transcripcion", "txt") or "—"
        r = enlace("resumen", "resumen") or enlace("prompt_manual", "pegar en Claude") or "—"
        estado_txt = d.get("estado", "")
        if estado_txt == "manual":
            estado_txt = f"abrir a mano: <{d.get('url', '')}>"
        partes.append(f"| {d.get('curso', '')} | {d.get('titulo', '')} | {estado_txt} | {t} | {r} |")
    partes.append("\n# Evidencias pedidas por los instructores\n")
    for _, d in filas:
        if d.get("resumen") and Path(d["resumen"]).exists():
            ev = seccion(Path(d["resumen"]).read_text(encoding="utf-8"), "Evidencias que pide el instructor")
            if ev and not ev.startswith("No se mencionan"):
                partes.append(f"## {d.get('titulo', '')}\n*{d.get('curso', '')}*\n\n{ev}\n")
    ruta = salida / "INDICE.md"
    ruta.write_text("\n".join(partes) + "\n", encoding="utf-8")
    return ruta


# --------------------------------------------------------------------------- #
# Programa principal
# --------------------------------------------------------------------------- #
def procesar(g: Grabacion, archivo: Path | None, estado: Estado, salida: Path, args) -> None:
    d = estado.get(g.clave())
    d.update({"url": g.url, "titulo": g.titulo, "curso": g.curso, "tipo": g.tipo,
              "fecha": d.get("fecha") or dt.datetime.now().isoformat(timespec="seconds")})
    carpeta = salida / nombre_seguro(g.curso, 60)
    carpeta.mkdir(parents=True, exist_ok=True)
    base = nombre_seguro(g.titulo, 80)

    trans = Path(d["transcripcion"]) if d.get("transcripcion") else None
    if not (trans and trans.exists()):
        if archivo is None:
            d["estado"] = "error_descarga"
            estado.guardar()
            return
        if not tiene_audio(archivo):
            log(f"   {archivo.name} no es audio/video; se ignora.")
            d["estado"] = "no_es_video"
            if not args.conservar_videos and archivo.parent == salida / "_descargas":
                archivo.unlink(missing_ok=True)
            estado.guardar()
            return
        trans = transcribir(archivo, carpeta / f"{base} - transcripcion.txt", args.modelo_whisper)
        d.update({"transcripcion": str(trans), "estado": "transcrita"})
        estado.guardar()
        if not args.conservar_videos and archivo.parent == salida / "_descargas":
            archivo.unlink(missing_ok=True)

    if os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("ANTHROPIC_AUTH_TOKEN"):
        res = resumir(trans, carpeta / f"{base} - resumen.md", g.titulo, g.curso, args.modelo_claude)
        if res:
            d.update({"resumen": str(res), "estado": "resumida"})
    else:
        p = prompt_manual(trans, carpeta / f"{base} - pegar_en_claude.txt", g.titulo, g.curso)
        d["prompt_manual"] = str(p)
    estado.guardar()


def manuales(salida: Path) -> list[tuple[Grabacion, Path | None]]:
    """Videos puestos a mano en videos_manuales/ y enlaces en enlaces.txt."""
    items: list[tuple[Grabacion, Path | None]] = []
    carpeta = RAIZ / "videos_manuales"
    carpeta.mkdir(exist_ok=True)
    for f in sorted(carpeta.iterdir()):
        if f.is_file() and f.suffix.lower() in EXT_MEDIA:
            items.append((Grabacion(f"archivo:{f.name}", f.stem, "Videos manuales", "archivo"), f))
    return items


def enlaces_txt() -> list[Grabacion]:
    ruta = RAIZ / "enlaces.txt"
    if not ruta.exists():
        return []
    out = []
    for linea in ruta.read_text(encoding="utf-8").splitlines():
        linea = linea.strip()
        if not linea or linea.startswith("#"):
            continue
        url, _, titulo = linea.partition(" ")
        tipo = clasificar(url, "grabación") or "directo"
        out.append(Grabacion(url, titulo.strip() or url, "Enlaces manuales", tipo))
    return out


def trabajar_actividades(zaj, cursos, estado: Estado, salida: Path, args, con_resumen: bool) -> None:
    import actividades as act

    log("Revisando actividades y evidencias…")
    lista = act.revisar_actividades(zaj, cursos, salida, args.curso)
    objetivo = [a for a in lista if args.borradores_todas or a.pendiente]
    log(f"{len(lista)} actividad(es); {sum(a.pendiente for a in lista)} pendiente(s).")
    if not (RAIZ / "mi_proyecto.md").exists():
        log("Consejo: llena mi_proyecto.md con los datos de tu proyecto para que los borradores sean sobre tu empresa.")
    for a in objetivo:
        carpeta = salida / "actividades" / nombre_seguro(a.curso, 60)
        ya = list(carpeta.glob(f"*{glob.escape(nombre_seguro(a.titulo, 40))}*BORRADOR.docx")) if carpeta.exists() else []
        if ya and not args.rehacer_borradores:
            continue
        try:
            if con_resumen:
                act.generar_borrador(a, estado.datos, salida, args.modelo_claude)
            else:
                act.prompt_borrador_manual(a, estado.datos, salida)
        except Exception as e:  # un borrador con problemas no detiene los demás
            log(f"   ❌ Error en el borrador de {a.titulo[:60]}: {e}")
    ruta = act.escribir_resumen_actividades(lista, salida)
    log(f"Actividades: {ruta}")


def main() -> None:
    ap = argparse.ArgumentParser(description="Transcribe y resume las sesiones grabadas de Zajuna (SENA).")
    ap.add_argument("--solo-listar", action="store_true", help="solo lista las grabaciones encontradas")
    ap.add_argument("--sin-navegador", action="store_true", help="no abre Zajuna; procesa videos_manuales/ y enlaces.txt")
    ap.add_argument("--curso", default="", help="procesa solo cursos cuyo nombre contenga este texto")
    ap.add_argument("--max", type=int, default=0, help="máximo de grabaciones nuevas a procesar (0 = todas)")
    ap.add_argument("--modelo-whisper", default="small", help="tiny | base | small | medium | large-v3 (default: small)")
    ap.add_argument("--modelo-claude", default="claude-opus-5-5", help="modelo de Claude para los resúmenes")
    ap.add_argument("--conservar-videos", action="store_true", help="no borrar los videos después de transcribir")
    ap.add_argument("--salida", default=str(RAIZ / "salida"), help="carpeta de resultados")
    ap.add_argument("--solo-grabaciones", action="store_true", help="no revisar actividades ni armar borradores")
    ap.add_argument("--solo-actividades", action="store_true", help="no procesar grabaciones; solo actividades y borradores")
    ap.add_argument("--rehacer-borradores", action="store_true", help="volver a armar borradores que ya existen")
    ap.add_argument("--borradores-todas", action="store_true", help="armar borrador también de actividades ya entregadas")
    args = ap.parse_args()

    clave = RAIZ / "clave_api.txt"
    if not os.environ.get("ANTHROPIC_API_KEY") and clave.exists() and clave.read_text(encoding="utf-8").strip():
        os.environ["ANTHROPIC_API_KEY"] = clave.read_text(encoding="utf-8").strip()

    salida = Path(args.salida).resolve()
    salida.mkdir(parents=True, exist_ok=True)
    estado = Estado.cargar(salida / "estado.json")
    con_resumen = bool(os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("ANTHROPIC_AUTH_TOKEN"))
    if not con_resumen:
        log("Sin ANTHROPIC_API_KEY: se harán las transcripciones y un texto listo para pegar en Claude.")

    trabajos: list[tuple[Grabacion, Path | None]] = manuales(salida)
    trabajos += [(g, None) for g in enlaces_txt()]

    zaj = None
    pw_cm = None
    try:
        if not args.sin_navegador:
            from playwright.sync_api import sync_playwright

            pw_cm = sync_playwright()
            pw = pw_cm.__enter__()
            zaj = Zajuna(pw, RAIZ / "perfil_navegador", headless=os.environ.get("ZAJUNA_HEADLESS") == "1")
            zaj.esperar_ingreso()
            cursos = zaj.cursos()
            log(f"{len(cursos)} curso(s) encontrados.")
            if not args.solo_actividades:
                grabaciones = zaj.buscar_grabaciones(cursos, args.curso)
                log(f"{len(grabaciones)} grabación(es) encontradas en Zajuna.")
                trabajos += [(g, None) for g in grabaciones]

        if args.solo_listar:
            for g, _ in trabajos:
                hecho = "✔" if estado.listo(g.clave(), con_resumen) else " "
                print(f"[{hecho}] {g.curso[:30]:<30} | {g.tipo:<11} | {g.titulo[:60]} | {g.url}")
            return

        if args.solo_actividades:
            trabajos = []
        nuevos = [(g, a) for g, a in trabajos if not estado.listo(g.clave(), con_resumen)]
        if args.max:
            nuevos = nuevos[: args.max]
        log(f"{len(nuevos)} grabación(es) por procesar.")
        for i, (g, archivo) in enumerate(nuevos, 1):
            log(f"({i}/{len(nuevos)}) {g.curso} – {g.titulo}")
            d = estado.get(g.clave())
            if g.tipo in ("carpeta_drive", "bbb", "otro"):
                d.update({"url": g.url, "titulo": g.titulo, "curso": g.curso, "tipo": g.tipo, "estado": "manual"})
                log("   Este tipo de enlace no se descarga solo; queda en el índice para abrirlo a mano.")
                estado.guardar()
                continue
            try:
                trans_ok = d.get("transcripcion") and Path(d["transcripcion"]).exists()
                if archivo is None and not trans_ok:
                    if g.tipo in ("youtube", "directo"):
                        archivo = descargar_ytdlp(g.url, salida / "_descargas", nombre_seguro(g.titulo))
                    elif zaj:
                        archivo = zaj.descargar(g, salida / "_descargas")
                    else:
                        log("   Este enlace necesita el navegador; ejecútalo sin --sin-navegador.")
                        continue
                procesar(g, archivo, estado, salida, args)
            except KeyboardInterrupt:
                raise
            except Exception as e:  # una grabación con problemas no detiene las demás
                log(f"   ❌ Error: {e}")
                d["estado"] = f"error: {str(e)[:200]}"
                estado.guardar()

        if zaj and not args.solo_grabaciones:
            trabajar_actividades(zaj, cursos, estado, salida, args, con_resumen)
    finally:
        indice = escribir_indice(estado, salida)
        log(f"Índice: {indice}")
        if zaj:
            zaj.cerrar()
        if pw_cm:
            pw_cm.__exit__(None, None, None)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nInterrumpido. Lo avanzado quedó guardado; vuelve a ejecutar para continuar.")
        sys.exit(130)
