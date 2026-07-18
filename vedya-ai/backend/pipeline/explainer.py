"""
Explainer: citation-bound explanations from the Evidence Pack.
Supports EN / HI / GU template explanations; LLM may narrate in the same locale.
"""
from __future__ import annotations
import json
import os
from models.schemas import (
    EvidencePack, Explanation, ExplanationClaim,
    CompareResult,
)

LLM_ENABLED = os.getenv("LLM_ENABLED", "true").lower() == "true"

_LOCALE_NAMES = {"en": "English", "hi": "Hindi", "gu": "Gujarati"}


def _norm_locale(locale: str | None) -> str:
    loc = (locale or "en").lower().strip()
    return loc if loc in {"en", "hi", "gu"} else "en"


def _recommend_system(locale: str) -> str:
    lang = _LOCALE_NAMES.get(locale, "English")
    return f"""You are a classical Ayurvedic clinical educator speaking to students.
Given an Evidence Pack, explain WHY this formulation fits the patient in clear {lang}.
Rules:
1. Ground ONLY in the evidence pack. Never invent yogas, herbs, or citations.
2. Cite with [ref_id] when available.
3. Output ONLY JSON: {{"summary":"2-3 plain sentences","claims":[{{"text":"...","ref_ids":["..."]}}]}}
4. Structure the summary as: (1) top pick name, (2) why it fits this case, (3) classical source if present.
5. Keep Sanskrit yoga names unchanged. Prefer everyday clinical wording over jargon."""


def _compare_system(locale: str) -> str:
    lang = _LOCALE_NAMES.get(locale, "English")
    return f"""You are a classical Ayurvedic clinical educator speaking to students.
Compare formulation A vs B for this vignette in clear {lang}.
Output ONLY JSON:
{{"summary":"plain comparison","claims":[{{"text":"...","ref_ids":["..."]}}],"winner":"A or B","winner_reason":"one clear sentence"}}
Ground every claim in the evidence packs. Never invent references.
Keep Sanskrit yoga names unchanged."""


def _template_explanation(pack: EvidencePack, locale: str = "en") -> Explanation:
    """Plain-language template — clear for classroom demos when LLM is off."""
    ref_ids = [r.ref_id for r in pack.references if r.ref_id]
    primary = [p for p in (pack.primary_indications or []) if p][:4]
    secondary = [p for p in (pack.secondary_indications or []) if p][:3]
    ingredients = [i for i in (pack.ingredients or []) if i][:5]
    work = pack.references[0].work if pack.references else ""
    chapter = pack.references[0].chapter if pack.references else ""
    kalpana = pack.kalpana or ""
    primary_str = ", ".join(primary)
    ingredient_str = ", ".join(ingredients)

    if locale == "hi":
        claims = []
        why = (
            f"इस केस के लिए {pack.yoga_name} सबसे उपयुक्त दिखता है"
            + (f" क्योंकि यह मुख्यतः {primary_str} में इंगित है।" if primary_str else "।")
        )
        claims.append(ExplanationClaim(text=why, ref_ids=ref_ids[:1]))
        if ingredient_str:
            claims.append(
                ExplanationClaim(
                    text=f"मुख्य द्रव्य: {ingredient_str}"
                    + (f" — ये {', '.join(secondary)} में भी सहायक हो सकते हैं।" if secondary else "।"),
                    ref_ids=ref_ids[:1],
                )
            )
        if work:
            src = f"शास्त्रीय आधार: {work}" + (f" ({chapter})" if chapter else "") + "।"
            claims.append(ExplanationClaim(text=src, ref_ids=ref_ids[:1]))
        if pack.safety_violations:
            claims.append(
                ExplanationClaim(
                    text="सुरक्षा: " + "; ".join(v.message[:100] for v in pack.safety_violations),
                    ref_ids=[],
                )
            )
        summary = (
            f"शीर्ष योग: {pack.yoga_name}"
            + (f" ({kalpana})" if kalpana else "")
            + "। "
            + why
            + (f" स्रोत: {work}." if work else "")
        )
    elif locale == "gu":
        claims = []
        why = (
            f"આ કેસ માટે {pack.yoga_name} સૌથી યોગ્ય દેખાય છે"
            + (f" કારણ કે તે મુખ્યત્વે {primary_str} માટે સૂચવાય છે." if primary_str else ".")
        )
        claims.append(ExplanationClaim(text=why, ref_ids=ref_ids[:1]))
        if ingredient_str:
            claims.append(
                ExplanationClaim(
                    text=f"મુખ્ય ઘટકો: {ingredient_str}"
                    + (f" — આ {', '.join(secondary)} માં પણ મદદરૂપ થઈ શકે." if secondary else "."),
                    ref_ids=ref_ids[:1],
                )
            )
        if work:
            src = f"શાસ્ત્રીય આધાર: {work}" + (f" ({chapter})" if chapter else "") + "."
            claims.append(ExplanationClaim(text=src, ref_ids=ref_ids[:1]))
        if pack.safety_violations:
            claims.append(
                ExplanationClaim(
                    text="સુરક્ષા: " + "; ".join(v.message[:100] for v in pack.safety_violations),
                    ref_ids=[],
                )
            )
        summary = (
            f"ટોચનો યોગ: {pack.yoga_name}"
            + (f" ({kalpana})" if kalpana else "")
            + ". "
            + why
            + (f" સ્ત્રોત: {work}." if work else "")
        )
    else:
        claims = []
        why = (
            f"{pack.yoga_name} is the strongest match for this case"
            + (f" because it is classically indicated for {primary_str}." if primary_str else ".")
        )
        claims.append(ExplanationClaim(text=why, ref_ids=ref_ids[:1]))
        if ingredient_str:
            claims.append(
                ExplanationClaim(
                    text=f"Key herbs: {ingredient_str}"
                    + (f" — also support {', '.join(secondary)}." if secondary else "."),
                    ref_ids=ref_ids[:1],
                )
            )
        if work:
            src = f"Classical basis: {work}" + (f" ({chapter})" if chapter else "") + "."
            claims.append(ExplanationClaim(text=src, ref_ids=ref_ids[:1]))
        if pack.safety_violations:
            claims.append(
                ExplanationClaim(
                    text="Safety: " + "; ".join(v.message[:100] for v in pack.safety_violations),
                    ref_ids=[],
                )
            )
        if pack.differentiation_note:
            claims.append(ExplanationClaim(text=pack.differentiation_note, ref_ids=ref_ids[:1]))
        summary = (
            f"Top pick: {pack.yoga_name}"
            + (f" ({kalpana})" if kalpana else "")
            + ". "
            + why
            + (f" Source: {work}." if work else "")
        )

    return Explanation(
        summary=summary,
        claims=claims,
        llm_used=False,
        template_fallback=True,
    )


