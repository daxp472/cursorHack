"""
Explainer: generates citation-bound explanations from the Evidence Pack.
LLM may only reference ref_ids that exist in the pack.
Falls back to templates if LLM is unavailable.
"""
from __future__ import annotations
import json
import os
from models.schemas import (
    EvidencePack, Explanation, ExplanationClaim,
    CompareResult, RecommendedFormulation,
)

LLM_ENABLED = os.getenv("LLM_ENABLED", "true").lower() == "true"

_RECOMMEND_SYSTEM = """You are a classical Ayurvedic clinical educator.
Given an Evidence Pack for a formulation, explain WHY it is recommended for the patient's conditions.
Your explanation must:
1. Be grounded ONLY in the evidence pack provided.
2. Reference citations using their ref_id (format: [ref_id]).
3. Output ONLY valid JSON: {"summary": "...", "claims": [{"text": "...", "ref_ids": ["..."]}]}
4. Never invent new formulations, ingredients, or references.
5. If evidence is insufficient, say so honestly."""

_COMPARE_SYSTEM = """You are a classical Ayurvedic clinical educator.
Compare two formulations (A and B) for a patient vignette and explain which is more appropriate.
Ground every claim in the evidence packs. Output ONLY valid JSON:
{"summary": "...", "claims": [{"text": "...", "ref_ids": ["..."]}], "winner": "A or B", "winner_reason": "one sentence"}
Never invent references."""


def _template_explanation(pack: EvidencePack) -> Explanation:
    """Deterministic template explanation — used when LLM is off or fails."""
    ref_ids = [r.ref_id for r in pack.references if r.ref_id]
    primary_str = ", ".join(pack.primary_indications[:3]) if pack.primary_indications else "the stated conditions"
    secondary_str = ", ".join(pack.secondary_indications[:3]) if pack.secondary_indications else ""
    ingredient_str = ", ".join(pack.ingredients[:4]) if pack.ingredients else "its constituent herbs"

    claims: list[ExplanationClaim] = [
        ExplanationClaim(
            text=f"{pack.yoga_name} is indicated in {primary_str}.",
            ref_ids=ref_ids[:1],
        ),
    ]
    if secondary_str:
        claims.append(
            ExplanationClaim(
                text=f"Its constituent herbs ({ingredient_str}) provide additional coverage for {secondary_str}.",
                ref_ids=ref_ids[:1],
            )
        )
    if pack.safety_violations:
        claims.append(
            ExplanationClaim(
                text="Note safety considerations: " + "; ".join(v.message[:80] for v in pack.safety_violations),
                ref_ids=[],
            )
        )
    if pack.differentiation_note:
        claims.append(
            ExplanationClaim(
                text=pack.differentiation_note,
                ref_ids=ref_ids[:1],
            )
        )

    return Explanation(
        summary=f"{pack.yoga_name} ({pack.kalpana or 'decoction'}) is a classical formulation "
                f"indicated for {primary_str}, referenced in {pack.references[0].work if pack.references else 'classical texts'}.",
        claims=claims,
        llm_used=False,
        template_fallback=True,
    )


def _validate_ref_ids(claims: list[dict], valid_ids: set[str]) -> list[ExplanationClaim]:
    """Strip any ref_ids not in the evidence pack."""
    result = []
    for c in claims:
        filtered_ids = [rid for rid in (c.get("ref_ids") or []) if rid in valid_ids]
        result.append(ExplanationClaim(text=c.get("text", ""), ref_ids=filtered_ids))
    return result


async def explain_recommendation(
    pack: EvidencePack,
    vignette_summary: str,
    llm_client=None,
) -> Explanation:
    """Generate explanation for a single recommendation."""
    if not LLM_ENABLED or not llm_client:
        return _template_explanation(pack)

    valid_ref_ids = {r.ref_id for r in pack.references if r.ref_id}
    pack_json = pack.model_dump_json(indent=2)

    try:
        response = await llm_client.chat.completions.create(
            model="gpt-4o-mini",
            temperature=0.1,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": _RECOMMEND_SYSTEM},
                {
                    "role": "user",
                    "content": f"Patient vignette: {vignette_summary}\n\nEvidence pack:\n{pack_json}",
                },
            ],
            max_tokens=600,
        )
        data = json.loads(response.choices[0].message.content)
        claims = _validate_ref_ids(data.get("claims", []), valid_ref_ids)
        return Explanation(
            summary=data.get("summary", ""),
            claims=claims,
            llm_used=True,
            template_fallback=False,
        )
    except Exception:
        return _template_explanation(pack)


async def explain_compare(
    pack_a: EvidencePack,
    pack_b: EvidencePack,
    vignette_summary: str,
    llm_client=None,
) -> CompareResult:
    """Generate discrimination explanation for Compare view."""
    from models.schemas import CompareResult

    def template_compare() -> CompareResult:
        # Determine winner by score
        winner = pack_a if pack_a.score >= pack_b.score else pack_b
        loser = pack_b if winner is pack_a else pack_a
        reason = (
            winner.differentiation_note
            or f"{winner.yoga_name} has a higher overall fit score ({winner.score:.1f}) "
               f"vs {loser.yoga_name} ({loser.score:.1f}) for the given clinical picture."
        )
        explanation = Explanation(
            summary=f"Based on the clinical presentation, {winner.yoga_name} is preferred over {loser.yoga_name}.",
            claims=[
                ExplanationClaim(
                    text=reason,
                    ref_ids=[r.ref_id for r in winner.references if r.ref_id][:1],
                )
            ],
            llm_used=False,
            template_fallback=True,
        )
        return CompareResult(
            yoga_a=pack_a,
            yoga_b=pack_b,
            discrimination_explanation=explanation,
            winner_yoga_id=winner.yoga_id,
            winner_reason=reason[:200],
        )

    if not LLM_ENABLED or not llm_client:
        return template_compare()

    valid_ref_ids = {r.ref_id for r in pack_a.references + pack_b.references if r.ref_id}

    try:
        user_content = (
            f"Patient vignette: {vignette_summary}\n\n"
            f"Formulation A:\n{pack_a.model_dump_json(indent=2)}\n\n"
            f"Formulation B:\n{pack_b.model_dump_json(indent=2)}"
        )
        response = await llm_client.chat.completions.create(
            model="gpt-4o-mini",
            temperature=0.1,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": _COMPARE_SYSTEM},
                {"role": "user", "content": user_content},
            ],
            max_tokens=800,
        )
        data = json.loads(response.choices[0].message.content)
        claims = _validate_ref_ids(data.get("claims", []), valid_ref_ids)
        winner_label = data.get("winner", "A")
        winner_pack = pack_a if winner_label == "A" else pack_b
        return CompareResult(
            yoga_a=pack_a,
            yoga_b=pack_b,
            discrimination_explanation=Explanation(
                summary=data.get("summary", ""),
                claims=claims,
                llm_used=True,
                template_fallback=False,
            ),
            winner_yoga_id=winner_pack.yoga_id,
            winner_reason=data.get("winner_reason", ""),
        )
    except Exception:
        return template_compare()
