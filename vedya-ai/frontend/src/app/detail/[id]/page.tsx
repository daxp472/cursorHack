"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, FormulationDetail } from "@/lib/api";
import CitationCard from "@/components/CitationCard";
import PrimaryButton from "@/components/PrimaryButton";
import IngredientCard from "@/components/IngredientCard";
import { useApp } from "@/lib/app-context";

export default function DetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { t } = useApp();
  const [detail, setDetail] = useState<FormulationDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getFormulation(params.id)
      .then(setDetail)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: "var(--veda-shila)" }}>
        <div
          className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: "var(--veda-harita)" }}
        />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen" style={{ background: "var(--veda-shila)" }}>
        <p style={{ color: "var(--veda-ink-soft)" }}>{t("noResults")}</p>
        <PrimaryButton className="mt-4" onClick={() => router.back()}>
          {t("backToResults")}
        </PrimaryButton>
      </div>
    );
  }

  return (
    <div style={{ background: "var(--veda-shila)", minHeight: "100vh", fontFamily: "var(--font-ui)" }}>
      <div
        className="sticky top-0 z-10 px-6 py-3 flex items-center gap-4"
        style={{ background: "var(--veda-ink)" }}
      >
        <button onClick={() => router.back()} className="text-sm" style={{ color: "rgba(247,249,248,0.6)" }}>
          ← {t("backToResults")}
        </button>
        <span className="text-base font-semibold" style={{ fontFamily: "var(--font-display)", color: "#F7F9F8" }}>
          {t("fullSolution")}
        </span>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8">
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
        <h1
          className="text-3xl font-medium mb-2"
          style={{ fontFamily: "var(--font-display)", color: "var(--veda-ink)" }}
        >
          {detail.name}
        </h1>
        <div className="flex items-center gap-2 flex-wrap mb-6">
          {detail.kalpana && (
            <span
              className="text-sm px-3 py-1 rounded-full"
              style={{ background: "var(--veda-shila-deep)", color: "var(--veda-ink-soft)" }}
            >
              {detail.kalpana}
            </span>
          )}
          {detail.external_only && (
            <span
              className="text-xs px-3 py-1 rounded-full font-medium"
              style={{ background: "var(--veda-agni-soft)", color: "var(--veda-agni)" }}
            >
              {t("externalOnly")}
            </span>
          )}
          {detail.category && (
            <span className="text-sm" style={{ color: "var(--veda-ink-soft)" }}>
              {detail.category}
            </span>
          )}
        </div>

        <section className="mb-8">
          <h2 className="font-semibold text-base mb-3" style={{ color: "var(--veda-ink)" }}>
            {t("administration")}
          </h2>
          <div
            className="rounded-xl p-4 grid gap-3"
            style={{
              background: "var(--veda-surface)",
              border: "1px solid var(--veda-shila-deep)",
              gridTemplateColumns: "1fr 1fr",
            }}
          >
            <div>
              <div className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: "var(--veda-fog)" }}>
                {t("howToTake")}
              </div>
              <div className="text-sm" style={{ color: "var(--veda-ink)" }}>
                {detail.dosage || t("seeDetailForDose")}
              </div>
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: "var(--veda-fog)" }}>
                {t("anupanaLabel")}
              </div>
              <div className="text-sm" style={{ color: "var(--veda-ink)" }}>
                {detail.anupana || t("asAdvised")}
              </div>
            </div>
          </div>
          {detail.differentiation_note && (
            <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--veda-ink-soft)" }}>
              {detail.differentiation_note}
            </p>
          )}
        </section>

        <section className="mb-8">
          <h2 className="font-semibold text-base mb-3" style={{ color: "var(--veda-ink)" }}>
            {t("allIngredients")}
          </h2>
          {detail.ingredients.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--veda-fog)" }}>
              {t("ingredientsUnavailable")}
            </p>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                gap: "0.65rem",
              }}
            >
              {detail.ingredients.map((ing) => (
                <IngredientCard
                  key={ing.name}
                  name={ing.name}
                  botanicalName={ing.botanical_name}
                  englishName={ing.english_name}
                  rasa={ing.rasa}
                  virya={ing.virya}
                />
              ))}
            </div>
          )}
        </section>

        {detail.ambiguity_notes && Object.keys(detail.ambiguity_notes).length > 0 && (
          <section className="mb-8">
            <h2 className="font-semibold text-base mb-3" style={{ color: "var(--veda-ink)" }}>
              {t("whyThis")}
            </h2>
            {Object.entries(detail.ambiguity_notes).map(([term, note]) => (
              <div
                key={term}
                className="rounded-xl p-4 mb-2"
                style={{ background: "var(--veda-tamra-soft)", border: "1px solid var(--veda-tamra)" }}
              >
                <div className="font-semibold text-sm mb-1" style={{ color: "var(--veda-tamra)" }}>
                  {term}
                </div>
                <p className="text-sm" style={{ color: "var(--veda-ink)" }}>
                  {note}
                </p>
              </div>
            ))}
          </section>
        )}

        <section className="mb-8">
          <h2 className="font-semibold text-base mb-3" style={{ color: "var(--veda-ink)" }}>
            {t("classicalSource")}
          </h2>
          {detail.references.length > 0 ? (
            <div className="space-y-2">
              {detail.references.map((r) => (
                <CitationCard key={r.ref_id} reference={r} />
              ))}
            </div>
          ) : (
            <p className="text-sm" style={{ color: "var(--veda-fog)" }}>
              {detail.reference_text || t("ingredientsUnavailable")}
            </p>
          )}
        </section>

        <PrimaryButton variant="outline" onClick={() => router.back()}>
          ← {t("backToResults")}
        </PrimaryButton>
      </div>
    </div>
  );
}
