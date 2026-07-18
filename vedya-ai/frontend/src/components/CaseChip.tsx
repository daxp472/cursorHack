"use client";

interface Props {
  summary: string;
  comorbidities?: string[];
  onReset?: () => void;
}

export default function CaseChip({ summary, comorbidities, onReset }: Props) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-2 rounded-xl text-sm"
      style={{
        background: "var(--veda-ink)",
        color: "white",
        fontFamily: "var(--font-ui)",
      }}
    >
      <span className="font-medium truncate max-w-xs">{summary}</span>
      {comorbidities && comorbidities.length > 0 && (
        <span
          className="px-2 py-0.5 rounded-full text-xs"
          style={{ background: "var(--veda-kesar)", color: "white" }}
        >
          {comorbidities.join(", ")}
        </span>
      )}
      {onReset && (
        <button
          onClick={onReset}
          className="ml-auto text-xs opacity-60 hover:opacity-100 transition-opacity"
          aria-label="Reset case"
        >
          Reset
        </button>
      )}
    </div>
  );
}
