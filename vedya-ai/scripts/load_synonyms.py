"""
Load disease/symptom synonym table from data/synonyms.yaml into
the concepts + terms tables.
"""
import sys
from pathlib import Path
import yaml

sys.path.insert(0, str(Path(__file__).parent))
from db_utils import get_connection, upsert_concept, upsert_term

ROOT = Path(__file__).parent.parent
SYNONYMS_FILE = ROOT / "data" / "synonyms.yaml"


def main():
    data = yaml.safe_load(SYNONYMS_FILE.read_text(encoding="utf-8"))
    conn = get_connection()
    cur = conn.cursor()

    inserted_concepts = 0
    inserted_terms = 0

    for entry in data:
        canonical = entry["canonical"]
        ctype = entry.get("type", "roga")
        # Map YAML types to schema types
        if ctype == "karma":
            ctype = "karma"
        elif ctype == "lakshana":
            ctype = "lakshana"
        else:
            ctype = "roga"

        concept_id = upsert_concept(cur, canonical, ctype)
        inserted_concepts += 1

        # Canonical name itself as a term
        upsert_term(cur, canonical, concept_id, "sa", "synonyms.yaml")
        inserted_terms += 1
        upsert_term(cur, canonical.lower(), concept_id, "en", "synonyms.yaml")

        for syn in entry.get("synonyms") or []:
            upsert_term(cur, syn, concept_id, "en", "synonyms.yaml")
            upsert_term(cur, syn.lower(), concept_id, "en", "synonyms.yaml")
            inserted_terms += 2

    conn.commit()
    cur.close()
    conn.close()
    print(f"Loaded {inserted_concepts} concepts and ~{inserted_terms} terms from synonyms.yaml")


if __name__ == "__main__":
    main()
