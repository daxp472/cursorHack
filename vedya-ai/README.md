# VedyaAI

**Classical Ayurvedic Formulation Discrimination & Learning Platform**

> Educational decision support — not a diagnosis or prescription. Clinical judgment of a qualified vaidya is required.

---

## Quick Start (Docker)

```bash
# 1. Copy and configure environment
cp .env.example .env
# Set OPENAI_API_KEY (optional — system works without it)

# 2. Start all services
docker compose up -d

# 3. Load data (first time only)
docker exec vedya_api bash -c "cd /app && pip install psycopg2-binary pyyaml && python3 /app/data/../scripts/run_all_loaders.sh"

# Or run from scripts/ directory:
cd scripts && DATABASE_URL=postgresql://vedya:vedyapass@localhost:5432/vedyaai bash run_all_loaders.sh

# 4. Open the app
open http://localhost:3000
open http://localhost:8000/docs  # API docs
```

---

## Development Setup

### Backend (FastAPI)

```bash
cd backend
pip install -r requirements.txt

# Start postgres first (docker compose up postgres)
export DATABASE_URL=postgresql://vedya:vedyapass@localhost:5432/vedyaai
export LLM_ENABLED=false   # or true with OPENAI_API_KEY
uvicorn main:app --reload --port 8000
```

### Load data

```bash
cd scripts
DATABASE_URL=postgresql://vedya:vedyapass@localhost:5432/vedyaai bash run_all_loaders.sh
```

### Frontend (Next.js)

```bash
cd frontend
npm install
NEXT_PUBLIC_API_URL=http://localhost:8000 npm run dev
# Open http://localhost:3000
```

---

## Running the Eval Harness

```bash
cd backend

# M3 gate — ranker works without LLM
LLM_ENABLED=false DATABASE_URL=... python3 eval/run_eval.py --gate M3

# M4 gate — safety 100%
DATABASE_URL=... python3 eval/run_eval.py --gate M4

# M5 gate — zero hallucinated citations
DATABASE_URL=... python3 eval/run_eval.py --gate M5

# All gates
DATABASE_URL=... python3 eval/run_eval.py
```

---

## Architecture

```
User vignette
  → NL Understand (LLM→ClinicalFrame, or structured)
  → Entity Resolver (synonym expansion + sense rules)
  → Candidate Retriever (SQL: yoga_indications)
  → Safety Engine (DETERMINISTIC: ConstraintRules)
  → Ranker (feature-weighted score: W1*primary + W2*secondary - W5*penalty)
  → Evidence Pack Builder
  → Explainer (LLM citation-bound OR template fallback)
  → RecommendationResponse
```

**Key principle**: Structure decides. Rules protect. Retrieval grounds. LLM explains.

---

## Data Sources

| File | Content |
|------|---------|
| `data/raw/formulations_bhaishajya.json` | 178 formulations (Bhaishajya Ratnavali) |
| `data/raw/herbs_amidha.json` | 360 herbs with full pharmacological properties |
| `data/raw/Ayurveda/charak-samhita/` | 8215 verses from Charaka Samhita (RAG evidence) |
| `data/synonyms.yaml` | Disease/symptom synonym table |
| `data/constraint_rules.yaml` | Safety rules (diabetes, pregnancy, etc.) |
| `data/sense_rules.yaml` | Homonym disambiguation (Abhaya context rule) |

---

## Demo Presets

1. **Pinasa URTI** — Fever + Cough + Common Cold → Vyaghryadi > Punarnavadi (discrimination demo)
2. **Inflammatory Shotha** — Fever + Cough + Edema → Punarnavadi > Vyaghryadi (reverse discrimination)
3. **Diabetic + Respiratory** — Diabetes + Fever + Cough → Safety gates fire for Asava/Arishta and Guda

---

## Milestones

| Gate | Criteria |
|------|---------|
| M3 | Pinasa ranks Vyaghryadi > Punarnavadi with `LLM_ENABLED=false` |
| M4 | 100% safety rule catch on all golden cases |
| M5 | 0 fabricated citations in top-5 explanations |
| M6 | 3 presets one-click, fallback JSON verified |
