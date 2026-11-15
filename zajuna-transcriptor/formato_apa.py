"""
Documento Word de la evidencia: portada con el esquema del SENA + cuerpo en normas APA 7.

Portada (esquema del aprendiz):
    SERVICIO NACIONAL DE APRENDIZAJE - SENA / Regional / Centro de formación
    TÍTULO DEL PRODUCTO / subtítulo (tema)
    Presentado por: / nombre / Ficha N.º / programa
    Presentado al Instructor: / instructor
    Componente formativo: … / Ciudad, Departamento - Año

Cuerpo APA 7 (trabajos de estudiante):
    - Márgenes de 2,54 cm, papel carta, Arial 11, interlineado doble, alineado a la izquierda.
    - Sangría de primera línea de 1,27 cm en los párrafos.
    - Número de página arriba a la derecha.
    - Títulos: nivel 1 centrado en negrita; nivel 2 a la izquierda en negrita; nivel 3 negrita cursiva.
    - Tablas: "Tabla N" en negrita, título en cursiva, sin líneas verticales.
    - Referencias en página aparte, título "Referencias" centrado en negrita, orden alfabético
      y sangría francesa de 1,27 cm.
"""

from __future__ import annotations

import datetime as dt
import re
from pathlib import Path

FUENTE = "Arial"
TAMANO = 11  # APA 7 acepta Arial 11, Calibri 11 o Times New Roman 12


def datos_aprendiz(texto_proyecto: str) -> dict:
    """Lee 'Nombre:', 'Ficha:', 'Programa:', 'Instructor líder:', 'Regional:', 'Centro…:' y 'Ciudad…:' de mi_proyecto.md."""
    def campo(*claves: str) -> str:
        for c in claves:
            m = re.search(rf"^\s*[-*]?\s*{c}[^:\n]*:\s*(.+)$", texto_proyecto, flags=re.I | re.M)
            if m and m.group(1).strip():
                return m.group(1).strip()
        return ""

    programa = campo("Programa")
    programa = re.sub(r"\s*\(SENA\)\s*$", "", programa)
    programa = re.sub(r"^Tecn[oó]logo en", "Tecnología en", programa)
    return {
        "nombre": campo("Nombre"),
        "ficha": campo("Ficha"),
        "programa": programa,
        "instructor": campo("Instructor"),
        "regional": campo("Regional"),
        "centro": campo("Centro"),
        "ciudad": campo("Ciudad para la portada", "Ciudad de la portada", "Ciudad"),
    }


def campos_portada(md: str) -> dict:
    """Lee la sección '## Portada' del borrador: Título, Subtítulo y Componente formativo."""
    m = re.search(r"^##\s*Portada[^\n]*\n(.*?)(?=^## |\Z)", md, flags=re.S | re.M)
    texto = m.group(1) if m else ""

    def campo(clave: str) -> str:
        r = re.search(rf"{clave}[^:\n]*:\**\s*(.+)$", texto, flags=re.I | re.M)
        return r.group(1).strip().strip("*").strip() if r else ""

    return {"titulo": campo("T[ií]tulo"), "subtitulo": campo("Subt[ií]tulo"), "componente": campo("Componente")}


def cuerpo_entrega(md: str) -> str:
    """El texto que se entrega: la sección 'Borrador corregido' (o 'Borrador')."""
    for nombre in ("Borrador corregido", "Borrador"):
        m = re.search(rf"^##\s*{nombre}\s*\n(.*?)(?=^## |\Z)", md, flags=re.S | re.M)
        if m and m.group(1).strip():
            return m.group(1).strip()
    return ""


# --------------------------------------------------------------------------- #
def _fuente(run, tam=TAMANO, negrita=None, cursiva=None) -> None:
    from docx.shared import Pt

    run.font.name = FUENTE
    run.font.size = Pt(tam)
    if negrita is not None:
        run.bold = negrita
    if cursiva is not None:
        run.italic = cursiva


