"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, RecommendationResponse } from "@/lib/api";
import { useApp } from "@/lib/app-context";
import PrimaryButton from "@/components/PrimaryButton";

export default function DashboardPage() {
  const { t, user, setConversationId, logout } = useApp();
  const router = useRouter();
  const [items, setItems] = useState<
    Array<{ conversation_id: string; title: string; locale: string; updated_at?: string }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
    setLoading(true);
    api
      .listConversations()
      .then(setItems)
      .catch(() => setError(t("authError")))
      .finally(() => setLoading(false));
  }, [user, router, t]);

  async function openCase(id: string) {
    try {
      const detail = await api.getConversation(id);
      const lastAssistant = [...detail.messages]
        .reverse()
        .find((m) => m.role === "assistant" && m.payload);
      if (lastAssistant?.payload) {
        sessionStorage.setItem(
          "vedya_results",
          JSON.stringify(lastAssistant.payload as RecommendationResponse)
        );
        setConversationId(id);
        router.push("/results");
      }
    } catch {
      setError(t("authError"));
    }
  }

  if (!user) {
    return (
      <div className="veda-dash-shell">
        <p style={{ color: "var(--veda-ink-soft)" }}>{t("pleaseWait")}</p>
      </div>
    );
  }

  return (
    <div className="veda-dash-shell">
      <div className="veda-dash">
        <header className="veda-dash-header">
          <div>
            <p className="veda-dash-eyebrow">{t("dashboardEyebrow")}</p>
            <h1 className="veda-dash-title">
              {t("dashboardWelcome", { name: user.display_name || user.email.split("@")[0] })}
            </h1>
            <p className="veda-dash-sub">{t("dashboardSub")}</p>
          </div>
          <div className="veda-dash-actions">
            <PrimaryButton onClick={() => router.push("/results?intake=true")}>
              {t("newCase")}
            </PrimaryButton>
            <PrimaryButton variant="outline" onClick={() => router.push("/")}>
              {t("goHome")}
            </PrimaryButton>
          </div>
        </header>

        <section className="veda-dash-grid">
          <article className="veda-dash-card veda-dash-card-accent">
            <h2>{t("dashQuickRank")}</h2>
            <p>{t("dashQuickRankHint")}</p>
            <PrimaryButton size="sm" onClick={() => router.push("/")}>
              {t("rank")} →
            </PrimaryButton>
          </article>
          <article className="veda-dash-card">
            <h2>{t("history")}</h2>
            <p>{t("dashCasesHint")}</p>
            <div className="veda-dash-stat">{loading ? "…" : items.length}</div>
          </article>
          <article className="veda-dash-card">
            <h2>{t("dashSession")}</h2>
            <p style={{ fontSize: "0.85rem", wordBreak: "break-all" }}>{user.email}</p>
            <button type="button" className="veda-link-btn veda-link-btn-ghost" onClick={logout}>
              {t("logout")}
            </button>
          </article>
        </section>

        <section className="veda-dash-cases">
          <div className="veda-dash-cases-head">
            <h2>{t("dashRecentCases")}</h2>
            <Link href="/history" className="veda-dash-link">
              {t("history")} →
            </Link>
          </div>

          {error ? <p className="veda-error">{error}</p> : null}

          {loading ? (
            <p style={{ color: "var(--veda-ink-soft)" }}>{t("pleaseWait")}</p>
          ) : items.length === 0 ? (
            <div className="veda-dash-empty">
              <p>{t("historyEmpty")}</p>
              <PrimaryButton size="sm" onClick={() => router.push("/")}>
                {t("openPreset")}
              </PrimaryButton>
            </div>
          ) : (
            <ul className="veda-dash-list">
              {items.map((c) => (
                <li key={c.conversation_id}>
                  <button type="button" className="veda-dash-case" onClick={() => openCase(c.conversation_id)}>
                    <span>
                      <strong>{c.title || t("newCase")}</strong>
                      <small>
                        {(c.locale || "en").toUpperCase()}
                        {c.updated_at ? ` · ${c.updated_at}` : ""}
                      </small>
                    </span>
                    <span className="veda-dash-open">{t("openCase")}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
