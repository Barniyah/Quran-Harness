"""
Quran Harness — tajweed CLI bridge.

Analyzes one verse with tajweed-embeddings (rule-based, deterministic) and
prints a JSON document on stdout: the verse text and per-letter rows.

Usage: python tajweed_cli.py <surah> <ayah> [short|long]

The engine loads its own pinned Tanzil copy (Uthmani v1.1) — the same artifact
family the harness pins — and emits ANSI-colored rows that we strip here.
"""
import contextlib
import io
import json
import re
import sys

ANSI_RE = re.compile(r"\x1b\[[0-9;]*m")
BIDI_RE = re.compile(r"[؜‎‏‪-‮⁦-⁩]")


def main() -> int:
    if len(sys.argv) < 3:
        print(json.dumps({"error": "usage: tajweed_cli.py <surah> <ayah> [short|long]"}))
        return 2
    surah, ayah = int(sys.argv[1]), int(sys.argv[2])
    style = sys.argv[3] if len(sys.argv) > 3 else "long"

    from tajweed_embeddings import embedder
    with contextlib.redirect_stderr(io.StringIO()), contextlib.redirect_stdout(io.StringIO()):
        engine = embedder.TajweedEmbedder()
        emb = engine.text_to_embedding(surah, ayah)
        text = engine.get_text(surah, ayah)
        rendered = engine.encoding_to_string(emb, style)

    rows = [BIDI_RE.sub("", ANSI_RE.sub("", line)).strip() for line in rendered.splitlines()]
    rows = [r for r in rows if r]
    print(json.dumps({
        "surah": surah,
        "ayah": ayah,
        "text": text,
        "style": style,
        "letters": rows,
    }, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
