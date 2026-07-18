"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { api, FormulationDetail, RecommendedFormulation } from "@/lib/api";
import { useApp } from "@/lib/app-context";
import PrimaryButton from "./PrimaryButton";
import ListenButton from "./ListenButton";
import CitationCard from "./CitationCard";
import IngredientCard from "./IngredientCard";

type Props = {
  formulation: RecommendedFormulation;
};

export default function SolutionPanel({ formulation }: Props) {
  const { t } = useApp();
  const router = useRouter();
  const [detail, setDetail] = useState<FormulationDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .getFormulation(formulation.yoga_id)
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setLoading(false));
  }, [formulation.yoga_id]);

  const dosage = detail?.dosage || formulation.dosage;
  const anupana = detail?.anupana || formulation.anupana;
  const ingredients = detail?.ingredients || [];

  return (
    <section
      className="veda-solution"
      aria-label={t("yourSolution")}
      style={{
        borderRadius: "var(--veda-radius-lg)",
        border: "1px solid var(--veda-harita)",
        background: "linear-gradient(165deg, #fff 0%, var(--veda-harita-soft) 130%)",
        boxShadow: "0 12px 32px rgba(12,20,25,0.07)",
        padding: "1.35rem 1.35rem 1.25rem",
        marginBottom: "1.25rem",
      }}
    >
      <p
        style={{
          margin: "0 0 0.35rem",
          fontSize: "0.72rem",
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--veda-harita)",
        }}
      >
        {t("yourSolution")}
      </p>

      <h2
        style={{
          margin: "0 0 0.35rem",
          fontFamily: "var(--font-display)",
          fontSize: "clamp(1.55rem, 3vw, 2rem)",
          fontWeight: 550,
          color: "var(--veda-ink)",
          lineHeight: 1.15,
        }}
      >
        {formulation.yoga_name}
      </h2>

      <p style={{ margin: "0 0 1rem", color: "var(--veda-ink-soft)", fontSize: "0.9rem" }}>
        {[
          formulation.kalpana,
          `${t("fitScore")} ${formulation.score.toFixed(1)}/10`,
          detail?.external_only ? t("externalOnly") : null,
        ]
          .filter(Boolean)
          .join(" · ")}
      </p>

      {/* Plain solution summary */}
      {formulation.explanation?.summary && (
        <div style={{ marginBottom: "1.1rem" }}>
          <h3 style={sectionTitle}>{t("solutionInShort")}</h3>
          <p style={{ margin: 0, fontSize: "0.98rem", lineHeight: 1.55, color: "var(--veda-ink)" }}>
            {formulation.explanation.summary}
          </p>
        </div>
      )}

      {/* How to take */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "0.65rem",
          marginBottom: "1.1rem",
        }}
        className="veda-solution-how"
      >
        <div style={infoBox}>
          <div style={infoLabel}>{t("howToTake")}</div>
          <div style={infoValue}>{dosage || t("seeDetailForDose")}</div>
        </div>
        <div style={infoBox}>
          <div style={infoLabel}>{t("anupanaLabel")}</div>
          <div style={infoValue}>{anupana || t("asAdvised")}</div>
        </div>
      </div>

      {/* Why / conditions */}
      {formulation.primary_indications.length > 0 && (
        <div style={{ marginBottom: "1.1rem" }}>
          <h3 style={sectionTitle}>{t("helpsWith")}</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
            {formulation.primary_indications.slice(0, 8).map((ind) => (
              <span key={ind} style={chip}>
                {ind}
              </span>
            ))}
          </div>
        </div>
      )}

      {formulation.explanation?.claims && formulation.explanation.claims.length > 0 && (
        <div style={{ marginBottom: "1.1rem" }}>
          <h3 style={sectionTitle}>{t("whyThis")}</h3>
          <ul style={{ margin: 0, paddingLeft: "1.15rem" }}>
            {formulation.explanation.claims.slice(0, 4).map((c, i) => (
              <li key={i} style={{ fontSize: "0.88rem", color: "var(--veda-ink-soft)", marginBottom: 6, lineHeight: 1.45 }}>
                {c.text}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Ingredients with photos */}
      <div style={{ marginBottom: "1.1rem" }}>
        <h3 style={sectionTitle}>{t("whatsInside")}</h3>
        {loading ? (
          <p style={{ color: "var(--veda-fog)", fontSize: "0.85rem" }}>{t("pleaseWait")}</p>
        ) : ingredients.length === 0 ? (
          <p style={{ color: "var(--veda-fog)", fontSize: "0.85rem" }}>{t("ingredientsUnavailable")}</p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: "0.55rem",
            }}
          >
            {ingredients.slice(0, 8).map((ing) => (
              <IngredientCard
                key={ing.name}
                name={ing.name}
                botanicalName={ing.botanical_name}
                englishName={ing.english_name}
                rasa={ing.rasa}
                virya={ing.virya}
                compact
              />
            ))}
          </div>
        )}
      </div>

      {formulation.references[0] && (
        <div style={{ marginBottom: "1rem" }}>
          <h3 style={sectionTitle}>{t("classicalSource")}</h3>
          <CitationCard reference={formulation.references[0]} />
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.55rem", alignItems: "center" }}>
        <ListenButton
          yogaName={formulation.yoga_name}
          kalpana={formulation.kalpana || ""}
          summary={formulation.explanation?.summary || ""}
        />
        <PrimaryButton size="sm" onClick={() => router.push(`/detail/${formulation.yoga_id}`)}>
          {t("fullSolution")} →
        </PrimaryButton>
      </div>
    </section>
  );
}

const sectionTitle: CSSProperties = {
  margin: "0 0 0.45rem",
  fontSize: "0.72rem",
  fontWeight: 700,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "var(--veda-tamra)",
};

const infoBox: CSSProperties = {
  background: "var(--veda-surface)",
  border: "1px solid var(--veda-shila-deep)",
  borderRadius: 12,
  padding: "0.7rem 0.8rem",
};

const infoLabel: CSSProperties = {
  fontSize: "0.68rem",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: "var(--veda-fog)",
  marginBottom: 4,
};

const infoValue: CSSProperties = {
  fontSize: "0.9rem",
  color: "var(--veda-ink)",
  lineHeight: 1.4,
  fontWeight: 500,
};

const chip: CSSProperties = {
  fontSize: "0.78rem",
  padding: "0.3rem 0.65rem",
  borderRadius: 8,
  background: "var(--veda-surface)",
  border: "1px solid var(--veda-shila-deep)",
  color: "var(--veda-ink)",
};