def _validate_ref_ids(claims: list[dict], valid_ids: set[str]) -> list[ExplanationClaim]:
    result = []
    for c in claims:
        filtered_ids = [rid for rid in (c.get("ref_ids") or []) if rid in valid_ids]
        result.append(ExplanationClaim(text=c.get("text", ""), ref_ids=filtered_ids))
    return result


async def explain_recommendation(
    pack: EvidencePack,
    vignette_summary: str,
    llm_client=None,
    locale: str = "en",
) -> Explanation:
    locale = _norm_locale(locale)
    if not LLM_ENABLED or not llm_client:
        return _template_explanation(pack, locale)

    valid_ref_ids = {r.ref_id for r in pack.references if r.ref_id}
    pack_json = pack.model_dump_json(indent=2)

    try:
        response = await llm_client.chat.completions.create(
            model="gpt-4o-mini",
            temperature=0.1,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": _recommend_system(locale)},
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
        return _template_explanation(pack, locale)


async def explain_compare(
    pack_a: EvidencePack,
    pack_b: EvidencePack,
    vignette_summary: str,
    llm_client=None,
    locale: str = "en",
) -> CompareResult:
    locale = _norm_locale(locale)

    def template_compare() -> CompareResult:
        winner = pack_a if pack_a.score >= pack_b.score else pack_b
        loser = pack_b if winner is pack_a else pack_a
        if locale == "hi":
            reason = (
                winner.differentiation_note
                or f"{winner.yoga_name} का समग्र उपयुक्तता अंक ({winner.score:.1f}) "
                   f"{loser.yoga_name} ({loser.score:.1f}) से अधिक है।"
            )
            summary = f"नैदानिक चित्र के आधार पर {winner.yoga_name} को {loser.yoga_name} से वरीयता दी गई है।"
        elif locale == "gu":
            reason = (
                winner.differentiation_note
                or f"{winner.yoga_name} નો એકંદર યોગ્યતા સ્કોર ({winner.score:.1f}) "
                   f"{loser.yoga_name} ({loser.score:.1f}) કરતાં વધુ છે."
            )
            summary = f"નૈદાનિક ચિત્રના આધારે {winner.yoga_name} ને {loser.yoga_name} કરતાં પ્રાધાન્ય આપવામાં આવ્યું છે."
        else:
            reason = (
                winner.differentiation_note
                or f"{winner.yoga_name} has a higher overall fit score ({winner.score:.1f}) "
                   f"vs {loser.yoga_name} ({loser.score:.1f}) for the given clinical picture."
            )
            summary = f"Based on the clinical presentation, {winner.yoga_name} is preferred over {loser.yoga_name}."

        explanation = Explanation(
            summary=summary,
            claims=[ExplanationClaim(text=reason, ref_ids=[r.ref_id for r in winner.references if r.ref_id][:1])],
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
                {"role": "system", "content": _compare_system(locale)},
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
