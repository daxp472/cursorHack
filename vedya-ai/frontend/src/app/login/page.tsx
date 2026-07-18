"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useApp } from "@/lib/app-context";
import PrimaryButton from "@/components/PrimaryButton";

/** Pitch / classroom demo account — also seeded in the database. */
export const DEMO_ACCOUNT = {
  email: "demo@vedya.ai",
  password: "DemoPass123",
  label: "Demo Vaidya",
};

export default function LoginPage() {
  const router = useRouter();
  const { t, setSession } = useApp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function fillDemo() {
    setEmail(DEMO_ACCOUNT.email);
    setPassword(DEMO_ACCOUNT.password);
    setError("");
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await api.login({ email, password });
      setSession(res.access_token, res.user);
      router.push("/dashboard");
    } catch {
      setError(t("authError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="veda-auth-shell">
      <div className="veda-auth-card">
        <h1>{t("loginTitle")}</h1>
        <p className="veda-auth-sub">{t("loginSub")}</p>

        <button type="button" className="veda-demo-chip" onClick={fillDemo}>
          <span className="veda-demo-chip-badge">{t("demoBadge")}</span>
          <span className="veda-demo-chip-body">
            <strong>{DEMO_ACCOUNT.label}</strong>
            <small>{DEMO_ACCOUNT.email}</small>
          </span>
          <span className="veda-demo-chip-cta">{t("useDemo")}</span>
        </button>

        <form onSubmit={onSubmit}>
          <div className="veda-field">
            <label htmlFor="login-email">{t("email")}</label>
            <input
              id="login-email"
              className="veda-input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="veda-field">
            <label htmlFor="login-password">{t("password")}</label>
            <input
              id="login-password"
              className="veda-input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>
          {error ? <p className="veda-error">{error}</p> : null}
          <PrimaryButton type="submit" disabled={loading} style={{ width: "100%" }}>
            {loading ? t("pleaseWait") : t("login")}
          </PrimaryButton>
        </form>
        <p className="veda-auth-footer">
          {t("noAccount")} <Link href="/signup">{t("signup")}</Link>
        </p>
      </div>
    </div>
  );
}
