"""
Revisión de actividades (tareas/evidencias) de Zajuna y borradores para el aprendiz.

Para cada tarea (mod/assign) de tus cursos:
  - lee el nombre, las instrucciones, la fecha de entrega y el estado de tu entrega;
  - descarga los archivos adjuntos (guías, plantillas, rúbricas) y extrae su texto;
  - si está pendiente o fue devuelta, arma un BORRADOR en Word (.docx) con Claude usando:
      instrucciones + guía + lo que dijo el instructor en las clases transcritas + mi_proyecto.md.

El borrador es un punto de partida: tú lo corriges, lo completas y lo entregas.
"""

from __future__ import annotations

import datetime as dt
import glob
import json
import re
from dataclasses import asdict, dataclass, field
from pathlib import Path

from zajuna_transcriptor import RAIZ, log, nombre_seguro

CODIGO_EV = re.compile(r"GA\d+-\d{6,}-AA\d+-EV\d+", re.I)

JS_TAREA = r"""
() => {
  const txt = el => el ? el.innerText.trim() : '';
  const intro = document.querySelector('.activity-description, #intro, .box.generalbox.boxaligncenter, [data-region="activity-information"] + div');
  // Tabla de estado de la entrega (Moodle 3.x y 4.x)
  const filas = {};
  document.querySelectorAll('.submissionstatustable tr, table.generaltable tr').forEach(tr => {
    const th = tr.querySelector('th, td.cell.c0'); const td = tr.querySelector('td:last-child');
    if (th && td && th !== td) filas[txt(th)] = txt(td);
  });
  const fechas = txt(document.querySelector('.activity-dates, [data-region="activity-dates"]'));
  const adjuntos = [];
  document.querySelectorAll('.activity-description a[href*="pluginfile.php"], #intro a[href*="pluginfile.php"], .introattachments a[href*="pluginfile.php"], .fileuploadsubmission a, a[href*="/mod_assign/introattachment/"]')
    .forEach(a => adjuntos.push({url: a.href, nombre: txt(a) || a.href.split('/').pop()}));
  const retro = txt(document.querySelector('.feedback, .assignfeedback_comments, [data-region="grading-feedback"]'));
  return {titulo: txt(document.querySelector('h1, h2')) || document.title,
          instrucciones: txt(intro), filas, fechas, adjuntos, retroalimentacion: retro};
}
"""


@dataclass
class Actividad:
    url: str
    curso: str
    titulo: str
    codigo: str = ""
    instrucciones: str = ""
    fecha_entrega: str = ""
    estado_entrega: str = ""
    calificacion: str = ""
    retroalimentacion: str = ""
    adjuntos: list = field(default_factory=list)  # [{"nombre", "ruta", "texto"}]

    @property
    def pendiente(self) -> bool:
        e = (self.estado_entrega or "").lower()
        if not e:
            return True
        if any(p in e for p in ("no entregad", "no enviad", "no se ha", "no hay", "sin entrega", "borrador",
                                "no submission", "nothing has been submitted", "draft", "reabierto", "reopened",
                                "devuelt")):
            return True
        entregada = any(p in e for p in ("enviado para calificar", "submitted for grading", "entregado", "enviada"))
        return not entregada


def _valor(filas: dict, *claves: str) -> str:
    for k, v in filas.items():
        if any(c in k.lower() for c in claves):
            return v
    return ""


def texto_de_archivo(ruta: Path, max_chars: int = 60_000) -> str:
    suf = ruta.suffix.lower()
    try:
        if suf == ".pdf":
            from pypdf import PdfReader

            return "\n".join((p.extract_text() or "") for p in PdfReader(str(ruta)).pages)[:max_chars]
        if suf == ".docx":
            import docx

            return "\n".join(p.text for p in docx.Document(str(ruta)).paragraphs)[:max_chars]
        if suf in (".txt", ".md", ".csv", ".html", ".htm"):
            return ruta.read_text(encoding="utf-8", errors="ignore")[:max_chars]
    except Exception as e:
        log(f"   No se pudo leer {ruta.name}: {e}")
    return ""