def _texto_con_formato(parrafo, texto: str, tam=TAMANO, negrita=None) -> None:
    """**negrita** y *cursiva* dentro del texto."""
    for trozo in re.split(r"(\*\*[^*]+\*\*|\*[^*\s][^*]*\*)", texto):
        if not trozo:
            continue
        if trozo.startswith("**") and trozo.endswith("**") and len(trozo) > 4:
            _fuente(parrafo.add_run(trozo[2:-2]), tam, True, None)
        elif trozo.startswith("*") and trozo.endswith("*") and len(trozo) > 2:
            _fuente(parrafo.add_run(trozo[1:-1]), tam, negrita, True)
        else:
            _fuente(parrafo.add_run(trozo), tam, negrita, None)


def _numero_pagina(seccion) -> None:
    from docx.enum.text import WD_ALIGN_PARAGRAPH
    from docx.oxml import OxmlElement
    from docx.oxml.ns import qn

    p = seccion.header.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    run = p.add_run()
    _fuente(run)
    for tipo, texto in (("begin", None), (None, "PAGE"), ("end", None)):
        if tipo:
            el = OxmlElement("w:fldChar")
            el.set(qn("w:fldCharType"), tipo)
        else:
            el = OxmlElement("w:instrText")
            el.set(qn("xml:space"), "preserve")
            el.text = texto
        run._r.append(el)


def _sin_bordes_verticales(tabla) -> None:
    """Estilo APA: solo líneas horizontales (arriba, debajo del encabezado y al final)."""
    from docx.oxml import OxmlElement
    from docx.oxml.ns import qn

    tbl_pr = tabla._tbl.tblPr
    bordes = OxmlElement("w:tblBorders")
    for borde, valor in (("top", "single"), ("bottom", "single"), ("left", "nil"), ("right", "nil"),
                         ("insideH", "nil"), ("insideV", "nil")):
        el = OxmlElement(f"w:{borde}")
        el.set(qn("w:val"), valor)
        if valor == "single":
            el.set(qn("w:sz"), "8")
            el.set(qn("w:color"), "000000")
        bordes.append(el)
    tbl_pr.append(bordes)
    if tabla.rows:
        for celda in tabla.rows[0].cells:  # línea bajo el encabezado
            tc_pr = celda._tc.get_or_add_tcPr()
            b = OxmlElement("w:tcBorders")
            ab = OxmlElement("w:bottom")
            ab.set(qn("w:val"), "single")
            ab.set(qn("w:sz"), "8")
            b.append(ab)
            tc_pr.append(b)


