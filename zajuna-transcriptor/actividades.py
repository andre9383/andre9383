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

from zajuna_transcriptor import RAIZ, limpiar_titulo, log, nombre_seguro

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
    tipo: str = "tarea"  # tarea | cuestionario

    @property
    def pendiente(self) -> bool:
        if self.tipo == "cuestionario":
            return False  # los cuestionarios se resuelven en Zajuna; no se arma borrador
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


def numero_guia(texto: str) -> str:
    """'GA3-210101051-AA1-EV01' -> '3'; 'Guía de aprendizaje 3' -> '3'."""
    m = re.search(r"\bGA(\d+)-", texto or "", re.I) or re.search(r"gu[ií]a de aprendizaje\s*(?:n[°ºo.]*\s*)?(\d+)", texto or "", re.I)
    return m.group(1) if m else ""


def texto_recurso(zaj, url: str, carpeta: Path, nombre: str) -> dict | None:
    """Obtiene el texto de un recurso de Zajuna (archivo PDF/Word o página)."""
    carpeta.mkdir(parents=True, exist_ok=True)
    try:
        if "/mod/resource/view.php" in url or "/pluginfile.php" in url:
            destino = url + ("&" if "?" in url else "?") + ("redirect=1" if "/mod/resource/" in url else "forcedownload=1")
            r = zaj.ctx.request.get(destino, timeout=120_000)
            tipo = r.headers.get("content-type", "")
            ext = ".pdf" if "pdf" in tipo else ".docx" if "word" in tipo or "officedocument" in tipo else ""
            if r.ok and ext:
                ruta = carpeta / f"{nombre_seguro(nombre, 80)}{ext}"
                ruta.write_bytes(r.body())
                return {"nombre": nombre, "ruta": str(ruta), "texto": texto_de_archivo(ruta)}
        zaj.page.goto(url, wait_until="domcontentloaded", timeout=60_000)
        texto = zaj.page.evaluate("() => (document.querySelector('#region-main, [role=main]') || document.body).innerText")
        # Una página que solo enlaza al PDF de la guía
        pdf = zaj.page.evaluate("() => { const a = document.querySelector('#region-main a[href*=\"pluginfile.php\"]'); return a ? a.href : ''; }")
        if pdf and len(texto) < 1500:
            return texto_recurso(zaj, pdf, carpeta, nombre) or {"nombre": nombre, "ruta": url, "texto": texto}
        return {"nombre": nombre, "ruta": url, "texto": texto[:60_000]}
    except Exception as e:
        log(f"   No se pudo leer el recurso {nombre}: {e}")
        return None


