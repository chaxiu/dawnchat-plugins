from __future__ import annotations

import csv
import re
import shutil
import sqlite3
from dataclasses import dataclass
from pathlib import Path
from typing import Optional


def _connect(path: Path) -> sqlite3.Connection:
    conn = sqlite3.connect(str(path))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = DELETE")
    conn.execute("PRAGMA synchronous = NORMAL")
    conn.execute("PRAGMA busy_timeout = 5000")
    return conn


def build_lexicon_sqlite(*, csv_path: Path, out_path: Path) -> None:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    tmp_path = out_path.with_suffix(out_path.suffix + ".tmp")
    if tmp_path.exists():
        tmp_path.unlink(missing_ok=True)

    with _connect(tmp_path) as conn:
        conn.executescript(
            """
            DROP TABLE IF EXISTS words;
            CREATE TABLE words (
              word TEXT PRIMARY KEY,
              tran TEXT,
              type INTEGER,
              frq INTEGER,
              exchange TEXT
            );
            CREATE INDEX IF NOT EXISTS idx_words_type ON words(type);
            CREATE INDEX IF NOT EXISTS idx_words_frq ON words(frq);
            """
        )

        batch: list[tuple[str, Optional[str], Optional[int], Optional[int], Optional[str]]] = []
        with csv_path.open("r", encoding="utf-8", newline="") as f:
            reader = csv.DictReader(f)
            for row in reader:
                word = (row.get("word") or "").strip()
                if not word:
                    continue
                tran = (row.get("tran") or "").strip() or None

                raw_type = (row.get("type") or "").strip()
                typ = int(raw_type) if raw_type.isdigit() else None

                raw_frq = (row.get("frq") or "").strip()
                frq = int(raw_frq) if raw_frq.isdigit() else None

                exchange = (row.get("exchange") or "").strip() or None
                batch.append((word, tran, typ, frq, exchange))
                if len(batch) >= 5000:
                    conn.executemany(
                        "INSERT OR REPLACE INTO words(word, tran, type, frq, exchange) VALUES (?, ?, ?, ?, ?)",
                        batch,
                    )
                    batch.clear()
            if batch:
                conn.executemany(
                    "INSERT OR REPLACE INTO words(word, tran, type, frq, exchange) VALUES (?, ?, ?, ?, ?)",
                    batch,
                )

        conn.commit()

    tmp_path.replace(out_path)


def ensure_lexicon_sqlite(*, data_dir: Path, plugin_root: Path) -> Path:
    data_dir.mkdir(parents=True, exist_ok=True)
    dst = data_dir / "lexicon.sqlite"
    if _is_lexicon_db(dst):
        return dst

    assets_db = plugin_root / "assets" / "lexicon.sqlite"
    if _is_lexicon_db(assets_db):
        shutil.copy2(assets_db, dst)
        return dst

    csv_path = plugin_root / "assets" / "common_words_rows.csv"
    if not csv_path.exists():
        raise FileNotFoundError(str(csv_path))
    build_lexicon_sqlite(csv_path=csv_path, out_path=dst)
    return dst


def _is_lexicon_db(path: Path) -> bool:
    if not path.exists():
        return False
    try:
        with _connect(path) as conn:
            row = conn.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='words'"
            ).fetchone()
            return bool(row)
    except Exception:
        return False


@dataclass(frozen=True)
class LexiconEntry:
    word: str
    tran: Optional[str]
    type: Optional[int]
    frq: Optional[int]
    exchange: Optional[str]


@dataclass(frozen=True)
class TextAnalysis:
    token_count: int
    unknown_count: int
    unknown_ratio: float
    level_histogram: dict[int, int]
    rarity_score: float


_WORD_RE = re.compile(r"[a-z0-9]+(?:'[a-z0-9]+)?(?:-[a-z0-9]+(?:'[a-z0-9]+)?)*", re.IGNORECASE)
_TRIM_RE = re.compile(r"^[^a-z0-9]+|[^a-z0-9]+$", re.IGNORECASE)


def _normalize_word(word: str) -> str:
    w = (word or "").strip().lower()
    if not w:
        return ""
    w = w.replace("’", "'").replace("‘", "'").replace("`", "'").replace("´", "'")
    w = _TRIM_RE.sub("", w)
    return w


def _tokenize_text(text: str) -> list[str]:
    if not text:
        return []
    tokens: list[str] = []
    for m in _WORD_RE.finditer(text):
        raw = _normalize_word(m.group(0))
        if not raw:
            continue
        if "-" in raw:
            parts = [p for p in raw.split("-") if p]
            tokens.extend(parts if parts else [raw])
        else:
            tokens.append(raw)
    return tokens


def _parse_exchange(exchange: Optional[str]) -> dict[str, set[str]]:
    raw = (exchange or "").strip()
    if not raw:
        return {}
    out: dict[str, set[str]] = {}
    for part in raw.split("/"):
        part = part.strip()
        if not part or ":" not in part:
            continue
        k, v = part.split(":", 1)
        k = (k or "").strip()
        v = (v or "").strip()
        if not k or not v:
            continue
        forms = [s.strip() for s in re.split(r"[;,]", v) if s.strip()]
        if not forms:
            continue
        bucket = out.setdefault(k, set())
        for f in forms:
            n = _normalize_word(f)
            if n:
                bucket.add(n)
    return out


