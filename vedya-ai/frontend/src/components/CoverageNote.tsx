"use client";

interface Props {
  note: string;
}

export default function CoverageNote({ note }: Props) {
  return (
    <div
      className="text-xs px-4 py-2 rounded-lg text-center"
      style={{
        background: "var(--veda-shila-deep)",
        color: "var(--veda-ink-soft)",
        border: "1px dashed var(--veda-fog)",
        fontFamily: "var(--font-ui)",
      }}
    >
      {note}
    </div>
  );
}