def revisar_actividades(zaj, cursos: list[tuple[str, str]], salida: Path, filtro: str = "") -> list[Actividad]:
    """Recorre las tareas de cada curso y devuelve su información."""
    carpeta_adj = salida / "actividades" / "_adjuntos"
    actividades: list[Actividad] = []
    materiales: list[dict] = []
    for nombre, url_curso in cursos:
        if filtro and filtro.lower() not in nombre.lower():
            continue
        log(f"Actividades de: {nombre}")
        tareas: dict[str, str] = {}
        cuestionarios: dict[str, str] = {}
        guias_url: dict[str, tuple[str, str]] = {}  # número -> (url, nombre)
        cid = re.search(r"id=(\d+)", url_curso)
        # La página índice de tareas lista todas las del curso
        for url in [url_curso] + ([f"{zaj.wwwroot}/mod/assign/index.php?id={cid.group(1)}"] if cid else []):
            _, enlaces = zaj._enlaces(url)
            for e in enlaces:
                u = e["url"].split("#")[0].split("&")[0]
                if "/mod/assign/view.php?id=" in u:
                    tareas.setdefault(u, e["texto"])
                elif "/mod/quiz/view.php?id=" in u:
                    cuestionarios.setdefault(u, e["texto"])
                elif re.search(r"/mod/(resource|page|url)/view.php", u) and re.search(r"gu[ií]a de aprendizaje", e["texto"], re.I):
                    n = numero_guia(e["texto"])
                    if n:
                        guias_url.setdefault(n, (u, limpiar_titulo(e["texto"])))
        materiales_url: dict[str, str] = {}
        for url in [url_curso]:
            _, enlaces = zaj._enlaces(url)
            for e in enlaces:
                u = e["url"].split("#")[0].split("&")[0]
                if re.search(r"/mod/(resource|page|book)/view.php", u) and re.search(r"material", f"{e.get('seccion', '')} {e.get('contexto', '')}", re.I) \
                        and not re.search(r"gu[ií]a de aprendizaje", e["texto"], re.I):
                    materiales_url.setdefault(u, limpiar_titulo(e["texto"]))
        for u, nom in materiales_url.items():
            m = texto_recurso(zaj, u, carpeta_adj / "materiales", nom)
            if m and m.get("texto"):
                materiales.append({"curso": nombre, **m})
                log(f"   📚 {nom[:60]}")
        guias: dict[str, dict] = {}
        for n, (u, nom) in sorted(guias_url.items()):
            g = texto_recurso(zaj, u, carpeta_adj, nom)
            if g and g.get("texto"):
                guias[n] = g
                log(f"   📘 {nom[:60]} ({len(g['texto']):,} caracteres)")
        for u, texto in cuestionarios.items():
            m = CODIGO_EV.search(texto)
            actividades.append(Actividad(url=u, curso=nombre, titulo=limpiar_titulo(texto),
                                         codigo=m.group(0).upper() if m else "", tipo="cuestionario"))
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
            n = numero_guia(a.codigo or titulo)
            if n in guias:
                a.adjuntos.append(guias[n])
            marca = "⏳ pendiente" if a.pendiente else "✅ entregada"
            log(f"   📝 {marca:<13} {titulo[:70]}")
            actividades.append(a)
    (salida / "actividades").mkdir(parents=True, exist_ok=True)
    (salida / "actividades" / "materiales.json").write_text(json.dumps(materiales, ensure_ascii=False), encoding="utf-8")
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
- Usa los materiales de formación del curso y busca en la web (herramienta web_search) fuentes reales y \
  actuales para sustentar conceptos y cifras: preferiblemente fuentes colombianas u oficiales (DANE, \
  MinComercio, SENA, ProColombia, Banco de la República, artículos académicos). Cita en APA 7 con la URL \
  real que encontraste. Nunca inventes una fuente, cifra o cita; si no encuentras algo, escribe \
  [FUENTE: qué buscar].
- Lo que solo sabe el aprendiz (cifras internas de su empresa, su experiencia, fotos, nombres) márcalo \
  [COMPLETAR: qué falta] en vez de suponerlo.
- Redacción: español de Colombia, claro y directo, en primera persona del aprendiz cuando la evidencia lo \
  pida. Frases concretas sobre su caso, ejemplos reales del proceso, párrafos de largo variado. Evita el \
  relleno, las frases grandilocuentes y las conclusiones genéricas que servirían para cualquier empresa.
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
        f"<materiales_de_formacion>\n{_materiales_relevantes(a, salida)}\n</materiales_de_formacion>\n\n"
        f"<proyecto_del_aprendiz>\n{contexto_proyecto}\n</proyecto_del_aprendiz>"
    )
    log(f"   Armando borrador (con investigación web): {a.titulo[:70]}")
    client = anthropic.Anthropic()
    try:
        md = _llamar(client, modelo, SISTEMA_BORRADOR, contenido, con_web=True)
        if not md:
            return None
        log("   Evaluando el borrador contra la guía y lo que pidió el instructor…")
        revisado = _llamar(client, modelo, SISTEMA_REVISION,
                           f"{contenido}\n\n<borrador_a_revisar>\n{md}\n</borrador_a_revisar>", con_web=False)
        md = revisado or md
    except anthropic.APIStatusError as e:
        log(f"   Error de la API ({e.status_code}): {e.message}")
        return None
    except anthropic.APIConnectionError as e:
        log(f"   Sin conexión con la API de Claude: {e}")
        return None
    carpeta = salida / "actividades" / nombre_seguro(a.curso, 60)
    carpeta.mkdir(parents=True, exist_ok=True)
    base = nombre_seguro(f"{a.codigo} {a.titulo}" if a.codigo and a.codigo not in a.titulo else a.titulo, 90)
    (carpeta / f"{base} - BORRADOR.md").write_text(md + "\n", encoding="utf-8")
    ruta = carpeta / f"{base} - BORRADOR.docx"
    markdown_a_docx(md, ruta, aviso=f"BORRADOR generado el {dt.date.today()} — revísalo y corrígelo antes de entregar.")
    log(f"   Borrador listo: {ruta.name}")
    return ruta