def _morph_candidates(word: str) -> list[str]:
    w = _normalize_word(word)
    if not w:
        return []

    out: list[str] = []
    seen: set[str] = set()

    def add(x: str) -> None:
        x = _normalize_word(x)
        if not x or x == w or x in seen:
            return
        seen.add(x)
        out.append(x)

    if w.endswith("'s") and len(w) > 2:
        add(w[:-2])

    if w.endswith("ies") and len(w) > 4:
        add(w[:-3] + "y")
    if w.endswith("es") and len(w) > 3:
        add(w[:-2])
    if w.endswith("s") and len(w) > 2:
        add(w[:-1])

    if w.endswith("ied") and len(w) > 4:
        add(w[:-3] + "y")
    if w.endswith("ed") and len(w) > 3:
        base = w[:-2]
        add(base)
        if len(base) >= 4 and base[-1] == base[-2] and base[-1] not in {"a", "e", "i", "o", "u"}:
            add(base[:-1])

    if w.endswith("ing") and len(w) > 5:
        base = w[:-3]
        add(base)
        add(base + "e")
        if len(base) >= 4 and base[-1] == base[-2] and base[-1] not in {"a", "e", "i", "o", "u"}:
            add(base[:-1])

    return out


class LexiconRepo:
    def __init__(self, db_path: Path):
        self.db_path = db_path
        self._exchange_cache: dict[str, Optional[LexiconEntry]] = {}
        self._exchange_cache_order: list[str] = []
        self._exchange_cache_max = 4096

    def lookup(self, word: str) -> Optional[LexiconEntry]:
        w = _normalize_word(word)
        if not w:
            return None
        with _connect(self.db_path) as conn:
            return self._lookup_row(conn, w)

    def lookup_with_exchange(self, word: str) -> Optional[LexiconEntry]:
        w = _normalize_word(word)
        if not w:
            return None
        cached = self._exchange_cache.get(w, None)
        if w in self._exchange_cache:
            return cached

        with _connect(self.db_path) as conn:
            out = self._lookup_with_exchange(conn, w)
        self._exchange_cache[w] = out
        self._exchange_cache_order.append(w)
        if len(self._exchange_cache_order) > self._exchange_cache_max:
            evict = self._exchange_cache_order.pop(0)
            self._exchange_cache.pop(evict, None)
        return out

    def tokenize_text(self, text: str) -> list[str]:
        return _tokenize_text(text or "")

    def normalize_text(self, text: str) -> str:
        return " ".join(self.tokenize_text(text or ""))

    def analyze_text(self, text: str) -> TextAnalysis:
        tokens = _tokenize_text(text or "")
        token_count = len(tokens)
        if token_count == 0:
            return TextAnalysis(
                token_count=0,
                unknown_count=0,
                unknown_ratio=0.0,
                level_histogram={},
                rarity_score=0.0,
            )

        level_hist: dict[int, int] = {}
        unknown = 0
        frq_sum = 0.0
        frq_n = 0

        with _connect(self.db_path) as conn:
            for t in tokens:
                entry = self._lookup_with_exchange(conn, t)
                typ = int(entry.type) if (entry and entry.type is not None) else 0
                if not entry or typ == 0:
                    unknown += 1
                level_hist[typ] = level_hist.get(typ, 0) + 1
                if entry and entry.frq is not None:
                    frq_sum += float(entry.frq)
                    frq_n += 1

        rarity_score = float(frq_sum / frq_n) if frq_n else 0.0
        unknown_ratio = float(unknown / token_count) if token_count else 0.0
        return TextAnalysis(
            token_count=token_count,
            unknown_count=unknown,
            unknown_ratio=unknown_ratio,
            level_histogram=level_hist,
            rarity_score=rarity_score,
        )

    def _lookup_row(self, conn: sqlite3.Connection, word: str) -> Optional[LexiconEntry]:
        row = conn.execute(
            "SELECT word, tran, type, frq, exchange FROM words WHERE word = ?",
            (word,),
        ).fetchone()
        if not row:
            return None
        return LexiconEntry(
            word=row["word"],
            tran=row["tran"],
            type=row["type"],
            frq=row["frq"],
            exchange=row["exchange"],
        )

    def _lookup_with_exchange(self, conn: sqlite3.Connection, word: str) -> Optional[LexiconEntry]:
        direct = self._lookup_row(conn, word)
        if direct:
            return direct

        for cand in _morph_candidates(word):
            hit = self._lookup_row(conn, cand)
            if hit:
                return hit

        if len(word) < 3:
            return None

        rows = conn.execute(
            "SELECT word, tran, type, frq, exchange FROM words WHERE exchange LIKE ? LIMIT 200",
            (f"%:{word}%",),
        ).fetchall()
        for row in rows:
            exchange_map = _parse_exchange(row["exchange"])
            for forms in exchange_map.values():
                if word in forms:
                    return LexiconEntry(
                        word=row["word"],
                        tran=row["tran"],
                        type=row["type"],
                        frq=row["frq"],
                        exchange=row["exchange"],
                    )
        return None


if __name__ == "__main__":
    root = Path(__file__).resolve().parents[2]
    data = root / ".lexicon-build"
    out = ensure_lexicon_sqlite(data_dir=data, plugin_root=root)
    repo = LexiconRepo(out)
    print(repo.lookup("a"))