def documento_apa(portada: dict, cuerpo_md: str, ruta: Path) -> None:
    import docx
    from docx.enum.section import WD_SECTION
    from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK
    from docx.shared import Cm, Pt

    doc = docx.Document()
    normal = doc.styles["Normal"]
    normal.font.name = FUENTE
    normal.font.size = Pt(TAMANO)
    normal.paragraph_format.line_spacing = 2.0
    normal.paragraph_format.space_after = Pt(0)
    normal.paragraph_format.space_before = Pt(0)
    for nivel in (1, 2, 3):
        st = doc.styles[f"Heading {nivel}"]
        st.font.name, st.font.size, st.font.bold = FUENTE, Pt(TAMANO), True
        st.font.italic = nivel == 3
        st.font.color.rgb = None
        st.paragraph_format.space_before = Pt(0)
        st.paragraph_format.space_after = Pt(0)
        st.paragraph_format.line_spacing = 2.0
        st.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.CENTER if nivel == 1 else WD_ALIGN_PARAGRAPH.LEFT
        rpr = st.element.get_or_add_rPr()  # quita el color azul y la fuente de títulos del tema
        for hijo in list(rpr):
            if hijo.tag.endswith("}color") or hijo.tag.endswith("}rFonts"):
                rpr.remove(hijo)
        st.font.name = FUENTE

    sec = doc.sections[0]
    sec.page_width, sec.page_height = Cm(21.59), Cm(27.94)  # carta
    for lado in ("top_margin", "bottom_margin", "left_margin", "right_margin"):
        setattr(sec, lado, Cm(2.54))
    _numero_pagina(sec)

    # ---------------- Portada (esquema SENA) ----------------
    def linea(texto="", negrita=False, tam=TAMANO):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.line_spacing = 1.15
        if texto:
            _fuente(p.add_run(texto), tam, negrita)
        return p

    linea("SERVICIO NACIONAL DE APRENDIZAJE - SENA", True, TAMANO + 2)
    linea(portada.get("regional", ""))
    linea(portada.get("centro", ""))
    for _ in range(4):
        linea()
    linea((portada.get("titulo") or "[COMPLETAR: título de la evidencia]").upper(), True, TAMANO + 3)
    if portada.get("subtitulo"):
        linea(portada["subtitulo"])
    for _ in range(5):
        linea()
    linea("Presentado por:")
    linea(portada.get("nombre") or "[COMPLETAR: nombre]", True)
    linea(f"Ficha N.º {portada.get('ficha') or '[COMPLETAR]'}")
    linea(portada.get("programa", ""))
    linea()
    linea("Presentado al Instructor:")
    linea(portada.get("instructor") or "[COMPLETAR: instructor]")
    for _ in range(4):
        linea()
    if portada.get("componente"):
        linea(f"Componente formativo: {portada['componente']}")
    linea(f"{portada.get('ciudad') or '[COMPLETAR: ciudad]'} - {dt.date.today().year}")
    doc.add_paragraph().add_run().add_break(WD_BREAK.PAGE)

    # ---------------- Cuerpo APA 7 ----------------
    lineas = cuerpo_md.splitlines()
    tabla, en_referencias, n = None, False, 0
    while n < len(lineas):
        s = lineas[n].rstrip()
        n += 1
        if s.startswith("|") and s.endswith("|"):
            celdas = [c.strip() for c in s.strip("|").split("|")]
            if all(re.fullmatch(r":?-{2,}:?", c) for c in celdas):
                continue
            if tabla is None:
                tabla = doc.add_table(rows=0, cols=len(celdas))
            fila = tabla.add_row().cells
            for i, c in enumerate(celdas[: len(fila)]):
                p = fila[i].paragraphs[0]
                p.paragraph_format.line_spacing = 1.0
                _texto_con_formato(p, c, TAMANO - 1, negrita=True if len(tabla.rows) == 1 else None)
            continue
        if tabla is not None:
            _sin_bordes_verticales(tabla)
            tabla = None
        m = re.match(r"^(#{1,6})\s+(.*)", s)
        if m:
            texto = m.group(2).strip().strip("*")
            nivel = max(1, min(len(m.group(1)) - 2, 3))  # ### -> 1, #### -> 2, ##### -> 3
            if len(m.group(1)) <= 2:
                nivel = 1
            en_referencias = bool(re.match(r"referencias|bibliograf", texto, re.I))
            if en_referencias:
                doc.add_paragraph().add_run().add_break(WD_BREAK.PAGE)
                texto = "Referencias"
            h = doc.add_heading(level=nivel)
            _fuente(h.add_run(texto), TAMANO, True, nivel == 3)
            continue
        if re.match(r"^\*\*Tabla \d+\*\*", s) or re.match(r"^\*\*Figura \d+\*\*", s):
            p = doc.add_paragraph()
            _texto_con_formato(p, s)
            continue
        vineta = re.match(r"^\s*(?:[-*•]|\d+[.)])\s+(.*)", s)
        if vineta and not en_referencias:
            estilo = "List Number" if re.match(r"^\s*\d", s) else "List Bullet"
            p = doc.add_paragraph(style=estilo)
            p.paragraph_format.line_spacing = 2.0
            _texto_con_formato(p, vineta.group(1))
            continue
        if not s.strip() or s.strip() in ("---", "***"):
            continue
        p = doc.add_paragraph()
        if en_referencias:
            p.paragraph_format.left_indent = Cm(1.27)  # sangría francesa
            p.paragraph_format.first_line_indent = Cm(-1.27)
        else:
            p.paragraph_format.first_line_indent = Cm(1.27)
        _texto_con_formato(p, re.sub(r"^\s*[-*]\s+", "", s.strip()) if en_referencias else s.strip())
    if tabla is not None:
        _sin_bordes_verticales(tabla)
    doc.save(str(ruta))
