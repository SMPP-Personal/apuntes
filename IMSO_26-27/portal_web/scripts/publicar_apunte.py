#!/usr/bin/env python3
"""Converte un .md de contenidos_src a HTML no portal_web usando plantilla_base."""

from __future__ import annotations

import html
import re
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC_ROOT = ROOT / "contenidos_src"
DST_ROOT = ROOT / "portal_web"
TEMPLATE = ROOT / "templates" / "plantilla_base.html"
ASSETS_DIR = ROOT / "assets"

EXERCISE_RE = re.compile(r"^(exercicio|actividade|actividad)\b", re.I)
NOTA_RE = re.compile(r"^nota\b", re.I)
GRUPO_RE = re.compile(r"^\d+\.\s+")
EXERCISE_TITLE_RE = re.compile(r"^exercicio\s+(\d+)\s*[–\-]\s*(.+)$", re.I)
STEP_LINE_RE = re.compile(r"^(\d+)\.\s+(.+)$")
SUBSTEP_LINE_RE = re.compile(r"^([a-z]\))\s+(.+)$", re.I)
CMD_RE = re.compile(r"^`([^`]+)`(.*)$")


def inline_format(text: str) -> str:
    text = html.escape(text)
    text = re.sub(r"`([^`]+)`", r'<code class="px-1">\1</code>', text)
    text = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", text)
    text = re.sub(r"\*([^*]+)\*", r"<em>\1</em>", text)
    return text


def cmd_pre(command: str) -> str:
    return (
        f'<pre class="cmd-pre"><code>{html.escape(command.strip())}</code></pre>'
    )


def slugify(title: str) -> str:
    s = re.sub(r"<[^>]+>", "", title)
    s = s.lower()
    s = re.sub(r"[^\w\s-]", "", s, flags=re.UNICODE)
    s = re.sub(r"\s+", "-", s.strip())
    return s[:80] or "seccion"


def platform_from_title(title: str) -> str:
    t = title.lower()
    if "linux" in t:
        return "linux"
    if "windows" in t or "powershell" in t or "cmd" in t:
        return "windows"
    return ""


def badge_for_heading(title: str, lvl: int) -> str:
    plat = platform_from_title(title)
    if lvl == 2 and plat == "windows":
        return '<span class="badge rounded-pill text-bg-light ms-2">Windows</span>'
    if lvl == 2 and plat == "linux":
        return '<span class="badge rounded-pill text-bg-light ms-2">Linux</span>'
    return ""


def title_to_page_title(stem: str) -> str:
    m = re.match(r"^UD\d+_(?:SB|A\d|B\d)_apuntes_(.+)$", stem, re.I)
    if m:
        name = m.group(1).replace("_", " ")
        if "windows" in name.lower() and "linux" in name.lower():
            return "Comandos básicos: Windows e Linux"
        return name[0].upper() + name[1:] if name else stem
    m = re.match(r"^UD\d+_SB_exercicios_(.+)$", stem, re.I)
    if m:
        plat = m.group(1).replace("_", " ").strip()
        return f"Exercicios: {plat[0].upper()}{plat[1:]}"
    m = re.match(r"^UD\d+_A(\d+)_guion_practicas_(.+)$", stem, re.I)
    if m:
        num = m.group(1)
        name = m.group(2).replace("_", " ").strip()
        return f"A{num} · Guión de prácticas · {name[0].upper()}{name[1:]}"
    name = stem.replace("_", " ")
    name = re.sub(r"^UD\d+\s*", "", name, flags=re.I)
    return name.strip() if name else stem


def format_exercise_title(title: str) -> str:
    plain = re.sub(r"\*\*([^*]+)\*\*", r"\1", title)
    m = EXERCISE_TITLE_RE.match(plain.strip())
    if m:
        num, subtitle = m.group(1), m.group(2).strip()
        return (
            f'<span class="imso-ex-num me-2">{num}</span>'
            f"{inline_format(subtitle)}"
        )
    return inline_format(title)


