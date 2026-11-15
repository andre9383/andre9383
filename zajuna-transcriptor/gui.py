"""
Asistente Zajuna – ventana principal.

Abre una ventana con:
  - Inicio: qué hacer, botón Iniciar/Detener, progreso y registro en vivo.
  - Resultados: actividades (pendientes y borradores) y clases (resúmenes), con doble clic para abrir.
  - Configuración: claves de Gemini/Claude y tu proyecto.
El trabajo lo hace zajuna_transcriptor.py en segundo plano.
"""

from __future__ import annotations

import json
import os
import queue
import shutil
import subprocess
import sys
import threading
import tkinter as tk
import webbrowser
from pathlib import Path
from tkinter import messagebox, ttk
from tkinter.scrolledtext import ScrolledText

RAIZ = Path(__file__).resolve().parent
SALIDA = RAIZ / "salida"
VERDE = "#39A900"  # verde institucional SENA


def abrir(ruta: Path | str) -> None:
    """Abre un archivo o carpeta con el programa predeterminado (los .md y .txt con el Bloc de notas)."""
    ruta = str(ruta)
    try:
        if sys.platform.startswith("win"):
            if ruta.lower().endswith((".md", ".txt")):
                subprocess.Popen(["notepad.exe", ruta])
            else:
                os.startfile(ruta)  # noqa: S606 - abrir archivos del propio usuario
        elif sys.platform == "darwin":
            subprocess.Popen(["open", ruta])
        else:
            subprocess.Popen(["xdg-open", ruta])
    except Exception as e:
        messagebox.showerror("No se pudo abrir", f"{ruta}\n\n{e}")


def python_consola() -> str:
    """Intérprete con salida de texto (pythonw no tiene consola; para el proceso hijo se usa python)."""
    exe = Path(sys.executable)
    candidato = exe.with_name("python.exe") if exe.name.lower() == "pythonw.exe" else exe
    return str(candidato if candidato.exists() else exe)


