"""
Quran Harness — phonetic (رسم صوتي) CLI bridge.

Reads an Uthmani verse from stdin (the caller passes the harness's own pinned
Tanzil artifact text, so the phonetic rendering provably derives from the
verified corpus), phonetizes it with quran-transcript (Hafs rules), and prints
JSON on stdout: phonemes plus the per-letter sifat table.

Usage: echo "<uthmani text>" | python phonetic_cli.py <sura_idx>
"""
import contextlib
import io
import json
import sys


def main() -> int:
    if len(sys.argv) < 2:
        print(json.dumps({"error": "usage: phonetic_cli.py <sura_idx>  (uthmani text via stdin)"}))
        return 2
    sura_idx = int(sys.argv[1])
    uthmani = sys.stdin.read().strip()
    if not uthmani:
        print(json.dumps({"error": "empty uthmani text on stdin"}))
        return 2

    with contextlib.redirect_stderr(io.StringIO()):
        from quran_transcript import MoshafAttributes, quran_phonetizer
        moshaf = MoshafAttributes(
            rewaya="hafs",
            madd_monfasel_len=4,
            madd_mottasel_len=4,
            madd_mottasel_waqf=4,
            madd_aared_len=4,
        )
        out = quran_phonetizer(uthmani, moshaf, sura_idx=sura_idx)

    print(json.dumps({
        "suraIdx": sura_idx,
        "uthmani": uthmani,
        "phonemes": out.phonemes,
        "sifat": [s.model_dump() for s in out.sifat],
        "rules": {
            "rewaya": "hafs",
            "madd_monfasel_len": 4,
            "madd_mottasel_len": 4,
            "madd_mottasel_waqf": 4,
            "madd_aared_len": 4,
        },
    }, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
