"""
Proveedores de IA: Claude (Anthropic) y Gemini (Google).

Orden de uso:
  1. Claude, si hay clave (clave_api.txt o ANTHROPIC_API_KEY).
  2. Gemini, si hay clave (clave_gemini.txt o GEMINI_API_KEY) y Claude no está o falla
     (por ejemplo, sin saldo). Gemini tiene un nivel gratuito: https://aistudio.google.com/apikey
Con --ia claude o --ia gemini se fuerza uno.
"""

from __future__ import annotations

import os
import re
from pathlib import Path

RAIZ = Path(__file__).resolve().parent
_preferido = "auto"
_modelo_claude = "claude-opus-5-5"
_modelo_gemini = ""  # vacío = elegir el Gemini Flash estable más reciente
_claude_caido = False


def _log(msg: str) -> None:
    from zajuna_transcriptor import log

    log(msg)


def _leer_clave(archivo: str, variable: str) -> str:
    if os.environ.get(variable):
        return os.environ[variable].strip()
    ruta = RAIZ / archivo
    if ruta.exists():
        clave = ruta.read_text(encoding="utf-8").strip()
        if clave:
            os.environ[variable] = clave
            return clave
    return ""


def configurar(preferido: str = "auto", modelo_claude: str = "", modelo_gemini: str = "") -> None:
    global _preferido, _modelo_claude, _modelo_gemini
    _preferido = preferido or "auto"
    _modelo_claude = modelo_claude or _modelo_claude
    _modelo_gemini = modelo_gemini or _modelo_gemini
    _leer_clave("clave_api.txt", "ANTHROPIC_API_KEY")
    _leer_clave("clave_gemini.txt", "GEMINI_API_KEY")


def hay_claude() -> bool:
    return bool(os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("ANTHROPIC_AUTH_TOKEN"))


def hay_gemini() -> bool:
    return bool(os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY"))


def disponible() -> bool:
    if _preferido == "claude":
        return hay_claude()
    if _preferido == "gemini":
        return hay_gemini()
    return hay_claude() or hay_gemini()


def descripcion() -> str:
    partes = []
    if hay_claude() and _preferido in ("auto", "claude"):
        partes.append("Claude")
    if hay_gemini() and _preferido in ("auto", "gemini"):
        partes.append("Gemini")
    return " → ".join(partes) or "ninguna"


def generar(sistema: str, contenido: str, con_web: bool = False) -> str:
    """Devuelve el texto generado ('' si no se pudo). Usa Claude y, si falla, Gemini."""
    global _claude_caido
    if _preferido in ("auto", "claude") and hay_claude() and not _claude_caido:
        try:
            return _claude(sistema, contenido, con_web)
        except Exception as e:
            if _preferido == "claude" or not hay_gemini():
                raise
            _claude_caido = True  # no se reintenta en esta ejecución
            _log(f"   Claude no respondió ({type(e).__name__}: {str(e)[:120]}). Sigo con Gemini.")
    if _preferido in ("auto", "gemini") and hay_gemini():
        return _gemini(sistema, contenido, con_web)
    return ""


# --------------------------------------------------------------------------- #
# Claude
# --------------------------------------------------------------------------- #
def _claude(sistema: str, contenido: str, con_web: bool) -> str:
    import anthropic

    client = anthropic.Anthropic()
    herramientas = [{"type": "web_search_20260209", "name": "web_search", "max_uses": 8,
                     "user_location": {"type": "approximate", "country": "CO"}}] if con_web else []
    mensajes = [{"role": "user", "content": contenido}]
    for _ in range(6):
        params = dict(model=_modelo_claude, max_tokens=64000, system=sistema, messages=mensajes,
                      betas=["server-side-fallback-2026-07-01"], fallbacks="default",
                      thinking={"type": "adaptive"}, output_config={"effort": "high"})
        if herramientas:
            params["tools"] = herramientas
        with client.beta.messages.stream(**params) as stream:
            resp = stream.get_final_message()
        if resp.stop_reason == "pause_turn":  # la búsqueda web sigue en curso: se reanuda
            mensajes = [mensajes[0], {"role": "assistant", "content": resp.content}]
            continue
        if resp.stop_reason == "refusal":
            _log("   Claude no pudo completar esta parte.")
            return ""
        texto = "".join(b.text for b in resp.content if b.type == "text").strip()
        if resp.stop_reason == "max_tokens":
            texto += "\n\n> ⚠️ Quedó incompleto por longitud."
        return texto
    _log("   La investigación tomó demasiados pasos.")
    return ""


# --------------------------------------------------------------------------- #
# Gemini
# --------------------------------------------------------------------------- #
_cliente_gemini = None


def _modelo_gemini_elegido(client) -> str:
    global _modelo_gemini
    if _modelo_gemini:
        return _modelo_gemini
    mejor, version = "gemini-2.5-flash", (2, 5)
    try:
        for m in client.models.list():
            nombre = (m.name or "").split("/")[-1]
            r = re.fullmatch(r"gemini-(\d+)(?:\.(\d+))?-flash", nombre)  # solo versiones estables
            if r:
                v = (int(r.group(1)), int(r.group(2) or 0))
                if v > version:
                    mejor, version = nombre, v
    except Exception:
        pass
    _modelo_gemini = mejor
    _log(f"   Usando Gemini: {mejor}")
    return mejor


def _gemini(sistema: str, contenido: str, con_web: bool) -> str:
    global _cliente_gemini
    from google import genai
    from google.genai import errors, types

    if _cliente_gemini is None:
        opciones = types.HttpOptions(base_url=os.environ["GEMINI_BASE_URL"]) if os.environ.get("GEMINI_BASE_URL") else None
        _cliente_gemini = genai.Client(api_key=os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY"),
                                       http_options=opciones)
    modelo = _modelo_gemini_elegido(_cliente_gemini)
    config = types.GenerateContentConfig(
        system_instruction=sistema,
        max_output_tokens=60000,
        tools=[types.Tool(google_search=types.GoogleSearch())] if con_web else None,
    )
    try:
        resp = _cliente_gemini.models.generate_content(model=modelo, contents=contenido, config=config)
    except errors.ClientError as e:
        if con_web:  # algunos planes o modelos no permiten la búsqueda: se intenta sin ella
            _log(f"   Gemini rechazó la búsqueda web ({str(e)[:100]}); intento sin búsqueda.")
            config.tools = None
            resp = _cliente_gemini.models.generate_content(model=modelo, contents=contenido, config=config)
        else:
            raise
    texto = (resp.text or "").strip()
    # Lista de páginas que Gemini consultó, para que el aprendiz las verifique
    fuentes = []
    try:
        meta = resp.candidates[0].grounding_metadata
        for ch in (meta.grounding_chunks or []) if meta else []:
            if ch.web and ch.web.uri:
                fuentes.append(f"- {ch.web.title or 'Fuente'}: {ch.web.uri}")
    except (AttributeError, IndexError, TypeError):
        pass
    if fuentes:
        texto += "\n\n## Páginas consultadas (verifícalas antes de citarlas)\n" + "\n".join(dict.fromkeys(fuentes))
    return texto
