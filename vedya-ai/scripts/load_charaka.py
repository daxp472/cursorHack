"""
Load Charaka Samhita verses from data/raw/Ayurveda/charak-samhita/**/*.json
into the references table (work, sthana, chapter, verse_id, excerpt_text).
These serve as the RAG evidence pool.
"""
import json
import sys
from pathlib import Path
from psycopg2.extras import execute_values

sys.path.insert(0, str(Path(__file__).parent))
from db_utils import get_connection

ROOT = Path(__file__).parent.parent
CHARAKA_DIR = ROOT / "data" / "raw" / "Ayurveda" / "charak-samhita"

STHANA_MAP = {
    "1.Sutrasthana": "Sutrasthana",
    "2.Nidanasthana": "Nidanasthana",
    "3.Vimanasthana": "Vimanasthana",
    "4.Sharirasthana": "Sharirasthana",
    "5.Indriyasthana": "Indriyasthana",
    "6.Cikitsasthana": "Cikitsasthana",
    "7.Kalpasthana": "Kalpasthana",
    "8.Siddhisthana": "Siddhisthana",
}


def parse_sthana(folder_name: str) -> str:
    for prefix, name in STHANA_MAP.items():
        if folder_name.startswith(prefix):
            return name
    return folder_name


def main():
    conn = get_connection()
    cur = conn.cursor()

    rows = []
    total_files = 0
    total_verses = 0

    for sthana_dir in sorted(CHARAKA_DIR.iterdir()):
        if not sthana_dir.is_dir():
            continue
        sthana = parse_sthana(sthana_dir.name)

        for chapter_file in sorted(sthana_dir.glob("chapter*.json")):
            chapter_name = chapter_file.stem  # e.g. 'chapter1'
            verses = json.loads(chapter_file.read_text(encoding="utf-8"))
            total_files += 1

            for verse in verses:
                verse_id = str(verse.get("verse_id", ""))
                text = (verse.get("text") or "").strip()
                if not text:
                    continue
                rows.append((
                    "Charaka Samhita",
                    sthana,
                    chapter_name,
                    verse_id,
                    text[:2000],  # cap excerpt length
                    str(chapter_file),
                    "1.0.0",
                ))
                total_verses += 1

    # Batch insert
    execute_values(
        cur,
        """
        INSERT INTO "references" (work, sthana, chapter, verse_id, excerpt_text, source_file, corpus_version)
        VALUES %s
        ON CONFLICT DO NOTHING
        """,
        rows,
    )

    conn.commit()
    cur.close()
    conn.close()
    print(f"Loaded {total_verses} verses from {total_files} chapter files")


if __name__ == "__main__":
    main()