def parse_command_item(content: str) -> tuple[str | None, str]:
    m = CMD_RE.match(content.strip())
    if m:
        tail = m.group(2).strip()
        if tail.startswith("—") or tail.startswith("-"):
            tail = tail[1:].strip()
        return m.group(1), tail
    return None, content


def css_relative_path(out_path: Path) -> str:
    """Calcula a ruta relativa dende o HTML xerado ata assets/imso.css."""
    css_path = ASSETS_DIR / "imso.css"
    return str(css_path.relative_to(out_path.parent, walk_up=True)).replace("\\", "/")


def favicon_relative_path(out_path: Path, filename: str) -> str:
    """Calcula a ruta relativa dende o HTML xerado ata assets/imax/<filename>."""
    fav_path = ASSETS_DIR / "imax" / filename
    return str(fav_path.relative_to(out_path.parent, walk_up=True)).replace("\\", "/")


class MdRenderer:
    def __init__(self, exercise_doc: bool = False) -> None:
        self.parts: list[str] = []
        self.list_stack: list[int] = []
        self.platform_card = False
        self.section_card = False
        self.exercise_open = False
        self.cmd_group_open = False
        self.indication_list_open = False
        self.context_list_open = False
        self.current_platform = ""
        self.id_prefix = ""
        self.exercise_doc = exercise_doc

    def emit(self, line: str) -> None:
        self.parts.append(line)

    def close_cmd_group(self) -> None:
        if self.cmd_group_open:
            self.emit("</div>")
            self.cmd_group_open = False

    def close_lists(self, target_indent: int = -1) -> None:
        while self.list_stack and self.list_stack[-1] > target_indent:
            self.emit("</ul>")
            self.list_stack.pop()

    def close_section_card(self) -> None:
        self.close_cmd_group()
        self.close_lists()
        if self.section_card:
            self.emit("</div></div>")
            self.section_card = False

    def close_platform_card(self) -> None:
        self.close_section_card()
        if self.platform_card:
            self.emit("</div></div>")
            self.platform_card = False
            self.current_platform = ""
            self.id_prefix = ""

    def make_id(self, title: str) -> str:
        return slugify(f"{self.id_prefix}{title}")

    def close_indication_list(self) -> None:
        if self.indication_list_open:
            self.emit("</ul>")
            self.indication_list_open = False

    def close_context_list(self) -> None:
        if self.context_list_open:
            self.emit("</ul>")
            self.context_list_open = False

    def close_exercise(self) -> None:
        self.close_indication_list()
        self.close_context_list()
        self.close_lists()
        if self.exercise_open:
            self.emit("</div>")
            self.exercise_open = False

    def open_platform_card(self, title: str, hid: str) -> None:
        self.close_platform_card()
        self.close_exercise()
        plat = platform_from_title(title)
        self.current_platform = plat
        self.id_prefix = (
            "win-" if plat == "windows" else "lin-" if plat == "linux" else ""
        )
        plat_class = f" platform-{plat}" if plat else ""
        icon = (
            '<i class="bi bi-windows me-2"></i>'
            if plat == "windows"
            else '<i class="bi bi-ubuntu me-2"></i>' if plat == "linux" else ""
        )
        # Eliminamos a palabra da plataforma do título para evitar duplicados
        clean_title = re.sub(r"\b(Windows|Linux)\b", "", title, flags=re.I).strip(" –-")
        self.emit(
            f'<div class="card section-platform{plat_class} mb-4 shadow-sm" id="{hid}">'
        )
        self.emit(
            f'<div class="card-header d-flex align-items-center flex-wrap gap-2">'
            f"{icon}<span>{inline_format(clean_title)}</span>"
            f"{badge_for_heading(title, 2)}</div>"
        )
        self.emit('<div class="card-body">')
        self.platform_card = True

    def open_section_card(self, title: str, hid: str, lvl: int) -> None:
        self.close_section_card()
        self.close_exercise()
        tag = "h3" if lvl == 3 else "h4"
        badge = "" if self.exercise_doc else badge_for_heading(title, lvl)
        self.emit(f'<div class="card section-card mb-3 shadow-sm" id="{hid}">')
        self.emit(
            f'<div class="card-header {tag} mb-0">'
            f"{inline_format(title)}{badge}</div>"
        )
        self.emit('<div class="card-body">')
        self.section_card = True

    def open_grupo_ejercicios(self, title: str, hid: str) -> None:
        self.close_section_card()
        self.close_exercise()
        self.emit(
            f'<h3 class="imso-grupo-ejercicios mt-5 mb-3 pb-2 border-bottom" id="{hid}">'
            f'<i class="bi bi-journal-bookmark me-2 text-primary"></i>'
            f"{inline_format(title)}</h3>"
        )

    def open_exercise(self, title: str, hid: str) -> None:
        self.close_section_card()
        self.close_platform_card()
        self.close_exercise()
        self.emit(
            f'<div class="alert alert-primary imso-ejercicio mb-4" role="alert" id="{hid}">'
        )
        self.emit(
            f'<h2 class="imso-ejercicio-titulo h5">'
            f'<i class="bi bi-pencil-square me-2"></i>'
            f"{format_exercise_title(title)}</h2>"
        )
        self.exercise_open = True

    def open_nota(self, title: str, hid: str) -> None:
        self.close_exercise()
        self.emit(
            f'<div class="alert alert-warning imso-nota mb-4" role="alert" id="{hid}">'
        )
        self.emit(
            f'<h2 class="alert-heading h6">'
            f'<i class="bi bi-lightbulb"></i> {inline_format(title)}</h2>'
        )
        self.exercise_open = True  # reuse close container

    def render_exercise_list_item(self, indent: int, content: str) -> None:
        cmd, tail = parse_command_item(content)
        pad = "ms-4" if indent <= 2 else "ms-5 ps-2"

        if cmd and indent <= 2:
            self.close_indication_list()
            if not self.context_list_open:
                self.emit('<ul class="list-unstyled imso-contexto mb-3">')
                self.context_list_open = True
            self.emit('<li class="imso-dato">')
            self.emit(cmd_pre(cmd))
            if tail:
                self.emit(
                    f'<p class="mb-0 mt-1 small text-muted">{inline_format(tail)}</p>'
                )
            self.emit("</li>")
            return

        self.close_context_list()
        self.close_lists()
        if not self.indication_list_open:
            self.emit(f'<ul class="list-unstyled imso-indicacions {pad} mb-3">')
            self.indication_list_open = True
        body = inline_format(content)
        if cmd:
            body = cmd_pre(cmd) + (
                f'<p class="mb-0 mt-2 small">{inline_format(tail)}</p>'
                if tail
                else ""
            )
        self.emit(f'<li class="imso-indicacion">{body}</li>')

    def render_table(self, header_row: str, rows: list[str]) -> None:
        """Renderiza unha táboa Markdown como <table> Bootstrap."""
        def parse_row(row: str) -> list[str]:
            cells = [c.strip() for c in row.strip().strip("|").split("|")]
            return cells

        headers = parse_row(header_row)
        self.emit('<div class="table-responsive mb-3">')
        self.emit('<table class="table table-bordered table-sm table-hover">')
        self.emit('<thead class="table-light"><tr>')
        for h in headers:
            self.emit(f"<th>{inline_format(h)}</th>")
        self.emit("</tr></thead>")
        self.emit("<tbody>")
        for row in rows:
            self.emit("<tr>")
            for cell in parse_row(row):
                self.emit(f"<td>{inline_format(cell)}</td>")
            self.emit("</tr>")
        self.emit("</tbody></table></div>")

    def render_blockquote(self, lines_bq: list[str]) -> None:
        """Renderiza un bloque > como callout."""
        # Detectar se é unha nota especial (> **Nota:**)
        joined = " ".join(l.strip() for l in lines_bq)
        is_note = bool(re.match(r"\*\*(Nota|Importante|Atención|Warning|Info)[:\*]", joined.strip()))
        cls = "alert alert-info" if is_note else "blockquote-custom"
        icon = '<i class="bi bi-info-circle me-2"></i>' if is_note else ""
        self.emit(f'<div class="{cls} mb-3 p-3 rounded">{icon}')
        for l in lines_bq:
            stripped = l.strip()
            if stripped:
                self.emit(f'<p class="mb-1">{inline_format(stripped)}</p>')
        self.emit("</div>")

    def render_paragraph(self, stripped: str) -> None:
        if not self.exercise_open:
            self.emit(f"<p>{inline_format(stripped)}</p>")
            return

        m = STEP_LINE_RE.match(stripped)
        if m:
            self.close_indication_list()
            self.close_context_list()
            self.close_lists()
            n, body = m.group(1), m.group(2)
            self.emit('<div class="imso-paso d-flex gap-2 align-items-start mb-3">')
            self.emit(
                f'<span class="badge rounded-pill text-bg-primary '
                f'flex-shrink-0 mt-1">{n}</span>'
            )
            self.emit(
                f'<div class="imso-paso-texto">{inline_format(body)}</div></div>'
            )
            return

        m = re.match(r"^-\s+(.+)$", stripped)
        if m:
            self.close_context_list()
            if not self.indication_list_open:
                self.emit('<ul class="list-unstyled imso-indicacions ms-4 mb-3">')
                self.indication_list_open = True
            self.emit(f'<li class="imso-indicacion">{inline_format(m.group(1))}</li>')
            return

        m = SUBSTEP_LINE_RE.match(stripped)
        if m:
            self.close_indication_list()
            self.emit(
                f'<p class="imso-subpaso ms-4 mb-2">'
                f'<span class="text-primary fw-semibold">{html.escape(m.group(1))}</span> '
                f"{inline_format(m.group(2))}</p>"
            )
            return

        self.emit(f'<p class="imso-enunciado mb-3">{inline_format(stripped)}</p>')

    def render_list_item(self, indent: int, content: str) -> None:
        if self.exercise_open:
            self.render_exercise_list_item(indent, content)
            return

        cmd, tail = parse_command_item(content)
        if cmd and indent == 0 and (self.platform_card or self.section_card):
            self.close_lists()
            if not self.cmd_group_open:
                self.emit('<div class="list-group list-group-flush mb-3">')
                self.cmd_group_open = True
            self.emit('<div class="list-group-item cmd-item">')
            self.emit(cmd_pre(cmd))
            if tail:
                self.emit(f'<p class="mb-0 small">{inline_format(tail)}</p>')
            self.emit("</div>")
            return

        if not self.list_stack or self.list_stack[-1] < indent:
            self.emit("<ul>")
            self.list_stack.append(indent)
        elif self.list_stack[-1] > indent:
            while self.list_stack and self.list_stack[-1] > indent:
                self.emit("</ul>")
                self.list_stack.pop()
            self.emit("<ul>")
            self.list_stack.append(indent)

        body = inline_format(content)
        if cmd:
            body = cmd_pre(cmd) + (
                f'<p class="mb-0 mt-2 small">{inline_format(tail)}</p>'
                if tail
                else ""
            )
        self.emit(f"<li>{body}</li>")

    def render(self, md: str) -> str:
        lines = md.splitlines()
        i = 0
        while i < len(lines):
            raw = lines[i]
            stripped = raw.strip()

            if stripped.startswith("```"):
                self.close_indication_list()
                self.close_context_list()
                self.close_lists()
                i += 1
                # Eliminar identificador de linguaxe residual na primeira liña do bloque
                # (artefacto de conversión PDF→MD onde ```text quedaba partido en dúas liñas)
                _LANG_IDS = {"text", "bash", "sh", "shell", "python", "py",
                             "powershell", "ps1", "sql", "json", "yaml",
                             "html", "css", "js", "javascript", "xml", "ini",
                             "conf", "log", "txt", "plain"}
                code_lines: list[str] = []
                while i < len(lines) and not lines[i].strip().startswith("```"):
                    code_lines.append(lines[i])
                    i += 1
                # Se a primeira liña é só un identificador de linguaxe, elimínase
                if code_lines:
                    first = code_lines[0].strip()
                    if first in _LANG_IDS:
                        code_lines = code_lines[1:]
                    else:
                        # Identificador pegado ao inicio do contido (ex: "text2024-10-01...")
                        for lang in _LANG_IDS:
                            if first.startswith(lang) and len(first) > len(lang):
                                code_lines[0] = code_lines[0].replace(lang, "", 1)
                                break
                if code_lines:
                    code = html.escape("\n".join(code_lines))
                    self.emit(
                        f'<pre class="block-code mb-3"><code>{code}</code></pre>'
                    )
                if i < len(lines):
                    i += 1
                continue

            if stripped == "------":
                self.close_section_card()
                if self.exercise_open:
                    self.close_exercise()
                elif not self.platform_card:
                    self.emit('<hr class="my-4">')
                i += 1
                continue

            # ── H1 ──────────────────────────────────────────────────
            if stripped.startswith("# ") and not stripped.startswith("## "):
                title = stripped[2:].strip()
                # O H1 do MD é o título principal — non o repetimos (xa está na plantilla)
                # pero gardámolo como H2 visual só se non é o primeiro título do doc
                if self.parts:
                    self.close_section_card()
                    self.close_platform_card()
                    hid = slugify(title)
                    self.emit(
                        f'<h2 id="{hid}" class="mt-5 mb-3 border-bottom pb-2">'
                        f"{inline_format(title)}</h2>"
                    )
                i += 1
                continue

            # ── H2 ──────────────────────────────────────────────────
            if stripped.startswith("## "):
                title = stripped[3:].strip()
                plain = re.sub(r"\*\*([^*]+)\*\*", r"\1", title)

                if EXERCISE_RE.match(plain):
                    self.open_exercise(title, self.make_id(title))
                elif NOTA_RE.match(plain):
                    self.open_nota(title, self.make_id(title))
                elif title.startswith("Bloque "):
                    self.open_platform_card(title, slugify(title))
                elif re.match(r"^\d+\.\d+\.", plain):
                    self.close_cmd_group()
                    self.close_lists()
                    hid = self.make_id(title)
                    self.emit(
                        f'<h4 id="{hid}" class="mt-3 mb-2">'
                        f"{inline_format(title)}{badge_for_heading(title, 4)}</h4>"
                    )
                elif GRUPO_RE.match(plain) and self.exercise_doc:
                    self.open_grupo_ejercicios(title, slugify(title))
                elif re.match(r"^\d+\.", plain):
                    self.open_section_card(title, self.make_id(title), 3)
                else:
                    self.close_section_card()
                    self.close_lists()
                    hid = self.make_id(title)
                    self.emit(
                        f'<h3 id="{hid}" class="mt-4 mb-2">'
                        f"{inline_format(title)}</h3>"
                    )
                i += 1
                continue

            # ── H3 ──────────────────────────────────────────────────
            if stripped.startswith("### "):
                title = stripped[4:].strip()
                plain = re.sub(r"\*\*([^*]+)\*\*", r"\1", title)
                if re.match(r"^\d+\.\d+\.", plain):
                    # subsección numerada X.Y.Z → open_section_card nivel 4
                    self.open_section_card(title, self.make_id(title), 4)
                else:
                    self.close_section_card()
                    self.close_lists()
                    hid = self.make_id(title)
                    self.emit(
                        f'<h4 id="{hid}" class="mt-4 mb-2 fw-semibold">'
                        f"{inline_format(title)}</h4>"
                    )
                i += 1
                continue

            # ── H4 ──────────────────────────────────────────────────
            if stripped.startswith("#### "):
                title = stripped[5:].strip()
                self.close_lists()
                hid = self.make_id(title)
                self.emit(
                    f'<h5 id="{hid}" class="mt-3 mb-2 fw-semibold text-secondary">'
                    f"{inline_format(title)}</h5>"
                )
                i += 1
                continue

            # ── H5 / H6 ─────────────────────────────────────────────
            if stripped.startswith("##### ") or stripped.startswith("###### "):
                title = re.sub(r"^#{5,6} ", "", stripped).strip()
                self.close_lists()
                self.emit(
                    f'<h6 class="mt-3 mb-1 text-muted fst-italic">'
                    f"{inline_format(title)}</h6>"
                )
                i += 1
                continue

            # ── TÁBOA ───────────────────────────────────────────────
            if stripped.startswith("|"):
                header_row = stripped
                i += 1
                # liña de separador |---|---|
                if i < len(lines) and re.match(r"^\|[\s\-|:]+\|?\s*$", lines[i].strip()):
                    i += 1
                data_rows: list[str] = []
                while i < len(lines) and lines[i].strip().startswith("|"):
                    data_rows.append(lines[i].strip())
                    i += 1
                self.close_lists()
                self.render_table(header_row, data_rows)
                continue

            # ── BLOCKQUOTE ──────────────────────────────────────────
            if stripped.startswith("> ") or stripped == ">":
                bq_lines: list[str] = []
                while i < len(lines) and (lines[i].strip().startswith(">") or lines[i].strip().startswith("> ")):
                    bq_lines.append(lines[i].strip().lstrip(">").strip())
                    i += 1
                self.close_lists()
                self.render_blockquote(bq_lines)
                continue

            # ── LISTA NON ORDENADA (- ou *) ─────────────────────────
            m = re.match(r"^([ \t]*)[-*][ \t]+(.*)$", raw)
            if m:
                indent = len(m.group(1))
                self.render_list_item(indent, m.group(2).strip())
                i += 1
                continue

            # ── LISTA ORDENADA (1. 2. ...) fóra de exercicio ────────
            if not self.exercise_open:
                mo = re.match(r"^([ \t]*)\d+\.[ \t]+(.*)$", raw)
                if mo:
                    indent = len(mo.group(1))
                    content = mo.group(2).strip()
                    if not self.list_stack or self.list_stack[-1] < indent:
                        self.emit('<ol class="mb-2">')
                        self.list_stack.append(indent)
                    self.emit(f"<li>{inline_format(content)}</li>")
                    # Pechar se a seguinte liña xa non é lista ordenada
                    if i + 1 < len(lines) and not re.match(r"^[ \t]*\d+\.", lines[i+1]):
                        self.emit("</ol>")
                        self.list_stack.pop()
                    i += 1
                    continue

            if stripped == "":
                self.close_lists()
                i += 1
                continue

            self.close_lists()
            self.render_paragraph(stripped)
            i += 1

        self.close_section_card()
        self.close_platform_card()
        self.close_exercise()
        return "\n".join(self.parts)


