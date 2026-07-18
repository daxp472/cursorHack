"use client";

import { useEffect, useState } from "react";

type Props = {
  name: string;
  botanicalName?: string | null;
  englishName?: string | null;
  rasa?: string[] | null;
  virya?: string | null;
  compact?: boolean;
};

/** Dynamic plant photo via Wikipedia summary thumbnail (no hardcoded image URLs). */
async function resolveHerbImage(queries: string[]): Promise<string | null> {
  for (const q of queries) {
    const term = q.trim();
    if (!term) continue;
    try {
      const res = await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(term)}`
      );
      if (!res.ok) continue;
      const data = await res.json();
      const src = data?.thumbnail?.source as string | undefined;
      if (src) return src;
    } catch {
      /* try next query */
    }
  }
  return null;
}

function hueFromName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h + name.charCodeAt(i) * 17) % 360;
  return h;
}

export default function IngredientCard({
  name,
  botanicalName,
  englishName,
  rasa,
  virya,
  compact = false,
}: Props) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const hue = hueFromName(name);

  useEffect(() => {
    let cancelled = false;
    const queries = [botanicalName, englishName, name].filter(Boolean) as string[];
    resolveHerbImage(queries).then((url) => {
      if (!cancelled) setSrc(url);
    });
    return () => {
      cancelled = true;
    };
  }, [name, botanicalName, englishName]);

  const size = compact ? 64 : 88;

  return (
    <article
      className="veda-ing-card"
      style={{
        display: "flex",
        gap: compact ? "0.65rem" : "0.85rem",
        alignItems: "stretch",
        padding: compact ? "0.65rem" : "0.85rem",
        borderRadius: "var(--veda-radius)",
        border: "1px solid var(--veda-shila-deep)",
        background: "var(--veda-surface)",
      }}
    >
      <div
        style={{
          width: size,
          height: size,
          flexShrink: 0,
          borderRadius: 10,
          overflow: "hidden",
          background: `linear-gradient(145deg, hsl(${hue} 28% 88%), hsl(${(hue + 40) % 360} 22% 78%))`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {src && !failed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={name}
            width={size}
            height={size}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={() => setFailed(true)}
          />
        ) : (
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: compact ? "1.25rem" : "1.6rem",
              color: `hsl(${hue} 35% 32%)`,
              fontWeight: 550,
            }}
          >
            {name.slice(0, 1).toUpperCase()}
          </span>
        )}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: compact ? "0.95rem" : "1.05rem",
            color: "var(--veda-ink)",
            fontWeight: 550,
          }}
        >
          {name}
        </div>
        {(botanicalName || englishName) && (
          <div style={{ fontSize: "0.72rem", color: "var(--veda-fog)", fontStyle: "italic", marginTop: 2 }}>
            {botanicalName || englishName}
          </div>
        )}
        {!compact && (rasa?.length || virya) && (
          <div style={{ marginTop: 6, fontSize: "0.75rem", color: "var(--veda-ink-soft)", lineHeight: 1.4 }}>
            {rasa?.length ? <div>Rasa: {rasa.slice(0, 3).join(", ")}</div> : null}
            {virya ? <div>Virya: {virya}</div> : null}
          </div>
        )}
      </div>
    </article>
  );
}