def revisar_actividades(zaj, cursos: list[tuple[str, str]], salida: Path, filtro: str = "") -> list[Actividad]:
    """Recorre las tareas de cada curso y devuelve su información."""
    carpeta_adj = salida / "actividades" / "_adjuntos"
    actividades: list[Actividad] = []
    for nombre, url_curso in cursos:
        if filtro and filtro.lower() not in nombre.lower():
            continue
        log(f"Actividades de: {nombre}")
        tareas: dict[str, str] = {}
        cid = re.search(r"id=(\d+)", url_curso)
        # La página índice de tareas lista todas las del curso
        for url in ([f"{zaj.wwwroot}/mod/assign/index.php?id={cid.group(1)}"] if cid else []) + [url_curso]:
            _, enlaces = zaj._enlaces(url)
            for e in enlaces:
                if "/mod/assign/view.php?id=" in e["url"]:
                    tareas.setdefault(e["url"].split("#")[0].split("&")[0], e["texto"])
        for url, texto in tareas.items():
            try:
                zaj.page.goto(url, wait_until="domcontentloaded", timeout=60_000)
                d = zaj.page.evaluate(JS_TAREA)
            except Exception as e:
                log(f"   no se pudo leer la tarea {url}: {e}")
                continue
            titulo = d["titulo"] or texto
            a = Actividad(
                url=url, curso=nombre, titulo=titulo,
                instrucciones=d["instrucciones"],
                fecha_entrega=_valor(d["filas"], "fecha de entrega", "due date", "vencimiento") or d["fechas"],
                estado_entrega=_valor(d["filas"], "estado de la entrega", "submission status", "estado de entrega"),
                calificacion=_valor(d["filas"], "calificación", "grade"),
                retroalimentacion=d["retroalimentacion"],
            )
            m = CODIGO_EV.search(f"{titulo} {texto} {a.instrucciones}")
            a.codigo = m.group(0).upper() if m else ""
            for adj in d["adjuntos"]:
                ruta = zaj._descargar_navegador(adj["url"] + ("&" if "?" in adj["url"] else "?") + "forcedownload=1",
                                                carpeta_adj, a.codigo or nombre_seguro(titulo, 40))
                if ruta:
                    a.adjuntos.append({"nombre": adj["nombre"], "ruta": str(ruta), "texto": texto_de_archivo(ruta)})
            marca = "⏳ pendiente" if a.pendiente else "✅ entregada"
            log(f"   📝 {marca:<13} {titulo[:70]}")
            actividades.append(a)
    (salida / "actividades").mkdir(parents=True, exist_ok=True)
    (salida / "actividades" / "actividades.json").write_text(
        json.dumps([asdict(a) for a in actividades], ensure_ascii=False, indent=2), encoding="utf-8")
    return actividades


# --------------------------------------------------------------------------- #
# Borradores
# --------------------------------------------------------------------------- #
SISTEMA_BORRADOR = """Eres un tutor que ayuda a un aprendiz del SENA (Colombia) a preparar una evidencia de \
aprendizaje. Vas a escribir un BORRADOR que el aprendiz revisará, corregirá y completará con su propia voz \
antes de entregarlo; no es la versión final.

Reglas:
- Sigue al pie de la letra las instrucciones de la actividad y la guía de aprendizaje: estructura, \
  secciones, extensión, formato (APA 7 si se pide) y producto solicitado (documento, mapa mental, \
  infografía, presentación, video, foro…).
- Aplica todo lo que el instructor dijo en las clases sobre esta evidencia y evita los errores que señaló.
- Si hay retroalimentación del instructor porque la evidencia fue devuelta o no cumplió, corrige \
  exactamente lo que pidió y explícalo al inicio.
- Usa el contexto del proyecto del aprendiz (su empresa, su proceso) en lugar de ejemplos genéricos.
- No inventes datos, cifras, fuentes ni citas. Donde falte información escribe [COMPLETAR: qué falta] \
  y donde se necesite una referencia real escribe [FUENTE: qué tipo de fuente buscar].
- Si el producto es visual (mapa mental, infografía, presentación), entrega el contenido organizado \
  (nodos y ramas, bloques de la infografía, diapositiva por diapositiva) y una sugerencia breve de \
  herramienta y diseño.

Responde en español, en Markdown, con estas secciones:
# <Título de la evidencia>
## Antes de entregar (lista de verificación)
Viñetas con cada requisito de la guía y del instructor para marcar.
## Borrador
El contenido completo del borrador.
## Qué debes completar o verificar tú
Viñetas con los [COMPLETAR] y [FUENTE] y cualquier supuesto que hiciste."""