def toc_label_from_html(inner: str) -> str:
    text = re.sub(
        r'<span class="badge[^"]*">.*?</span>', "", inner, flags=re.DOTALL
    )
    text = re.sub(r"<i[^>]*>.*?</i>", "", text, flags=re.DOTALL)
    text = re.sub(r"<[^>]+>", "", text)
    return re.sub(r"\s+", " ", text).strip()


def build_toc(article_html: str) -> str:
    """Índice na orde do documento."""
    entries: list[tuple[int, str, str]] = []

    for m in re.finditer(
        r'<div class="card [^"]*\b(section-platform|section-card)\b[^"]*" id="([^"]+)"',
        article_html,
    ):
        start = m.start()
        hid = m.group(2)
        chunk = article_html[start : start + 1200]
        hm = re.search(
            r'<div class="card-header[^"]*">(.*?)</div>', chunk, re.DOTALL
        )
        if not hm:
            continue
        text = toc_label_from_html(hm.group(1))
        pad = 0 if m.group(1) == "section-platform" else 2
        entries.append((start, pad, hid, text))

    for m in re.finditer(r'<h4 id="([^"]+)"[^>]*>(.*?)</h4>', article_html, re.DOTALL):
        entries.append((m.start(), 3, m.group(1), toc_label_from_html(m.group(2))))

    for m in re.finditer(
        r'<h3 class="imso-grupo-ejercicios[^"]*" id="([^"]+)"[^>]*>(.*?)</h3>',
        article_html,
        re.DOTALL,
    ):
        entries.append((m.start(), 1, m.group(1), toc_label_from_html(m.group(2))))

    for m in re.finditer(
        r'<div class="alert[^"]*imso-ejercicio[^"]*" id="([^"]+)"',
        article_html,
    ):
        start = m.start()
        hid = m.group(1)
        chunk = article_html[start : start + 600]
        hm = re.search(
            r'<h2 class="imso-ejercicio-titulo[^"]*">(.*?)</h2>', chunk, re.DOTALL
        )
        if hm:
            text = toc_label_from_html(hm.group(1))
            if text:
                entries.append((start, 2, hid, f"Exercicio {text}"))

    entries.sort(key=lambda x: x[0])
    items = []
    seen: set[str] = set()
    for _, pad, hid, text in entries:
        if hid in seen or not text:
            continue
        seen.add(hid)
        pad_cls = f"ms-{pad}" if pad else ""
        items.append(
            f'<a class="nav-link {pad_cls} py-1" href="#{hid}">'
            f"{html.escape(text)}</a>"
        )
    return "\n".join(items)


