"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, CompareResult } from "@/lib/api";
import CompareTable from "@/components/CompareTable";
import PrimaryButton from "@/components/PrimaryButton";

function CompareContent() {
  const router = useRouter();
  const params = useSearchParams();
  const yogaAId = params.get("a") || "";
  const yogaBId = params.get("b") || "";

  const [result, setResult] = useState<CompareResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!yogaAId || !yogaBId) {
      setError("Two formulation IDs required (a= and b= params).");
      setLoading(false);
      return;
    }
    const stored = sessionStorage.getItem("vedya_results");
    const currentInput = stored ? JSON.parse(stored)?.vignette_summary : undefined;
    api
      .compare(yogaAId, yogaBId, currentInput ? { free_text: currentInput } : undefined)
      .then(setResult)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [yogaAId, yogaBId]);

  return (
    <div style={{ background: "var(--veda-shila)", minHeight: "100vh" }}>
      {/* Header */}
      <div
        className="sticky top-0 z-10 px-6 py-3 flex items-center gap-4"
        style={{ background: "var(--veda-ink)" }}
      >
        <button onClick={() => router.back()} className="text-sm" style={{ color: "rgba(247,249,248,0.6)" }}>
          ← Results
        </button>
        <span
          className="text-base font-semibold"
          style={{ fontFamily: "var(--font-display)", color: "#F7F9F8" }}
        >
          Compare
        </span>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <h1
          className="text-2xl font-medium mb-6"
          style={{ fontFamily: "var(--font-display)", color: "var(--veda-ink)" }}
        >
          Formulation Comparison
        </h1>

        {loading && (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--veda-harita)" }} />
          </div>
        )}

        {error && (
          <div className="text-sm p-4 rounded-xl" style={{ background: "var(--veda-agni-soft)", color: "var(--veda-agni)" }}>
            {error}
          </div>
        )}

        {result && !loading && <CompareTable result={result} />}

        <div className="mt-8 flex gap-4">
          <PrimaryButton variant="outline" onClick={() => router.back()}>
            ← Back to Results
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense>
      <CompareContent />
    </Suspense>
  );
}