SISTEMA_REVISION = """Eres un instructor del SENA exigente que revisa el borrador de una evidencia antes de \
que el aprendiz la entregue. Tienes las instrucciones, la guía, lo que dijo el instructor en clase, la \
retroalimentación previa y el borrador.

1. Evalúa el borrador criterio por criterio: cada requisito de la guía y cada indicación del instructor \
   (estructura, contenido, formato, extensión, normas APA, uso del caso del aprendiz, coherencia, ortografía).
2. Corrige todo lo que no cumpla y mejora la claridad y la redacción: más concreta, más ligada al caso, \
   sin relleno ni frases genéricas. Conserva las fuentes reales con su URL; no agregues fuentes nuevas que \
   no estén en el borrador. Mantén los [COMPLETAR] y [FUENTE] que sigan pendientes.

Responde en español, en Markdown, con estas secciones:
# <Título de la evidencia>
## Evaluación del borrador
Tabla | Criterio | ¿Cumplía? | Qué se ajustó |
## Antes de entregar (lista de verificación)
## Borrador corregido
La versión completa corregida.
## Qué debes completar o verificar tú"""


def _llamar(client, modelo: str, sistema: str, contenido: str, con_web: bool) -> str:
    """Llamada a Claude con streaming; con_web activa la búsqueda web y reanuda los pause_turn."""
    herramientas = [{"type": "web_search_20260209", "name": "web_search", "max_uses": 8,
                     "user_location": {"type": "approximate", "country": "CO"}}] if con_web else []
    mensajes = [{"role": "user", "content": contenido}]
    for _ in range(6):
        params = dict(model=modelo, max_tokens=64000, system=sistema, messages=mensajes,
                      betas=["server-side-fallback-2026-07-01"], fallbacks="default",
                      thinking={"type": "adaptive"}, output_config={"effort": "high"})
        if herramientas:
            params["tools"] = herramientas
        with client.beta.messages.stream(**params) as stream:
            resp = stream.get_final_message()
        if resp.stop_reason == "pause_turn":  # la búsqueda web sigue en curso: se reanuda igual
            mensajes = [mensajes[0], {"role": "assistant", "content": resp.content}]
            continue
        if resp.stop_reason == "refusal":
            log("   Claude no pudo completar esta parte.")
            return ""
        texto = "".join(b.text for b in resp.content if b.type == "text").strip()
        if resp.stop_reason == "max_tokens":
            texto += "\n\n> ⚠️ Quedó incompleto por longitud."
        return texto
    log("   La investigación tomó demasiados pasos; se usa lo obtenido.")
    return ""


def _materiales_relevantes(a: Actividad, salida: Path, max_chars: int = 60_000) -> str:
    ruta = salida / "actividades" / "materiales.json"
    if not ruta.exists():
        return "(no se encontraron materiales de formación)"
    materiales = [m for m in json.loads(ruta.read_text(encoding="utf-8")) if m.get("curso") == a.curso]
    palabras = {w.lower() for w in re.findall(r"[A-Za-zÁÉÍÓÚáéíóúñÑ]{5,}", f"{a.titulo} {a.instrucciones[:500]}")}
    def puntaje(m):
        return sum(w in (m["nombre"] + " " + m["texto"][:3000]).lower() for w in palabras)
    partes, total = [], 0
    for m in sorted(materiales, key=puntaje, reverse=True):
        trozo = f"### {m['nombre']}\n{m['texto'][:12_000]}"
        if total + len(trozo) > max_chars:
            break
        partes.append(trozo)
        total += len(trozo)
    return "\n\n".join(partes) or "(no se encontraron materiales de formación)"


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
        marca = "📋 Cuestionario" if a.tipo == "cuestionario" else "⏳ Pendiente" if a.pendiente else "✅ Entregada"
        filas.append(f"| {marca} | {a.curso} | {a.titulo} | "
                     f"{a.fecha_entrega or '—'} | {a.calificacion or '—'} | {enlace} |")
    ruta = salida / "ACTIVIDADES.md"
    ruta.write_text("\n".join(filas) + "\n", encoding="utf-8")
    return ruta
