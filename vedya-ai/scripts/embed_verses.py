"""
Generate vector embeddings for Charaka verses and store in verse_embeddings.
Requires OPENAI_API_KEY. Skips rows that already have embeddings.
Run AFTER load_charaka.py.
"""
import os
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from db_utils import get_connection

BATCH_SIZE = 100
MODEL = "text-embedding-3-small"
DIMENSIONS = 1536


def embed_batch(texts: list[str], client) -> list[list[float]]:
    response = client.embeddings.create(
        input=texts,
        model=MODEL,
        dimensions=DIMENSIONS,
    )
    return [item.embedding for item in response.data]


def main():
    try:
        import openai
    except ImportError:
        print("openai package not installed. Run: pip install openai")
        sys.exit(1)

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("OPENAI_API_KEY not set. Skipping embeddings.")
        sys.exit(0)

    client = openai.OpenAI(api_key=api_key)
    conn = get_connection()
    cur = conn.cursor()

    # Fetch all refs that don't have embeddings yet
    cur.execute(
        """
        SELECT r.ref_id, r.excerpt_text
        FROM "references" r
        LEFT JOIN verse_embeddings ve ON r.ref_id = ve.ref_id
        WHERE ve.ref_id IS NULL AND r.excerpt_text IS NOT NULL AND length(r.excerpt_text) > 20
        ORDER BY r.created_at
        """
    )
    rows = cur.fetchall()
    print(f"Embedding {len(rows)} verses in batches of {BATCH_SIZE}...")

    total = 0
    for i in range(0, len(rows), BATCH_SIZE):
        batch = rows[i : i + BATCH_SIZE]
        ref_ids = [str(r[0]) for r in batch]
        texts = [r[1][:8000] for r in batch]  # OpenAI token limit guard

        try:
            vectors = embed_batch(texts, client)
        except Exception as e:
            print(f"  Batch {i}–{i+BATCH_SIZE} error: {e}. Retrying once...")
            time.sleep(2)
            vectors = embed_batch(texts, client)

        for ref_id, vec in zip(ref_ids, vectors):
            vec_str = "[" + ",".join(str(v) for v in vec) + "]"
            cur.execute(
                """
                INSERT INTO verse_embeddings (ref_id, embedding, model_name)
                VALUES (%s, %s::vector, %s)
                ON CONFLICT (ref_id) DO NOTHING
                """,
                (ref_id, vec_str, MODEL),
            )
        conn.commit()
        total += len(batch)
        print(f"  Embedded {total}/{len(rows)}")
        time.sleep(0.1)  # rate limit courtesy

    cur.close()
    conn.close()
    print(f"Done. Total embedded: {total}")


if __name__ == "__main__":
    main()
