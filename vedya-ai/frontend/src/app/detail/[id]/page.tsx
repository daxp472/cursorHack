"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, FormulationDetail } from "@/lib/api";
import CitationCard from "@/components/CitationCard";
import PrimaryButton from "@/components/PrimaryButton";

function PropertyRow({ label, value }: { label: string; value?: string | string[] | null }) {
  const display = !value || (Array.isArray(value) && value.length === 0) ? null : value;
  return (
    <div
      className="flex justify-between items-start py-2.5 text-sm"
      style={{ borderBottom: "1px solid var(--veda-shila-deep)" }}
    >
      <span className="font-medium w-32" style={{ color: "var(--veda-ink-soft)" }}>{label}</span>
      <span className="flex-1 text-right" style={{ color: display ? "var(--veda-ink)" : "var(--veda-fog)" }}>
        {display
          ? Array.isArray(display)
            ? display.join(", ")
            : display
          : "Not in corpus"}
      </span>
    </div>
  );
}

export default function DetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [detail, setDetail] = useState<FormulationDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getFormulation(params.id)
      .then(setDetail)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: "var(--veda-shila)" }}>
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--veda-harita)" }} />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen" style={{ background: "var(--veda-shila)" }}>
        <p style={{ color: "var(--veda-ink-soft)" }}>Formulation not found.</p>
        <PrimaryButton className="mt-4" onClick={() => router.back()}>Go Back</PrimaryButton>
      </div>
    );
  }

  return (
    <div style={{ background: "var(--veda-shila)", minHeight: "100vh", fontFamily: "var(--font-ui)" }}>
      {/* Header */}
      <div className="sticky top-0 z-10 px-6 py-3 flex items-center gap-4" style={{ background: "var(--veda-ink)" }}>
        <button onClick={() => router.back()} className="text-sm" style={{ color: "rgba(247,249,248,0.6)" }}>← Back</button>
        <span className="text-base font-semibold" style={{ fontFamily: "var(--font-display)", color: "#F7F9F8" }}>
          Formulation Detail
        </span>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Name + kalpana */}
        <h1 className="text-3xl font-medium mb-1" style={{ fontFamily: "var(--font-display)", color: "var(--veda-ink)" }}>
          {detail.name}
        </h1>
        <div className="flex items-center gap-2 mb-6">
          {detail.kalpana && (
            <span className="text-sm px-3 py-1 rounded-full" style={{ background: "var(--veda-shila-deep)", color: "var(--veda-ink-soft)" }}>
              {detail.kalpana}
            </span>
          )}
          {detail.external_only && (
            <span className="text-xs px-3 py-1 rounded-full font-medium" style={{ background: "var(--veda-agni-soft)", color: "var(--veda-agni)" }}>
              External use only
            </span>
          )}
          {detail.category && (
            <span className="text-sm" style={{ color: "var(--veda-ink-soft)" }}>{detail.category}</span>
          )}
        </div>

        {/* Pharmacological properties */}
        <section className="mb-8">
          <h2 className="font-semibold text-base mb-3" style={{ color: "var(--veda-ink)" }}>
            Pharmacological Properties
          </h2>
          <div className="rounded-xl p-4" style={{ background: "var(--veda-surface)", border: "1px solid var(--veda-shila-deep)" }}>
            {detail.ingredients.slice(0, 3).map((ing) => (
              <div key={ing.name} className="mb-4">
                <div className="font-medium text-sm mb-1" style={{ color: "var(--veda-ink)" }}>
                  {ing.name}
                  {ing.botanical_name && <span className="text-xs italic ml-2" style={{ color: "var(--veda-fog)" }}>({ing.botanical_name})</span>}
                </div>
                <PropertyRow label="Rasa" value={ing.rasa} />
                <PropertyRow label="Guna" value={ing.guna} />
                <PropertyRow label="Virya" value={ing.virya} />
                <PropertyRow label="Vipaka" value={ing.vipaka} />
              </div>
            ))}
          </div>
        </section>

        {/* Dosage + Anupana */}
        {(detail.dosage || detail.anupana) && (
          <section className="mb-8">
            <h2 className="font-semibold text-base mb-3" style={{ color: "var(--veda-ink)" }}>Administration</h2>
            <div className="rounded-xl p-4" style={{ background: "var(--veda-surface)", border: "1px solid var(--veda-shila-deep)" }}>
              <PropertyRow label="Dosage" value={detail.dosage} />
              <PropertyRow label="Anupana" value={detail.anupana} />
            </div>
          </section>
        )}

        {/* Ambiguity / homonym notes */}
        {detail.ambiguity_notes && Object.keys(detail.ambiguity_notes).length > 0 && (
          <section className="mb-8">
            <h2 className="font-semibold text-base mb-3" style={{ color: "var(--veda-ink)" }}>
              Contextual Disambiguation
            </h2>
            {Object.entries(detail.ambiguity_notes).map(([term, note]) => (
              <div key={term} className="rounded-xl p-4 mb-2" style={{ background: "var(--veda-tamra-soft)", border: "1px solid var(--veda-tamra)" }}>
                <div className="font-semibold text-sm mb-1" style={{ color: "var(--veda-tamra)" }}>
                  {term} — context-specific meaning
                </div>
                <p className="text-sm" style={{ color: "var(--veda-ink)" }}>{note}</p>
              </div>
            ))}
          </section>
        )}

        {/* References */}
        <section className="mb-8">
          <h2 className="font-semibold text-base mb-3" style={{ color: "var(--veda-ink)" }}>Classical References</h2>
          {detail.references.length > 0 ? (
            <div className="space-y-2">
              {detail.references.map((r) => <CitationCard key={r.ref_id} reference={r} />)}
            </div>
          ) : (
            <p className="text-sm" style={{ color: "var(--veda-fog)" }}>Reference details not available in corpus.</p>
          )}
        </section>

        <PrimaryButton variant="outline" onClick={() => router.back()}>← Back</PrimaryButton>
      </div>
    </div>
  );
}
