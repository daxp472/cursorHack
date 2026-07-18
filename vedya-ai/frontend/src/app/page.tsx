"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, PresetVignette } from "@/lib/api";
import PrimaryButton from "@/components/PrimaryButton";

function PresetCard({ preset, onRun, loading }: { preset: PresetVignette; onRun: () => void; loading: boolean }) {
  return (
    <div
      className="rounded-2xl p-6 cursor-pointer transition-all duration-150 hover:shadow-md"
      style={{
        background: "var(--veda-surface)",
        border: "1px solid var(--veda-shila-deep)",
        fontFamily: "var(--font-ui)",
      }}
      onClick={!loading ? onRun : undefined}
    >
      <div
        className="text-lg font-semibold mb-2"
        style={{ fontFamily: "var(--font-display)", color: "var(--veda-ink)" }}
      >
        {preset.label}
      </div>
      <p className="text-sm leading-relaxed mb-4" style={{ color: "var(--veda-ink-soft)" }}>
        {preset.description}
      </p>
      <PrimaryButton size="sm" onClick={onRun} disabled={loading}>
        {loading ? "Running…" : "Open Preset"}
      </PrimaryButton>
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [presets, setPresets] = useState<PresetVignette[]>([]);
  const [loadingPreset, setLoadingPreset] = useState<string | null>(null);
  const [freeText, setFreeText] = useState("");
  const [running, setRunning] = useState(false);

  useEffect(() => {
    api.getPresets().then(setPresets).catch(console.error);
  }, []);

  async function runPreset(presetId: string) {
    setLoadingPreset(presetId);
    try {
      const result = await api.runPreset(presetId);
      sessionStorage.setItem("vedya_results", JSON.stringify(result));
      router.push("/results");
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingPreset(null);
    }
  }

  async function runFreeText() {
    if (!freeText.trim()) return;
    setRunning(true);
    try {
      const result = await api.recommend({
        free_text: freeText,
        symptoms: [],
        rogas: [],
        comorbidities: [],
        top_k: 10,
      });
      sessionStorage.setItem("vedya_results", JSON.stringify(result));
      router.push("/results");
    } catch (e) {
      console.error(e);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--veda-shila)" }}
    >
      {/* Hero */}
      <div
        className="relative flex flex-col items-center justify-center px-6 py-24 text-center"
        style={{
          background: "linear-gradient(160deg, var(--veda-ink) 0%, #1a3028 100%)",
          minHeight: "55vh",
        }}
      >
        {/* Subtle botanical silhouette texture */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='40' cy='40' r='35' stroke='white' stroke-width='1'/%3E%3Ccircle cx='40' cy='40' r='25' stroke='white' stroke-width='0.5'/%3E%3C/svg%3E\")",
            backgroundSize: "80px 80px",
          }}
        />

        <div className="relative z-10 max-w-2xl mx-auto">
          {/* Brand */}
          <div
            className="text-5xl md:text-6xl font-medium mb-4"
            style={{ fontFamily: "var(--font-display)", color: "#F7F9F8", letterSpacing: "-0.02em" }}
          >
            VedyaAI
          </div>

          <p
            className="text-xl md:text-2xl mb-3"
            style={{ color: "rgba(247,249,248,0.75)", fontFamily: "var(--font-ui)", fontWeight: 400 }}
          >
            Classical Ayurvedic Formulation Discriminator
          </p>

          <p
            className="text-base max-w-lg mx-auto mb-10"
            style={{ color: "rgba(247,249,248,0.5)", fontFamily: "var(--font-ui)" }}
          >
            Rank formulations with comparative explanations, classical citations, and safety gates.
            Not a diagnosis. Not a prescription. A decision support companion.
          </p>

          {/* Quick input */}
          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md mx-auto">
            <input
              type="text"
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              placeholder="Fever, cough, common cold…"
              className="flex-1 px-4 py-3 rounded-xl text-sm outline-none"
              style={{
                background: "rgba(247,249,248,0.1)",
                border: "1px solid rgba(247,249,248,0.2)",
                color: "white",
                fontFamily: "var(--font-ui)",
              }}
              onKeyDown={(e) => e.key === "Enter" && runFreeText()}
            />
            <PrimaryButton onClick={runFreeText} disabled={running || !freeText.trim()}>
              {running ? "Ranking…" : "Rank"}
            </PrimaryButton>
          </div>

          <p className="mt-4 text-xs" style={{ color: "rgba(247,249,248,0.35)" }}>
            Or choose a preset clinical vignette below
          </p>
        </div>
      </div>

      {/* Preset tiles */}
      <div
        className="flex-1 max-w-5xl mx-auto w-full px-6 py-12"
        style={{ fontFamily: "var(--font-ui)" }}
      >
        <h2
          className="text-xl font-semibold mb-6"
          style={{ color: "var(--veda-ink)", fontFamily: "var(--font-ui)" }}
        >
          Demo Vignettes
        </h2>

        {presets.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-2xl p-6 h-44 animate-pulse"
                style={{ background: "var(--veda-surface)" }}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {presets.map((p) => (
              <PresetCard
                key={p.id}
                preset={p}
                onRun={() => runPreset(p.id)}
                loading={loadingPreset === p.id}
              />
            ))}
          </div>
        )}

        <div className="mt-8 text-center">
          <PrimaryButton
            variant="outline"
            size="lg"
            onClick={() => router.push("/results?intake=true")}
          >
            New Case
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
