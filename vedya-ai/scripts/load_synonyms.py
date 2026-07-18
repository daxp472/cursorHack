"""
Load disease/symptom synonym table from data/synonyms.yaml (+ vernacular overlay)
into the concepts + terms tables.
"""
import sys
from pathlib import Path
import yaml

sys.path.insert(0, str(Path(__file__).parent))
from db_utils import get_connection, upsert_concept, upsert_term

ROOT = Path(__file__).parent.parent
SYNONYMS_FILE = ROOT / "data" / "synonyms.yaml"
VERNACULAR_FILE = ROOT / "data" / "synonyms_vernacular.yaml"


def _detect_lang(text: str, hinted: str | None = None) -> str:
    if hinted in {"en", "hi", "gu", "sa"}:
        return hinted
    # Gujarati Unicode block
    if any("\u0A80" <= ch <= "\u0AFF" for ch in text):
        return "gu"
    # Devanagari
    if any("\u0900" <= ch <= "\u097F" for ch in text):
        return "hi"
    return "en"


def _load_core(cur) -> tuple[int, int]:
    data = yaml.safe_load(SYNONYMS_FILE.read_text(encoding="utf-8")) or []
    concepts = 0
    terms = 0
    for entry in data:
        canonical = entry["canonical"]
        ctype = entry.get("type", "roga")
        if ctype not in {"roga", "lakshana", "karma", "dravya"}:
            ctype = "roga"

        concept_id = upsert_concept(cur, canonical, ctype)
        concepts += 1

        upsert_term(cur, canonical, concept_id, "sa", "synonyms.yaml")
        upsert_term(cur, canonical.lower(), concept_id, "en", "synonyms.yaml")
        terms += 2

        for syn in entry.get("synonyms") or []:
            if isinstance(syn, dict):
                text = str(syn.get("text") or syn.get("term") or "").strip()
                lang = _detect_lang(text, syn.get("lang") or syn.get("language"))
            else:
                text = str(syn).strip()
                lang = _detect_lang(text)
            if not text:
                continue
            upsert_term(cur, text, concept_id, lang, "synonyms.yaml")
            if lang == "en":
                upsert_term(cur, text.lower(), concept_id, "en", "synonyms.yaml")
                terms += 2
            else:
                terms += 1

        # Optional inline language buckets
        for lang_key, bucket in (("hi", "synonyms_hi"), ("gu", "synonyms_gu"), ("en", "synonyms_en")):
            for syn in entry.get(bucket) or []:
                text = str(syn).strip()
                if not text:
                    continue
                upsert_term(cur, text, concept_id, lang_key, "synonyms.yaml")
                terms += 1
    return concepts, terms


def _load_vernacular(cur) -> int:
    if not VERNACULAR_FILE.exists():
        return 0
    data = yaml.safe_load(VERNACULAR_FILE.read_text(encoding="utf-8")) or []
    terms = 0
    for entry in data:
        canonical = entry.get("canonical")
        if not canonical:
            continue
        cur.execute(
            "SELECT concept_id FROM concepts WHERE lower(canonical_name) = lower(%s) LIMIT 1",
            (canonical,),
        )
        row = cur.fetchone()
        if not row:
            # Auto-create as roga so vernacular demos still resolve
            concept_id = upsert_concept(cur, canonical, entry.get("type", "roga"))
        else:
            concept_id = str(row[0])

        for lang in ("hi", "gu", "en"):
            for syn in entry.get(lang) or []:
                text = str(syn).strip()
                if not text:
                    continue
                upsert_term(cur, text, concept_id, lang, "synonyms_vernacular.yaml")
                terms += 1
                if lang == "en":
                    upsert_term(cur, text.lower(), concept_id, "en", "synonyms_vernacular.yaml")
                    terms += 1
    return terms


def main():
    conn = get_connection()
    cur = conn.cursor()
    concepts, terms = _load_core(cur)
    v_terms = _load_vernacular(cur)
    conn.commit()
    cur.close()
    conn.close()
    print(
        f"Loaded {concepts} concepts, ~{terms} core terms, "
        f"+{v_terms} vernacular terms from synonyms_vernacular.yaml"
    )


if __name__ == "__main__":
    main()