def _contexto_clases(actividad: Actividad, estado: dict) -> str:
    """Toma de los resúmenes de las clases las partes que hablan de esta evidencia."""
    from zajuna_transcriptor import seccion

    trozos = []
    claves = [actividad.codigo] if actividad.codigo else []
    claves += [w for w in re.findall(r"[A-Za-zÁÉÍÓÚáéíóúñÑ]{5,}", actividad.titulo)][:4]
    for d in estado.values():
        if not d.get("resumen") or not Path(d["resumen"]).exists():
            continue
        md = Path(d["resumen"]).read_text(encoding="utf-8")
        ev = seccion(md, "Evidencias que pide el instructor")
        if ev and any(c and c.lower() in ev.lower() for c in claves):
            trozos.append(f"### Clase: {d.get('titulo', '')}\n{ev}")
    return "\n\n".join(trozos)[:80_000]


def generar_borrador(a: Actividad, estado: dict, salida: Path, modelo: str) -> Path | None:
    import anthropic

    proyecto = RAIZ / "mi_proyecto.md"
    contexto_proyecto = proyecto.read_text(encoding="utf-8") if proyecto.exists() else "(no hay mi_proyecto.md)"
    guias = "\n\n".join(f"### Archivo adjunto: {x['nombre']}\n{x['texto']}" for x in a.adjuntos if x.get("texto"))
    clases = _contexto_clases(a, estado) or "(no hay clases transcritas que mencionen esta evidencia)"
    contenido = (
        f"Curso: {a.curso}\nEvidencia: {a.titulo}\nCódigo: {a.codigo or 'no indicado'}\n"
        f"Fecha de entrega: {a.fecha_entrega or 'no indicada'}\nEstado: {a.estado_entrega or 'sin entrega'}\n\n"
        f"<instrucciones_de_la_actividad>\n{a.instrucciones or '(sin texto)'}\n</instrucciones_de_la_actividad>\n\n"
        f"<retroalimentacion_del_instructor>\n{a.retroalimentacion or '(ninguna)'}\n</retroalimentacion_del_instructor>\n\n"
        f"<guia_y_adjuntos>\n{guias or '(no hay adjuntos legibles)'}\n</guia_y_adjuntos>\n\n"
        f"<lo_que_dijo_el_instructor_en_clase>\n{clases}\n</lo_que_dijo_el_instructor_en_clase>\n\n"
        f"<proyecto_del_aprendiz>\n{contexto_proyecto}\n</proyecto_del_aprendiz>"
    )
    log(f"   Armando borrador: {a.titulo[:70]}")
    client = anthropic.Anthropic()
    try:
        with client.beta.messages.stream(
            model=modelo, max_tokens=64000,
            betas=["server-side-fallback-2026-07-01"], fallbacks="default",
            thinking={"type": "adaptive"}, output_config={"effort": "high"},
            system=SISTEMA_BORRADOR,
            messages=[{"role": "user", "content": contenido}],
        ) as stream:
            resp = stream.get_final_message()
    except anthropic.APIStatusError as e:
        log(f"   Error de la API ({e.status_code}): {e.message}")
        return None
    except anthropic.APIConnectionError as e:
        log(f"   Sin conexión con la API de Claude: {e}")
        return None
    if resp.stop_reason == "refusal":
        log("   Claude no pudo armar este borrador.")
        return None
    md = "".join(b.text for b in resp.content if b.type == "text").strip()
    carpeta = salida / "actividades" / nombre_seguro(a.curso, 60)
    carpeta.mkdir(parents=True, exist_ok=True)
    base = nombre_seguro(f"{a.codigo} {a.titulo}" if a.codigo and a.codigo not in a.titulo else a.titulo, 90)
    (carpeta / f"{base} - BORRADOR.md").write_text(md + "\n", encoding="utf-8")
    ruta = carpeta / f"{base} - BORRADOR.docx"
    markdown_a_docx(md, ruta, aviso=f"BORRADOR generado el {dt.date.today()} — revísalo y corrígelo antes de entregar.")
    log(f"   Borrador listo: {ruta.name}")
    return ruta


def prompt_borrador_manual(a: Actividad, estado: dict, salida: Path) -> Path:
    """Sin clave de API: texto listo para pegar en la app de Claude."""
    proyecto = RAIZ / "mi_proyecto.md"
    carpeta = salida / "actividades" / nombre_seguro(a.curso, 60)
    carpeta.mkdir(parents=True, exist_ok=True)
    ruta = carpeta / f"{nombre_seguro(a.titulo, 90)} - pegar_en_claude.txt"
    guias = "\n\n".join(f"### {x['nombre']}\n{x['texto']}" for x in a.adjuntos if x.get("texto"))
    ruta.write_text(
        f"{SISTEMA_BORRADOR}\n\nEvidencia: {a.titulo}\nCódigo: {a.codigo}\nFecha: {a.fecha_entrega}\n\n"
        f"Instrucciones:\n{a.instrucciones}\n\nRetroalimentación:\n{a.retroalimentacion}\n\nGuía:\n{guias}\n\n"
        f"Lo que dijo el instructor en clase:\n{_contexto_clases(a, estado)}\n\n"
        f"Mi proyecto:\n{proyecto.read_text(encoding='utf-8') if proyecto.exists() else ''}\n",
        encoding="utf-8")
    return ruta


