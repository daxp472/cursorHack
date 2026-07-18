"""
Safety Engine: DETERMINISTIC rule application.
Runs BEFORE ranking. Hard-excluded yogas are filtered out.
Warned yogas remain with visible flags.
This module never uses an LLM.
"""
from __future__ import annotations
import json
from models.schemas import SafetyViolation, SafetyResult, ClinicalFrame


def _normalize(s: str) -> str:
    return (s or "").lower().strip()


class SafetyEngine:
    def __init__(self, db_conn):
        self.conn = db_conn
        self._rules: list[dict] | None = None

    def _load_rules(self) -> list[dict]:
        if self._rules is not None:
            return self._rules
        cur = self.conn.cursor()
        cur.execute(
            "SELECT rule_id, condition_concept, condition_aliases, target_type, "
            "target_value, severity, message, classical_basis, applies_to_yoga_names "
            "FROM constraint_rules"
        )
        rules = []
        for row in cur.fetchall():
            target_value = row[4]
            if isinstance(target_value, str):
                target_value = json.loads(target_value)
            rules.append(
                {
                    "rule_id": row[0],
                    "condition_concept": row[1],
                    "condition_aliases": row[2] or [],
                    "target_type": row[3],
                    "target_value": target_value if isinstance(target_value, list) else [target_value],
                    "severity": row[5],
                    "message": row[6],
                    "classical_basis": row[7],
                    "applies_to_yoga_names": row[8] or [],
                }
            )
        cur.close()
        self._rules = rules
        return rules

    def _condition_matches(self, rule: dict, comorbidities: list[str]) -> bool:
        """Check if the rule's condition is present in the comorbidities."""
        comorb_norms = {_normalize(c) for c in comorbidities}
        all_conditions = [rule["condition_concept"]] + (rule["condition_aliases"] or [])
        return any(_normalize(c) in comorb_norms for c in all_conditions)

    def _target_matches(self, rule: dict, yoga: dict) -> bool:
        target_type = rule["target_type"]
        target_values = [_normalize(v) for v in rule["target_value"]]

        if target_type == "kalpana_class":
            return _normalize(yoga.get("kalpana_name", "")) in target_values or \
                   _normalize(yoga.get("medium_class", "")) in target_values

        if target_type == "ingredient_keyword":
            all_ingredient_text = " ".join(
                _normalize(ing.get("name", "")) for ing in (yoga.get("ingredients") or [])
            )
            # Also check reference_text for ingredient mentions
            ref_text = _normalize(yoga.get("reference_text") or "")
            return any(kw in all_ingredient_text or kw in ref_text for kw in target_values)

        if target_type == "ingredient_name":
            ingredient_names = {_normalize(ing.get("name", "")) for ing in (yoga.get("ingredients") or [])}
            return bool(ingredient_names & set(target_values))

        if target_type == "category_flag":
            return bool(yoga.get("external_only", False))

        return False

    def apply(self, candidates: list[dict], frame: ClinicalFrame) -> list[SafetyResult]:
        """
        For each candidate yoga, evaluate all rules.
        Returns SafetyResult per yoga (including those with no violations).
        """
        rules = self._load_rules()
        results: list[SafetyResult] = []

        for yoga in candidates:
            violations: list[SafetyViolation] = []
            hard_excluded = False

            for rule in rules:
                # Check if applies_to_yoga_names restriction applies
                if rule["applies_to_yoga_names"] and \
                   yoga["yoga_name"] not in rule["applies_to_yoga_names"]:
                    continue

                if not self._condition_matches(rule, frame.comorbidities):
                    continue

                if not self._target_matches(rule, yoga):
                    continue

                violations.append(
                    SafetyViolation(
                        rule_id=rule["rule_id"],
                        severity=rule["severity"],
                        message=rule["message"],
                        classical_basis=rule.get("classical_basis"),
                    )
                )
                if rule["severity"] == "HARD_EXCLUDE":
                    hard_excluded = True

            results.append(
                SafetyResult(
                    yoga_id=yoga["yoga_id"],
                    yoga_name=yoga["yoga_name"],
                    violations=violations,
                    hard_excluded=hard_excluded,
                )
            )

        return results
