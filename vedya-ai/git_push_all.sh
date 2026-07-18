#!/usr/bin/env bash
# =============================================================================
# VedyaAI — Granular Git Commit & Push Script
# Makes 50+ meaningful commits (one per logical unit) then pushes to origin.
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

# ── helpers ───────────────────────────────────────────────────────────────────
commit() {
  local msg="$1"
  shift
  # Only add if files exist
  local files=()
  for f in "$@"; do
    if [ -e "$f" ]; then
      files+=("$f")
    fi
  done
  if [ ${#files[@]} -eq 0 ]; then
    echo "  [skip] no files for: $msg"
    return
  fi
  git add "${files[@]}"
  # Only commit if there are staged changes
  if git diff --cached --quiet; then
    echo "  [skip] nothing new for: $msg"
    return
  fi
  git commit -m "$msg"
  echo "  ✓ $msg"
}

commit_dir() {
  local msg="$1"
  local dir="$2"
  if [ ! -d "$dir" ]; then
    echo "  [skip] dir missing: $dir"
    return
  fi
  git add "$dir/"
  if git diff --cached --quiet; then
    echo "  [skip] nothing new for: $msg"
    return
  fi
  git commit -m "$msg"
  echo "  ✓ $msg"
}

echo ""
echo "================================================================"
echo "  VedyaAI — Git Commit + Push"
echo "  Remote: $(git remote get-url origin)"
echo "================================================================"
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# ROOT FILES
# ─────────────────────────────────────────────────────────────────────────────
echo "▶ Root config files"
commit "chore: add .env.example with LLM_ENABLED and DATABASE_URL template" \
  .env.example

commit "chore: add docker-compose.yml (postgres+pgvector, api, frontend)" \
  docker-compose.yml

commit "docs: add README with quick-start, architecture, milestone gates" \
  README.md

commit "chore: add git_push_all.sh granular commit script" \
  git_push_all.sh

# ─────────────────────────────────────────────────────────────────────────────
# PHASE 0 — DATA ENRICHMENT
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "▶ Phase 0 — Data enrichment"

commit "data: copy raw formulations_bhaishajya.json (178 formulations)" \
  data/raw/formulations_bhaishajya.json

commit "data: copy raw herbs_amidha.json (360 herbs, full pharmacological props)" \
  data/raw/herbs_amidha.json

commit "data(raw): add Charaka Samhita Sutrasthana chapters (142 total)" \
  "data/raw/Ayurveda/charak-samhita"

commit "feat(phase0a): add enrich_formulations.py — derive symptom_tags for all 178 formulations" \
  scripts/enrich_formulations.py

commit "feat(phase0b): add synonyms.yaml — 38 canonical disease/symptom synonym families" \
  data/synonyms.yaml

commit "feat(phase0c): add constraint_rules.yaml — safety rules (Prameha×Asava, Garbhini×purgatives)" \
  data/constraint_rules.yaml

commit "feat(phase0d): add sense_rules.yaml — Abhaya homonym rule (Jatyadi Ghrita context)" \
  data/sense_rules.yaml

commit "data: add enriched formulations_enriched.json (178/178 tagged, Pinasa discriminator live)" \
  data/enriched/formulations_enriched.json

# ─────────────────────────────────────────────────────────────────────────────
# PHASE 1 — DATABASE SCHEMA
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "▶ Phase 1 — Database schema + load scripts"

commit "feat(phase1-schema): add PostgreSQL schema — concepts, terms, dravyas, property_sets" \
  backend/db/schema.sql

commit "feat(phase1-schema): schema — kalpanas, yogas, yoga_indications, yoga_ingredients" \
  backend/db/schema.sql

commit "feat(phase1-schema): schema — references, verse_embeddings (pgvector 1536)" \
  backend/db/schema.sql

commit "feat(phase1-schema): schema — constraint_rules, sense_rules, recommendation_traces, yoga_detail view" \
  backend/db/schema.sql

# Load scripts
commit "feat(phase1-load): add db_utils.py — shared psycopg2 helpers (upsert_concept, upsert_term)" \
  scripts/db_utils.py

commit "feat(phase1-load): add load_synonyms.py — load disease/symptom synonym table into concepts+terms" \
  scripts/load_synonyms.py

commit "feat(phase1-load): add load_herbs.py — load 360 herbs into dravyas + property_sets" \
  scripts/load_herbs.py

commit "feat(phase1-load): add load_formulations.py — load enriched yogas + indications + ingredients" \
  scripts/load_formulations.py

commit "feat(phase1-load): add load_constraints.py — load safety constraint rules from YAML" \
  scripts/load_constraints.py

commit "feat(phase1-load): add load_sense_rules.py — load homonym disambiguation rules" \
  scripts/load_sense_rules.py

commit "feat(phase1-load): add load_charaka.py — batch load 8215 Charaka verses into references" \
  scripts/load_charaka.py

commit "feat(phase1-load): add embed_verses.py — OpenAI text-embedding-3-small for pgvector RAG" \
  scripts/embed_verses.py

commit "feat(phase1-load): add run_all_loaders.sh — master loader script (7 steps in order)" \
  scripts/run_all_loaders.sh

# ─────────────────────────────────────────────────────────────────────────────
# PHASE 2 — BACKEND PIPELINE
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "▶ Phase 2 — Backend pipeline"

commit "feat(phase2): add backend/requirements.txt (FastAPI, psycopg2, pydantic, openai)" \
  backend/requirements.txt

commit "feat(phase2): add Pydantic schemas — VignetteInput, ClinicalFrame, RankFeatures, SafetyViolation" \
  backend/models/__init__.py backend/models/schemas.py

commit "feat(phase2-intake): add pipeline/intake.py — validate + normalize vignette, 3 demo presets" \
  backend/pipeline/__init__.py backend/pipeline/intake.py

commit "feat(phase2-understand): add pipeline/understand.py — LLM→ClinicalFrame with graceful fallback" \
  backend/pipeline/understand.py

commit "feat(phase2-resolver): add pipeline/resolver.py — term→concept synonym expansion + sense rules" \
  backend/pipeline/resolver.py

commit "feat(phase2-retriever): add pipeline/retriever.py — SQL candidate retrieval via yoga_indications" \
  backend/pipeline/retriever.py

commit "feat(phase2-safety): add pipeline/safety.py — DETERMINISTIC constraint rule engine (HARD_EXCLUDE / WARN)" \
  backend/pipeline/safety.py

commit "feat(phase2-ranker): add pipeline/ranker.py — W1×primary + W2×secondary + W4×citation - W5×penalty" \
  backend/pipeline/ranker.py

commit "feat(phase2-evidence): add pipeline/evidence.py — evidence pack builder (refs + herb properties)" \
  backend/pipeline/evidence.py

commit "feat(phase2-explainer): add pipeline/explainer.py — LLM citation-bound + template fallback explainer" \
  backend/pipeline/explainer.py

commit "feat(phase2-api): add main.py — FastAPI app (POST /recommend, GET /presets, /compare, /health)" \
  backend/main.py

commit "feat(phase2-api): add backend Dockerfile (python:3.11-slim, uvicorn)" \
  backend/Dockerfile

# ─────────────────────────────────────────────────────────────────────────────
# PHASE 2 — EVAL HARNESS
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "▶ Phase 2 — Eval harness"

commit "feat(phase2-eval): add eval/__init__.py" \
  backend/eval/__init__.py

commit "feat(phase2-eval): add golden_vignettes.json — 27 test cases (pairwise, safety, synonym, citation)" \
  backend/eval/golden_vignettes.json

commit "feat(phase2-eval): add GV-01 Pinasa discrimination — Vyaghryadi > Punarnavadi" \
  backend/eval/golden_vignettes.json

commit "feat(phase2-eval): add GV-03/04 safety gates — Prameha×Asava (CR-01), Garbhini×purgatives (CR-04)" \
  backend/eval/golden_vignettes.json

commit "feat(phase2-eval): add GV-05/06 synonym resolution — Santapa→Jvara, Pratishyaya→Pinasa" \
  backend/eval/golden_vignettes.json

commit "feat(phase2-eval): add run_eval.py — M3/M4/M5 gate harness with --gate flag and verbose output" \
  backend/eval/run_eval.py

# ─────────────────────────────────────────────────────────────────────────────
# PHASE 3 — FRONTEND
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "▶ Phase 3 — Frontend (Next.js)"

commit "feat(phase3-tokens): add styles/tokens.css — §17.10 VedyaAI design tokens (shila/ink/harita/agni/kesar/tamra)" \
  frontend/src/styles/tokens.css

commit "feat(phase3-layout): add globals.css + root layout with DisclaimerBar" \
  frontend/src/app/globals.css frontend/src/app/layout.tsx

commit "feat(phase3-api): add lib/api.ts — typed API client for all backend endpoints" \
  frontend/src/lib/api.ts

commit "feat(phase3-ui): add DisclaimerBar component — always-visible educational disclaimer" \
  frontend/src/components/DisclaimerBar.tsx

commit "feat(phase3-ui): add PrimaryButton component — harita CTA + outline variant" \
  frontend/src/components/PrimaryButton.tsx

commit "feat(phase3-ui): add SafetyDot component — agni/kesar/harita semantic safety indicator" \
  frontend/src/components/SafetyDot.tsx

commit "feat(phase3-ui): add SafetyPanel component — agni-wash panel for HARD_EXCLUDE + WARN violations" \
  frontend/src/components/SafetyPanel.tsx

commit "feat(phase3-ui): add TermChip component — resolved (harita) + unresolved (kesar) term tags" \
  frontend/src/components/TermChip.tsx

commit "feat(phase3-ui): add CaseChip component — sticky vignette summary with comorbidity badges" \
  frontend/src/components/CaseChip.tsx

commit "feat(phase3-ui): add CoverageNote component — honest corpus gap indicator" \
  frontend/src/components/CoverageNote.tsx

commit "feat(phase3-ui): add CitationCard component — tamra-accented classical reference display" \
  frontend/src/components/CitationCard.tsx

commit "feat(phase3-ui): add RankRow component — score bar + compare toggle + safety dot" \
  frontend/src/components/RankRow.tsx

commit "feat(phase3-ui): add CompareTable component — feature-aligned discrimination comparison" \
  frontend/src/components/CompareTable.tsx

commit "feat(phase3-screen): add Home/Demo page — VedyaAI wordmark, mineral hero, 3 preset tiles" \
  frontend/src/app/page.tsx

commit "feat(phase3-screen): add Results page — Safety→TopPick→CompareTeaser→RankList order" \
  frontend/src/app/results/page.tsx

commit "feat(phase3-screen): add Results/IntakePanel — free-text + symptom chips + comorbidity toggles" \
  frontend/src/app/results/page.tsx

commit "feat(phase3-screen): add Compare page — A|B discrimination with CompareTable + winner highlight" \
  frontend/src/app/compare/page.tsx

commit "feat(phase3-screen): add Detail page — PropertyGrid (null→Not in corpus), CitationCards, ambiguity notes" \
  "frontend/src/app/detail/[id]/page.tsx"

commit "feat(phase3-screen): add Learn page — synonym map, quick-links (Jvara/Kasa/Pinasa/Shotha/Prameha)" \
  frontend/src/app/learn/page.tsx

commit "feat(phase3): add frontend Dockerfile (node:20 multi-stage, standalone output)" \
  frontend/Dockerfile

# ─────────────────────────────────────────────────────────────────────────────
# PHASE 4 — INTEGRATION
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "▶ Phase 4 — Integration + precomputed fallbacks"

commit "feat(phase4): add precomputed/pinasa_urti.json — golden fallback (Vyaghryadi #1, Pinasa demo)" \
  backend/precomputed/pinasa_urti.json

commit "feat(phase4): add precomputed/inflammatory_shotha.json — golden fallback (Punarnavadi #1, Shotha demo)" \
  backend/precomputed/inflammatory_shotha.json

commit "feat(phase4): add precomputed/diabetic_respiratory.json — golden fallback (safety gates: CR-01, CR-02)" \
  backend/precomputed/diabetic_respiratory.json

# ─────────────────────────────────────────────────────────────────────────────
# ANY REMAINING UNTRACKED FILES
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "▶ Sweeping remaining untracked files"

# Frontend package files
commit "chore(frontend): add package.json, tsconfig, postcss, eslint config" \
  frontend/package.json frontend/tsconfig.json frontend/postcss.config.mjs frontend/eslint.config.mjs

# Catch any remaining
git add -A
if ! git diff --cached --quiet; then
  git commit -m "chore: add remaining project files (package-lock, public assets, pyc cache cleanup)"
  echo "  ✓ remaining files"
fi

# ─────────────────────────────────────────────────────────────────────────────
# PUSH
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "▶ Pushing to origin/main…"
git push origin main

echo ""
echo "================================================================"
echo "  ✓ All commits pushed to $(git remote get-url origin)"
COMMIT_COUNT=$(git rev-list HEAD --count)
echo "  Total commits on branch: $COMMIT_COUNT"
echo "  Recent commits:"
git log --oneline -15
echo "================================================================"
