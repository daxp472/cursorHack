"""
Entity Resolver: maps surface-form terms → canonical Concept IDs via the Terms table.
Applies synonym expansion + contextual sense disambiguation (SenseRules).
"""
from __future__ import annotations
import unicodedata
from models.schemas import ClinicalFrame, ResolvedConcept, SenseDisambiguation, ResolverOutput


def _norm(text: str) -> str:
    return unicodedata.normalize("NFKD", text.lower()).strip()


class EntityResolver:
    def __init__(self, db_conn):
        self.conn = db_conn

    def _lookup_term(self, surface: str) -> tuple[str, str, str] | None:
        """Returns (concept_id, canonical_name, concept_type) or None."""
        cur = self.conn.cursor()
        # Exact match first (needed for Gujarati / Devanagari where lower() is a no-op but collation can differ)
        cur.execute(
            """
            SELECT c.concept_id::text, c.canonical_name, c.type
            FROM terms t
            JOIN concepts c ON t.concept_id = c.concept_id
            WHERE t.surface_form = %s
            LIMIT 1
            """,
            (surface.strip(),),
        )
        row = cur.fetchone()
        if not row:
            cur.execute(
                """
                SELECT c.concept_id::text, c.canonical_name, c.type
                FROM terms t
                JOIN concepts c ON t.concept_id = c.concept_id
                WHERE lower(t.surface_form) = lower(%s)
                LIMIT 1
                """,
                (surface,),
            )
            row = cur.fetchone()
        cur.close()
        return (str(row[0]), row[1], row[2]) if row else None

    def _get_synonyms(self, concept_id: str) -> list[str]:
        cur = self.conn.cursor()
        cur.execute(
            "SELECT surface_form FROM terms WHERE concept_id = %s ORDER BY language",
            (concept_id,),
        )
        syns = [r[0] for r in cur.fetchall()]
        cur.close()
        return syns

    def _check_sense_rule(self, term: str, yoga_name: str | None = None) -> SenseDisambiguation | None:
        cur = self.conn.cursor()
        if yoga_name:
            cur.execute(
                """
                SELECT sr.term, sr.default_dravya_name, sr.context_dravya_name,
                       sr.context_yoga_name, sr.explanation
                FROM sense_rules sr
                WHERE lower(sr.term) = lower(%s)
                  AND lower(sr.context_yoga_name) = lower(%s)
                LIMIT 1
                """,
                (term, yoga_name),
            )
        else:
            cur.execute(
                """
                SELECT sr.term, sr.default_dravya_name, sr.context_dravya_name,
                       sr.context_yoga_name, sr.explanation
                FROM sense_rules sr
                WHERE lower(sr.term) = lower(%s)
                LIMIT 1
                """,
                (term,),
            )
        row = cur.fetchone()
        cur.close()
        if not row:
            return None
        return SenseDisambiguation(
            term=row[0],
            default_dravya=row[1] or "",
            resolved_dravya=row[2] or "",
            context_yoga=row[3] or "",
            explanation=row[4] or "",
        )

    def resolve(self, frame: ClinicalFrame) -> ResolverOutput:
        """Resolve all terms in the clinical frame to concept IDs."""
        all_terms = list(dict.fromkeys(frame.symptoms + frame.rogas))
        resolved: list[ResolvedConcept] = []
        unresolved: list[str] = []
        sense_disambiguations: list[SenseDisambiguation] = []
        seen_concepts: set[str] = set()

        for term in all_terms:
            if not term.strip():
                continue

            # Direct lookup
            result = self._lookup_term(term)

            if not result:
                # Try normalized form
                result = self._lookup_term(_norm(term))

            if result:
                concept_id, canonical_name, concept_type = result
                if concept_id not in seen_concepts:
                    seen_concepts.add(concept_id)
                    synonyms = self._get_synonyms(concept_id)
                    resolved.append(ResolvedConcept(
                        surface_form=term,
                        canonical_name=canonical_name,
                        concept_id=concept_id,
                        concept_type=concept_type,
                        synonyms_used=[s for s in synonyms if s.lower() != term.lower()][:10],
                    ))

                # Check for sense disambiguation
                sd = self._check_sense_rule(term)
                if sd and sd not in sense_disambiguations:
                    sense_disambiguations.append(sd)
            else:
                unresolved.append(term)

        # Also resolve comorbidities for safety engine (return as separate concept list)
        for comorb in frame.comorbidities:
            result = self._lookup_term(comorb) or self._lookup_term(_norm(comorb))
            if result:
                concept_id, canonical_name, concept_type = result
                if concept_id not in seen_concepts:
                    seen_concepts.add(concept_id)
                    resolved.append(ResolvedConcept(
                        surface_form=comorb,
                        canonical_name=canonical_name,
                        concept_id=concept_id,
                        concept_type=concept_type,
                    ))

        return ResolverOutput(
            resolved_concepts=resolved,
            unresolved_terms=unresolved,
            sense_disambiguations=sense_disambiguations,
        )
