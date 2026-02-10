from __future__ import annotations

from typing import Any


def hex_to_rgba(color: str, alpha: float) -> str:
    s = (color or "").strip()
    if not s.startswith("#") or len(s) not in (4, 7):
        return f"rgba(0,0,0,{alpha})"
    if len(s) == 4:
        r = int(s[1] * 2, 16)
        g = int(s[2] * 2, 16)
        b = int(s[3] * 2, 16)
    else:
        r = int(s[1:3], 16)
        g = int(s[3:5], 16)
        b = int(s[5:7], 16)
    a = max(0.0, min(1.0, float(alpha)))
    return f"rgba({r},{g},{b},{a})"


def escape_html(text: str) -> str:
    s = text if isinstance(text, str) else str(text)
    return (
        s.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&#39;")
    )


def region_label_html(label: str, meta: dict) -> str:
    subtokens = (meta or {}).get("subtokens")
    if isinstance(subtokens, list) and subtokens:
        out: list[str] = []
        for st in subtokens:
            if not isinstance(st, dict):
                continue
            t = escape_html(str(st.get("text") or ""))
            st_status = str(st.get("status") or "")
            if st_status == "missing_suffix":
                cls = "word-part word-part-suffix-missing"
            elif st_status == "insertion_suffix":
                cls = "word-part word-part-suffix-insertion"
            else:
                cls = "word-part"
            out.append(f'<span class="{cls}">{t}</span>')
        if out:
            return "".join(out)
    return escape_html(label or "")


def region_color(colors: Any, kind: str, status: str, *, minor: bool = False) -> str:
    if kind == "pause":
        return hex_to_rgba(colors.warning if status == "warning" else colors.border, 0.35)
    if status in ("missing", "insertion"):
        return hex_to_rgba(colors.danger, 0.35)
    if status == "substitution":
        return hex_to_rgba(colors.warning, 0.18 if minor else 0.35)
    return hex_to_rgba(colors.success, 0.28)

