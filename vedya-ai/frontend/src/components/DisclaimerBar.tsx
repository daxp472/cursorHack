"use client";

export default function DisclaimerBar() {
  return (
    <div
      style={{
        width: "100%",
        padding: "0.55rem 1rem",
        textAlign: "center",
        fontSize: "0.75rem",
        background: "var(--veda-shila-deep)",
        color: "var(--veda-ink-soft)",
        borderTop: "1px solid var(--veda-fog)",
        fontFamily: "var(--font-ui)",
      }}
    >
      Educational decision support only — not a diagnosis or prescription. Clinical judgment of
      a qualified vaidya is required.
    </div>
  );
}
