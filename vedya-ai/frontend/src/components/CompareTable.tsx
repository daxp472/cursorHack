"use client";
import { CompareResult } from "@/lib/api";
import CitationCard from "./CitationCard";
import SafetyPanel from "./SafetyPanel";

interface Props {
  result: CompareResult;
}

interface FeatureRow {
  label: string;
  a: string | string[] | null;
  b: string | string[] | null;
  highlight?: boolean;
}

function getValue(arr: string[] | null | undefined): string {
  if (!arr || arr.length === 0) return "—";
  return arr.slice(0, 4).join(", ");
}

export default function CompareTable({ result }: Props) {
  const { yoga_a, yoga_b, discrimination_explanation, winner_yoga_id } = result;

  const aIsWinner = winner_yoga_id === yoga_a.yoga_id;
  const bIsWinner = winner_yoga_id === yoga_b.yoga_id;

  const featureRows: FeatureRow[] = [
    {
      label: "Kalpana (Form)",
      a: yoga_a.kalpana || "—",
      b: yoga_b.kalpana || "—",
    },
    {
      label: "Primary Indications",
      a: getValue(yoga_a.primary_indications),
      b: getValue(yoga_b.primary_indications),
      highlight: true,
    },
    {
      label: "Secondary Indications",
      a: getValue(yoga_a.secondary_indications),
      b: getValue(yoga_b.secondary_indications),
      highlight: true,
    },
    {
      label: "Key Ingredients",
      a: getValue(yoga_a.ingredients as string[]),
      b: getValue(yoga_b.ingredients as string[]),
    },
    {
      label: "Safety Status",
      a: yoga_a.safety_violations.length
        ? yoga_a.safety_violations.map((v) => v.severity).join(", ")
        : "No concerns",
      b: yoga_b.safety_violations.length
        ? yoga_b.safety_violations.map((v) => v.severity).join(", ")
        : "No concerns",
    },
    {
      label: "Fit Score",
      a: yoga_a.score ? yoga_a.score.toFixed(1) : "—",
      b: yoga_b.score ? yoga_b.score.toFixed(1) : "—",
      highlight: true,
    },
    {
      label: "Citations Available",
      a: yoga_a.references.length > 0 ? `${yoga_a.references.length} reference(s)` : "None",
      b: yoga_b.references.length > 0 ? `${yoga_b.references.length} reference(s)` : "None",
    },
  ];

  return (
    <div style={{ fontFamily: "var(--font-ui)" }}>
      {/* Column headers */}
      <div className="grid grid-cols-3 gap-4 mb-2">
        <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--veda-fog)" }}>
          Feature
        </div>
        <div
          className={`text-base font-semibold p-3 rounded-xl text-center ${aIsWinner ? "ring-2" : ""}`}
          style={{
            fontFamily: "var(--font-display)",
            color: "var(--veda-ink)",
            background: aIsWinner ? "var(--veda-harita-soft)" : "var(--veda-surface)",
            ...(aIsWinner ? { outline: "2px solid var(--veda-harita)" } : {}),
          }}
        >
          {yoga_a.yoga_name}
          {aIsWinner && (
            <div className="text-xs font-normal mt-0.5" style={{ color: "var(--veda-harita)" }}>
              Preferred for this case
            </div>
          )}
        </div>
        <div
          className={`text-base font-semibold p-3 rounded-xl text-center`}
          style={{
            fontFamily: "var(--font-display)",
            color: "var(--veda-ink)",
            background: bIsWinner ? "var(--veda-harita-soft)" : "var(--veda-surface)",
            ...(bIsWinner ? { outline: "2px solid var(--veda-harita)" } : {}),
          }}
        >
          {yoga_b.yoga_name}
          {bIsWinner && (
            <div className="text-xs font-normal mt-0.5" style={{ color: "var(--veda-harita)" }}>
              Preferred for this case
            </div>
          )}
        </div>
      </div>

      {/* Feature rows */}
      <div className="space-y-1">
        {featureRows.map((row) => (
          <div
            key={row.label}
            className="grid grid-cols-3 gap-4 items-start py-3 px-2 rounded-lg"
            style={{
              background: row.highlight ? "var(--veda-shila-deep)" : "transparent",
              borderBottom: "1px solid var(--veda-shila-deep)",
            }}
          >
            <div className="text-xs font-medium" style={{ color: "var(--veda-ink-soft)" }}>
              {row.label}
            </div>
            <div className="text-sm" style={{ color: "var(--veda-ink)" }}>
              {Array.isArray(row.a) ? row.a.join(", ") : row.a}
            </div>
            <div className="text-sm" style={{ color: "var(--veda-ink)" }}>
              {Array.isArray(row.b) ? row.b.join(", ") : row.b}
            </div>
          </div>
        ))}
      </div>

      {/* Safety panels */}
      {(yoga_a.safety_violations.length > 0 || yoga_b.safety_violations.length > 0) && (
        <div className="grid grid-cols-2 gap-4 mt-4">
          <SafetyPanel violations={yoga_a.safety_violations} />
          <SafetyPanel violations={yoga_b.safety_violations} />
        </div>
      )}

      {/* Discrimination explanation */}
      {discrimination_explanation && (
        <div
          className="mt-6 p-4 rounded-xl"
          style={{ background: "var(--veda-surface)", border: "1px solid var(--veda-shila-deep)" }}
        >
          <div className="font-semibold text-sm mb-2" style={{ color: "var(--veda-harita)" }}>
            Discrimination Reasoning
          </div>
          <p className="text-sm leading-relaxed" style={{ color: "var(--veda-ink)" }}>
            {discrimination_explanation.summary}
          </p>
          {discrimination_explanation.claims.map((claim, i) => (
            <p key={i} className="text-sm mt-2" style={{ color: "var(--veda-ink-soft)" }}>
              {claim.text}
            </p>
          ))}
        </div>
      )}

      {/* References */}
      <div className="grid grid-cols-2 gap-4 mt-4">
        <div>
          {yoga_a.references.slice(0, 2).map((ref) => (
            <CitationCard key={ref.ref_id} reference={ref} />
          ))}
        </div>
        <div>
          {yoga_b.references.slice(0, 2).map((ref) => (
            <CitationCard key={ref.ref_id} reference={ref} />
          ))}
        </div>
      </div>

      {/* Footer */}
      <div
        className="mt-6 text-center text-xs py-3 rounded-lg"
        style={{
          color: "var(--veda-ink-soft)",
          background: "var(--veda-shila-deep)",
        }}
      >
        Human clinical judgment required — this comparison is a decision support aid only.
      </div>
    </div>
  );
}
