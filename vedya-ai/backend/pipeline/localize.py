"""
Dynamic clinical localization for EN / HI / GU.

- Vernacular labels come from the `terms` table (data-driven synonyms).
- Longer clinical prose (explanations already locale-aware; safety, notes, indications)
  is translated via OpenAI when LLM_ENABLED + OPENAI_API_KEY are set.
- Offline fallbacks for system messages live in data/i18n_messages.yaml (not Python literals).
"""
from __future__ import annotations

import json
import os
from functools import lru_cache
from pathlib import Path
from typing import Any, Optional

import yaml

from models.schemas import (
    RecommendationResponse,
    RecommendedFormulation,
    ResolvedConcept,
    SafetyViolation,
)

ROOT = Path(__file__).resolve().parents[2]
MESSAGES_FILE = ROOT / "data" / "i18n_messages.yaml"

LLM_ENABLED = os.getenv("LLM_ENABLED", "true").lower() == "true"
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

_LANG_NAME = {"en": "English", "hi": "Hindi", "gu": "Gujarati"}


def norm_locale(locale: str | None) -> str:
    loc = (locale or "en").lower().strip()
    return loc if loc in {"en", "hi", "gu"} else "en"


@lru_cache(maxsize=1)
def _messages() -> dict:
    if not MESSAGES_FILE.exists():
        return {}
    return yaml.safe_load(MESSAGES_FILE.read_text(encoding="utf-8")) or {}


def msg(key: str, locale: str) -> str:
    locale = norm_locale(locale)
    block = _messages().get(key) or {}
    return block.get(locale) or block.get("en") or key


def preferred_surface(db, concept_id: str, locale: str, fallback: str) -> str:
    """Pick a vernacular surface form for a concept from the terms table."""
    locale = norm_locale(locale)
    cur = db.cursor()
    # Prefer vernacular-overlay rows, then longer everyday forms (बुखार over तप)
    cur.execute(
        """
        SELECT surface_form FROM terms
        WHERE concept_id = %s AND language = %s
        ORDER BY
          CASE WHEN source ILIKE '%%vernacular%%' THEN 0 ELSE 1 END,
          length(surface_form) DESC
        LIMIT 1
        """,
        (concept_id, locale),
    )
    row = cur.fetchone()
    if row:
        cur.close()
        return row[0]
    if locale != "en":
        cur.execute(
            """
            SELECT surface_form FROM terms
            WHERE concept_id = %s AND language = 'en'
            ORDER BY length(surface_form) DESC
            LIMIT 1
            """,
            (concept_id,),
        )
        row = cur.fetchone()
        if row:
            cur.close()
            return row[0]
    cur.close()
    return fallback


def label_for_canonical(db, canonical: str, locale: str) -> str:
    cur = db.cursor()
    cur.execute(
        "SELECT concept_id::text FROM concepts WHERE lower(canonical_name) = lower(%s) LIMIT 1",
        (canonical,),
    )
    row = cur.fetchone()
    cur.close()
    if not row:
        return canonical
    return preferred_surface(db, row[0], locale, canonical)


async def translate_texts(
    texts: list[str],
    locale: str,
    llm_client,
) -> list[str]:
    """Batch-translate clinical strings. Preserves Sanskrit yoga names; returns same length."""
    locale = norm_locale(locale)
    if locale == "en" or not texts:
        return texts
    if not LLM_ENABLED or not llm_client:
        return texts

    # Skip empties but keep indices
    indexed = [(i, t) for i, t in enumerate(texts) if t and str(t).strip()]
    if not indexed:
        return texts

    payload = {str(i): t for i, t in indexed}
    lang = _LANG_NAME[locale]
    try:
        response = await llm_client.chat.completions.create(
            model=OPENAI_MODEL,
            temperature=0,
            response_format={"type": "json_object"},
            messages=[
                {
                    "role": "system",
                    "content": (
                        f"You translate clinical decision-support text into {lang} for Ayurveda education. "
                        "Keep classical Sanskrit formulation names (yoga names) unchanged. "
                        "Keep citation works like Charaka Samhita unchanged when they are proper nouns. "
                        "Return JSON object with the SAME keys as the input, values translated."
                    ),
                },
                {"role": "user", "content": json.dumps(payload, ensure_ascii=False)},
            ],
            max_tokens=2000,
        )
        data = json.loads(response.choices[0].message.content or "{}")
        out = list(texts)
        for i, _ in indexed:
            val = data.get(str(i))
            if isinstance(val, str) and val.strip():
                out[i] = val
        return out
    except Exception:
        return texts