class App(tk.Tk):
    def __init__(self) -> None:
        super().__init__()
        self.title("Asistente Zajuna – SENA")
        self.geometry("980x680")
        self.minsize(820, 560)
        self.proc: subprocess.Popen | None = None
        self.cola: queue.Queue[str | None] = queue.Queue()

        estilo = ttk.Style(self)
        if "vista" in estilo.theme_names():
            estilo.theme_use("vista")
        estilo.configure("Titulo.TLabel", font=("Segoe UI", 16, "bold"), foreground=VERDE)
        estilo.configure("Sub.TLabel", font=("Segoe UI", 9), foreground="#555")
        estilo.configure("Grande.TButton", font=("Segoe UI", 11, "bold"), padding=8)

        cab = ttk.Frame(self, padding=(14, 10))
        cab.pack(fill="x")
        ttk.Label(cab, text="Asistente Zajuna", style="Titulo.TLabel").pack(side="left")
        ttk.Label(cab, text="  Clases transcritas, resúmenes y borradores de tus evidencias",
                  style="Sub.TLabel").pack(side="left", pady=(6, 0))

        self.tabs = ttk.Notebook(self)
        self.tabs.pack(fill="both", expand=True, padx=10, pady=(0, 10))
        self._tab_inicio()
        self._tab_resultados()
        self._tab_config()
        self.after(150, self._leer_cola)
        self.protocol("WM_DELETE_WINDOW", self._cerrar)
        self.refrescar_resultados()
        if not self._hay_clave():
            self.after(600, lambda: self.tabs.select(2))

    # ------------------------------------------------------------------ Inicio
    def _tab_inicio(self) -> None:
        f = ttk.Frame(self.tabs, padding=12)
        self.tabs.add(f, text="  Inicio  ")

        opciones = ttk.LabelFrame(f, text="¿Qué quieres hacer?", padding=10)
        opciones.pack(fill="x")
        self.modo = tk.StringVar(value="todo")
        for texto, valor in (("Todo: clases grabadas + actividades y borradores", "todo"),
                             ("Solo actividades, guías y borradores (rápido)", "actividades"),
                             ("Solo transcribir y resumir las clases grabadas", "grabaciones")):
            ttk.Radiobutton(opciones, text=texto, variable=self.modo, value=valor).pack(anchor="w", pady=1)

        fila = ttk.Frame(opciones)
        fila.pack(fill="x", pady=(8, 0))
        ttk.Label(fila, text="Clases desde (dd/mm/aaaa):").pack(side="left")
        self.desde = tk.StringVar()
        ttk.Entry(fila, textvariable=self.desde, width=12).pack(side="left", padx=(6, 18))
        self.ingles = tk.BooleanVar(value=False)
        ttk.Checkbutton(fila, text="Incluir clases de inglés", variable=self.ingles).pack(side="left", padx=(0, 18))
        ttk.Label(fila, text="IA:").pack(side="left")
        self.ia = tk.StringVar(value="auto")
        ttk.Combobox(fila, textvariable=self.ia, values=("auto", "gemini", "claude"), width=8,
                     state="readonly").pack(side="left", padx=6)

        botones = ttk.Frame(f)
        botones.pack(fill="x", pady=10)
        self.btn_iniciar = ttk.Button(botones, text="▶  Iniciar", style="Grande.TButton", command=self.iniciar)
        self.btn_iniciar.pack(side="left")
        self.btn_detener = ttk.Button(botones, text="■  Detener", command=self.detener, state="disabled")
        self.btn_detener.pack(side="left", padx=8)
        ttk.Button(botones, text="Abrir carpeta de resultados", command=lambda: abrir(SALIDA)).pack(side="right")

        self.estado = tk.StringVar(value="Listo. Pulsa Iniciar: se abrirá Zajuna para que inicies sesión.")
        ttk.Label(f, textvariable=self.estado).pack(anchor="w")
        self.barra = ttk.Progressbar(f, mode="indeterminate")
        self.barra.pack(fill="x", pady=(4, 8))

        self.registro = ScrolledText(f, height=18, font=("Consolas", 9), wrap="word", state="disabled")
        self.registro.pack(fill="both", expand=True)

    def _args(self) -> list[str]:
        a: list[str] = ["--ia", self.ia.get()]
        if self.modo.get() == "actividades":
            a.append("--solo-actividades")
        elif self.modo.get() == "grabaciones":
            a.append("--solo-grabaciones")
        if self.desde.get().strip():
            a += ["--desde", self.desde.get().strip()]
        if not self.ingles.get():
            a += ["--excluir", "ingles,inglés"]
        return a

    def iniciar(self) -> None:
        if self.proc and self.proc.poll() is None:
            return
        SALIDA.mkdir(exist_ok=True)
        self._escribir("\n=== Inicio ===\n")
        entorno = dict(os.environ, PYTHONIOENCODING="utf-8", PYTHONUNBUFFERED="1")
        extra = {"creationflags": subprocess.CREATE_NO_WINDOW} if sys.platform.startswith("win") else {}
        try:
            self.proc = subprocess.Popen(
                [python_consola(), "-u", str(RAIZ / "zajuna_transcriptor.py"), *self._args()],
                cwd=str(RAIZ), stdout=subprocess.PIPE, stderr=subprocess.STDOUT, env=entorno, **extra)
        except Exception as e:
            messagebox.showerror("No se pudo iniciar", str(e))
            return
        threading.Thread(target=self._lector, args=(self.proc,), daemon=True).start()
        self.btn_iniciar.config(state="disabled")
        self.btn_detener.config(state="normal")
        self.barra.start(12)
        self.estado.set("Trabajando… Si se abre Zajuna, inicia sesión en esa ventana y no la cierres.")

    def _lector(self, proc: subprocess.Popen) -> None:
        for linea in iter(proc.stdout.readline, b""):
            self.cola.put(linea.decode("utf-8", errors="replace"))
        proc.wait()
        self.cola.put(None)

    def _leer_cola(self) -> None:
        try:
            while True:
                linea = self.cola.get_nowait()
                if linea is None:
                    self._terminado()
                    continue
                self._escribir(linea)
                texto = linea.strip()
                if texto.startswith("[") and "]" in texto[:12]:
                    self.estado.set(texto.split("]", 1)[1].strip()[:140])
        except queue.Empty:
            pass
        self.after(150, self._leer_cola)

    def _escribir(self, texto: str) -> None:
        self.registro.config(state="normal")
        self.registro.insert("end", texto)
        self.registro.see("end")
        self.registro.config(state="disabled")

    def _terminado(self) -> None:
        codigo = self.proc.returncode if self.proc else 0
        self.barra.stop()
        self.btn_iniciar.config(state="normal")
        self.btn_detener.config(state="disabled")
        self.refrescar_resultados()
        if codigo == 0:
            self.estado.set("Terminado ✔  Revisa la pestaña Resultados.")
            self.tabs.select(1)
        else:
            self.estado.set(f"Se detuvo (código {codigo}). Lo avanzado quedó guardado; puedes volver a Iniciar.")

    def detener(self) -> None:
        if self.proc and self.proc.poll() is None:
            if messagebox.askyesno("Detener", "¿Detener el trabajo? Lo avanzado queda guardado."):
                self.proc.terminate()

    def _cerrar(self) -> None:
        if self.proc and self.proc.poll() is None:
            if not messagebox.askyesno("Salir", "Todavía está trabajando. ¿Detener y salir?"):
                return
            self.proc.terminate()
        self.destroy()

    # -------------------------------------------------------------- Resultados
    def _tab_resultados(self) -> None:
        f = ttk.Frame(self.tabs, padding=12)
        self.tabs.add(f, text="  Resultados  ")
        barra = ttk.Frame(f)
        barra.pack(fill="x")
        ttk.Label(barra, text="Doble clic para abrir el borrador o el resumen.").pack(side="left")
        ttk.Button(barra, text="Actualizar", command=self.refrescar_resultados).pack(side="right")

        ttk.Label(f, text="Actividades y evidencias", font=("Segoe UI", 10, "bold")).pack(anchor="w", pady=(10, 2))
        self.t_act = self._tabla(f, ("estado", "evidencia", "fecha", "borrador"),
                                 ("Estado", "Evidencia", "Fecha de entrega", "Borrador"), (110, 430, 200, 120))
        self.t_act.bind("<Double-1>", self._abrir_actividad)

        ttk.Label(f, text="Clases grabadas", font=("Segoe UI", 10, "bold")).pack(anchor="w", pady=(10, 2))
        self.t_cla = self._tabla(f, ("sesion", "estado", "resumen"),
                                 ("Sesión", "Estado", "Resumen"), (560, 160, 140))
        self.t_cla.bind("<Double-1>", self._abrir_clase)

    @staticmethod
    def _tabla(padre, columnas, titulos, anchos) -> ttk.Treeview:
        marco = ttk.Frame(padre)
        marco.pack(fill="both", expand=True)
        t = ttk.Treeview(marco, columns=columnas, show="headings", height=8)
        for c, ti, an in zip(columnas, titulos, anchos):
            t.heading(c, text=ti)
            t.column(c, width=an, anchor="w")
        sb = ttk.Scrollbar(marco, orient="vertical", command=t.yview)
        t.configure(yscrollcommand=sb.set)
        t.pack(side="left", fill="both", expand=True)
        sb.pack(side="right", fill="y")
        return t

    def refrescar_resultados(self) -> None:
        self._rutas_act: dict[str, str] = {}
        self._rutas_cla: dict[str, str] = {}
        for t in (self.t_act, self.t_cla):
            t.delete(*t.get_children())
        ruta = SALIDA / "actividades" / "actividades.json"
        if ruta.exists():
            try:
                acts = json.loads(ruta.read_text(encoding="utf-8"))
            except json.JSONDecodeError:
                acts = []
            for i, a in enumerate(sorted(acts, key=lambda x: (x.get("tipo") != "tarea", x.get("titulo", "")))):
                borr = self._buscar_borrador(a)
                estado = "📋 Cuestionario" if a.get("tipo") == "cuestionario" else (
                    "⏳ Pendiente" if self._pendiente(a) else "✅ Entregada")
                iid = f"a{i}"
                self.t_act.insert("", "end", iid=iid, values=(
                    estado, a.get("titulo", ""), a.get("fecha_entrega", "") or "—",
                    "Abrir Word" if borr else ("Pegar en IA" if self._buscar_borrador(a, "pegar") else "—")))
                self._rutas_act[iid] = borr or self._buscar_borrador(a, "pegar") or a.get("url", "")
        ruta = SALIDA / "estado.json"
        if ruta.exists():
            try:
                datos = json.loads(ruta.read_text(encoding="utf-8"))
            except json.JSONDecodeError:
                datos = {}
            for i, d in enumerate(sorted(datos.values(), key=lambda x: x.get("fecha", ""), reverse=True)):
                iid = f"c{i}"
                archivo = d.get("resumen") or d.get("prompt_manual") or d.get("transcripcion") or ""
                self.t_cla.insert("", "end", iid=iid, values=(
                    d.get("titulo", ""), d.get("estado", ""),
                    "Abrir" if d.get("resumen") else ("Pegar en IA" if d.get("prompt_manual") else "—")))
                self._rutas_cla[iid] = archivo or d.get("url", "")

    @staticmethod
    def _pendiente(a: dict) -> bool:
        e = (a.get("estado_entrega") or "").lower()
        if not e or any(p in e for p in ("no entregad", "no enviad", "no se ha", "sin entrega", "borrador",
                                         "reabierto", "devuelt", "draft", "no submission")):
            return True
        return not any(p in e for p in ("enviado para calificar", "submitted", "entregado", "enviada"))

    @staticmethod
    def _buscar_borrador(a: dict, tipo: str = "BORRADOR") -> str:
        carpeta = SALIDA / "actividades"
        if not carpeta.exists():
            return ""
        from zajuna_transcriptor import nombre_seguro

        clave = (a.get("codigo") or nombre_seguro(a.get("titulo", ""), 30)).lower()
        sufijo = "BORRADOR.docx" if tipo == "BORRADOR" else "pegar_en_claude.txt"
        for p in carpeta.rglob(f"*{sufijo}"):
            if clave and clave in p.name.lower():
                return str(p)
        return ""

    def _abrir_actividad(self, _e=None) -> None:
        sel = self.t_act.selection()
        if sel and self._rutas_act.get(sel[0]):
            r = self._rutas_act[sel[0]]
            webbrowser.open(r) if r.startswith("http") else abrir(r)

    def _abrir_clase(self, _e=None) -> None:
        sel = self.t_cla.selection()
        if sel and self._rutas_cla.get(sel[0]):
            r = self._rutas_cla[sel[0]]
            webbrowser.open(r) if r.startswith("http") else abrir(r)

    # ----------------------------------------------------------- Configuración
    def _tab_config(self) -> None:
        f = ttk.Frame(self.tabs, padding=14)
        self.tabs.add(f, text="  Configuración  ")

        ia = ttk.LabelFrame(f, text="Inteligencia artificial (para resúmenes y borradores)", padding=10)
        ia.pack(fill="x")
        ttk.Label(ia, text="Gemini tiene uso gratuito. Si pones las dos claves, usa Claude y, si falla, Gemini.").grid(
            row=0, column=0, columnspan=3, sticky="w", pady=(0, 8))
        self.k_gemini = tk.StringVar(value=self._leer("clave_gemini.txt"))
        self.k_claude = tk.StringVar(value=self._leer("clave_api.txt"))
        for fila, (nombre, var, url) in enumerate((
                ("Clave de Gemini:", self.k_gemini, "https://aistudio.google.com/apikey"),
                ("Clave de Claude:", self.k_claude, "https://console.anthropic.com/"),), start=1):
            ttk.Label(ia, text=nombre).grid(row=fila, column=0, sticky="w")
            ttk.Entry(ia, textvariable=var, width=60, show="•").grid(row=fila, column=1, padx=8, pady=3, sticky="we")
            ttk.Button(ia, text="Conseguir clave", command=lambda u=url: webbrowser.open(u)).grid(row=fila, column=2)
        ttk.Button(ia, text="Guardar claves", command=self._guardar_claves).grid(row=3, column=1, sticky="w", pady=8)
        ia.columnconfigure(1, weight=1)

        pr = ttk.LabelFrame(f, text="Tu proyecto formativo", padding=10)
        pr.pack(fill="x", pady=12)
        ttk.Label(pr, text="Los borradores usan este archivo para hablar de tu caso y no de ejemplos genéricos.").pack(anchor="w")
        ttk.Button(pr, text="Editar mi proyecto", command=self._editar_proyecto).pack(anchor="w", pady=6)

        otros = ttk.LabelFrame(f, text="Otros", padding=10)
        otros.pack(fill="x")
        ttk.Button(otros, text="Carpeta para videos que descargues tú (videos_manuales)",
                   command=lambda: abrir(RAIZ / "videos_manuales")).pack(anchor="w", pady=2)
        ttk.Button(otros, text="Abrir Zajuna en tu navegador",
                   command=lambda: webbrowser.open("https://zajuna.sena.edu.co/zajuna/my/courses.php")).pack(anchor="w", pady=2)

    @staticmethod
    def _leer(nombre: str) -> str:
        p = RAIZ / nombre
        return p.read_text(encoding="utf-8").strip() if p.exists() else ""

    def _hay_clave(self) -> bool:
        return bool(self._leer("clave_gemini.txt") or self._leer("clave_api.txt"))

    def _guardar_claves(self) -> None:
        for nombre, var in (("clave_gemini.txt", self.k_gemini), ("clave_api.txt", self.k_claude)):
            p = RAIZ / nombre
            valor = var.get().strip()
            if valor:
                p.write_text(valor, encoding="utf-8")
            elif p.exists():
                p.unlink()
        messagebox.showinfo("Claves", "Claves guardadas.")

    def _editar_proyecto(self) -> None:
        p = RAIZ / "mi_proyecto.md"
        if not p.exists() and (RAIZ / "mi_proyecto.ejemplo.md").exists():
            shutil.copy(RAIZ / "mi_proyecto.ejemplo.md", p)
        abrir(p)


if __name__ == "__main__":
    App().mainloop()