# --------------------------------------------------------------------------- #
# Markdown -> Word
# --------------------------------------------------------------------------- #
def _runs(parrafo, texto: str) -> None:
    for i, trozo in enumerate(re.split(r"(\*\*[^*]+\*\*)", texto)):
        if trozo.startswith("**") and trozo.endswith("**") and len(trozo) > 4:
            parrafo.add_run(trozo[2:-2]).bold = True
        elif trozo:
            parrafo.add_run(trozo)


def markdown_a_docx(md: str, ruta: Path, aviso: str = "") -> None:
    import docx
    from docx.shared import Pt, RGBColor

    doc = docx.Document()
    estilo = doc.styles["Normal"]
    estilo.font.name = "Arial"
    estilo.font.size = Pt(12)
    if aviso:
        r = doc.add_paragraph().add_run(aviso)
        r.italic = True
        r.font.color.rgb = RGBColor(0xC0, 0x39, 0x2B)
    tabla = None
    for linea in md.splitlines():
        s = linea.rstrip()
        if s.startswith("|") and s.endswith("|"):
            celdas = [c.strip() for c in s.strip("|").split("|")]
            if all(re.fullmatch(r":?-{2,}:?", c) for c in celdas):
                continue
            if tabla is None:
                tabla = doc.add_table(rows=0, cols=len(celdas))
                tabla.style = "Table Grid"
            fila = tabla.add_row().cells
            for i, c in enumerate(celdas[: len(fila)]):
                _runs(fila[i].paragraphs[0], c)
            continue
        tabla = None
        m = re.match(r"^(#{1,4})\s+(.*)", s)
        if m:
            doc.add_heading(m.group(2).strip(), level=min(len(m.group(1)), 4))
        elif re.match(r"^\s*[-*]\s+\[[ xX]\]\s+", s):
            _runs(doc.add_paragraph(style="List Bullet"), "☐ " + re.sub(r"^\s*[-*]\s+\[[ xX]\]\s+", "", s))
        elif re.match(r"^\s{2,}[-*]\s+", s):
            _runs(doc.add_paragraph(style="List Bullet 2"), re.sub(r"^\s*[-*]\s+", "", s))
        elif re.match(r"^\s*[-*]\s+", s):
            _runs(doc.add_paragraph(style="List Bullet"), re.sub(r"^\s*[-*]\s+", "", s))
        elif re.match(r"^\s*\d+[.)]\s+", s):
            _runs(doc.add_paragraph(style="List Number"), re.sub(r"^\s*\d+[.)]\s+", "", s))
        elif s.strip() in ("---", "***"):
            doc.add_paragraph("")
        elif s.strip():
            _runs(doc.add_paragraph(), s.strip())
    doc.save(str(ruta))


def escribir_resumen_actividades(actividades: list[Actividad], salida: Path) -> Path:
    filas = ["# Actividades y evidencias\n", f"_Actualizado: {dt.datetime.now():%Y-%m-%d %H:%M}_\n",
             "| Estado | Curso | Evidencia | Fecha de entrega | Calificación | Borrador |", "|---|---|---|---|---|---|"]
    for a in sorted(actividades, key=lambda x: (not x.pendiente, x.curso, x.titulo)):
        carpeta = salida / "actividades" / nombre_seguro(a.curso, 60)
        borr = sorted(carpeta.glob(f"*{glob.escape(nombre_seguro(a.titulo, 40))}*BORRADOR.docx")) if carpeta.exists() else []
        enlace = f"[docx](<{borr[0].relative_to(salida).as_posix()}>)" if borr else "—"
        filas.append(f"| {'⏳ Pendiente' if a.pendiente else '✅ Entregada'} | {a.curso} | {a.titulo} | "
                     f"{a.fecha_entrega or '—'} | {a.calificacion or '—'} | {enlace} |")
    ruta = salida / "ACTIVIDADES.md"
    ruta.write_text("\n".join(filas) + "\n", encoding="utf-8")
    return ruta