async def localize_recommendation(
    resp: RecommendationResponse,
    locale: str,
    db,
    llm_client=None,
) -> RecommendationResponse:
    """Mutate/return response with locale-aware labels and translated clinical prose."""
    locale = norm_locale(locale)

    # System strings from YAML (always)
    if not resp.disclaimer or resp.disclaimer.startswith("Educational"):
        resp.disclaimer = msg("disclaimer", locale)

    if resp.coverage_note:
        # Replace known English coverage templates
        if "No recognized" in resp.coverage_note:
            resp.coverage_note = msg("coverage_no_terms", locale)
        elif "No formulations found" in resp.coverage_note:
            resp.coverage_note = msg("coverage_no_formulations", locale)
        elif resp.coverage_note.startswith("Could not resolve"):
            rest = resp.coverage_note.split(":", 1)[-1].strip()
            resp.coverage_note = f"{msg('coverage_unresolved_prefix', locale)}: {rest}"

    # Vernacular display labels for resolved concepts
    enriched: list[ResolvedConcept] = []
    for rc in resp.resolved_concepts:
        label = preferred_surface(db, rc.concept_id, locale, rc.canonical_name)
        enriched.append(
            rc.model_copy(
                update={
                    "surface_form": label if locale != "en" else rc.surface_form,
                    "synonyms_used": list({*(rc.synonyms_used or []), label, rc.canonical_name}),
                }
            )
        )
    resp.resolved_concepts = enriched

    # Collect dynamic clinical strings to translate
    bag: list[str] = []
    pointers: list[tuple[str, Any]] = []  # (kind, ref)

    def add(kind: str, ref: Any, text: Optional[str]):
        if text and str(text).strip():
            pointers.append((kind, ref))
            bag.append(str(text))

    add("vignette", None, resp.vignette_summary)

    for v in resp.safety_alerts:
        add("alert", v, v.message)

    for r in resp.results:
        if r.explanation:
            add("summary", r, r.explanation.summary)
            for i, c in enumerate(r.explanation.claims):
                add(f"claim:{i}", (r, i), c.text)
        for v in r.safety_violations:
            add("rv", v, v.message)
        add("diff", r, r.differentiation_note)
        add("dose", r, r.dosage)
        add("anupana", r, r.anupana)
        for i, ind in enumerate(r.primary_indications):
            add(f"pri:{i}", (r, "pri", i), ind)
        for i, ind in enumerate(r.secondary_indications):
            add(f"sec:{i}", (r, "sec", i), ind)

    # First pass: map indication-like short tokens via terms table (no LLM)
    if locale != "en":
        for i, text in enumerate(bag):
            kind = pointers[i][0]
            if kind.startswith("pri:") or kind.startswith("sec:"):
                mapped = label_for_canonical(db, text, locale)
                if mapped != text:
                    bag[i] = mapped

    translated = await translate_texts(bag, locale, llm_client)

    # Write back
    for (kind, ref), text in zip(pointers, translated):
        if kind == "vignette":
            resp.vignette_summary = text
        elif kind == "alert" and isinstance(ref, SafetyViolation):
            ref.message = text
        elif kind == "summary" and isinstance(ref, RecommendedFormulation) and ref.explanation:
            ref.explanation.summary = text
        elif kind.startswith("claim:") and isinstance(ref, tuple):
            form, idx = ref
            if form.explanation and idx < len(form.explanation.claims):
                form.explanation.claims[idx].text = text
        elif kind == "rv" and isinstance(ref, SafetyViolation):
            ref.message = text
        elif kind == "diff" and isinstance(ref, RecommendedFormulation):
            ref.differentiation_note = text
        elif kind == "dose" and isinstance(ref, RecommendedFormulation):
            ref.dosage = text
        elif kind == "anupana" and isinstance(ref, RecommendedFormulation):
            ref.anupana = text
        elif kind.startswith("pri:") and isinstance(ref, tuple):
            form, _, idx = ref
            if idx < len(form.primary_indications):
                form.primary_indications[idx] = text
        elif kind.startswith("sec:") and isinstance(ref, tuple):
            form, _, idx = ref
            if idx < len(form.secondary_indications):
                form.secondary_indications[idx] = text

    return resp