def publish(md_path: Path) -> Path:
    rel = md_path.relative_to(SRC_ROOT)
    out_path = DST_ROOT / rel.with_suffix(".html")

    md_text = md_path.read_text(encoding="utf-8")
    page_title = title_to_page_title(md_path.stem)
    exercise_doc = "exercicio" in md_path.stem.lower()
    article = MdRenderer(exercise_doc=exercise_doc).render(md_text)
    toc = build_toc(article)

    template = TEMPLATE.read_text(encoding="utf-8")

    # Ruta relativa ao CSS dende o HTML xerado
    css_path = css_relative_path(out_path)
    template = template.replace("CSS_PATH", css_path)
    template = template.replace("FAVICON_SVG_PATH", favicon_relative_path(out_path, "favicon.svg"))
    template = template.replace("FAVICON_32_PATH",  favicon_relative_path(out_path, "favicon-32x32.png"))
    template = template.replace("FAVICON_192_PATH", favicon_relative_path(out_path, "favicon-192x192.png"))

    template = template.replace(
        "<title>IMSO - Portal de Formación</title>",
        f"<title>IMSO – {html.escape(page_title)}</title>",
    )
    template = template.replace(
        '<li class="breadcrumb-item active" id="breadcrumb-current">Tema Actual</li>',
        f'<li class="breadcrumb-item active" id="breadcrumb-current">{html.escape(page_title)}</li>',
    )
    template = re.sub(
        r'<nav id="toc" class="nav flex-column small">\s*</nav>',
        f'<nav id="toc" class="nav flex-column small">\n{toc}\n</nav>',
        template,
    )

    def _article_repl(_m: re.Match[str]) -> str:
        return (
            f'<article id="content">\n'
            f'<h1 class="mb-2">{html.escape(page_title)}</h1>\n'
            f'<p class="lead mb-4">Apuntes do módulo IMSO · CIFP A Carballeira</p>\n'
            f"{article}\n"
            "</article>"
        )

    template = re.sub(
        r'<article id="content">.*?</article>',
        _article_repl,
        template,
        flags=re.DOTALL,
    )
    template = template.replace(
        '<span id="fecha-actualizacion">2026</span>',
        f'<span id="fecha-actualizacion">{date.today().strftime("%d/%m/%Y")}</span>',
    )

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(template, encoding="utf-8")
    return out_path


def main() -> None:
    if len(sys.argv) < 2:
        print("Uso: publicar_apunte.py <ruta_relativa_desde_contenidos_src>")
        sys.exit(1)
    md_path = SRC_ROOT / sys.argv[1]
    if not md_path.exists():
        md_path = Path(sys.argv[1])
    if not md_path.exists():
        print(f"Non atopado: {md_path}")
        sys.exit(1)
    out = publish(md_path.resolve())
    print(out)


if __name__ == "__main__":
    main()
