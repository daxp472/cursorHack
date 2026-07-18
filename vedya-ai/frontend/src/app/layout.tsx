import type { Metadata } from "next";
import { Fraunces, Manrope, Noto_Serif_Devanagari } from "next/font/google";
import "./globals.css";
import DisclaimerBar from "@/components/DisclaimerBar";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

const notoDevanagari = Noto_Serif_Devanagari({
  subsets: ["devanagari", "latin"],
  variable: "--font-noto-devanagari",
  display: "swap",
  weight: ["400", "600"],
});

export const metadata: Metadata = {
  title: "VedyaAI — Classical Formulation Discriminator",
  description:
    "AI-assisted Ayurvedic formulation decision support. Rank formulations with classical citations and safety gates.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${manrope.variable} ${notoDevanagari.variable}`}>
      <body
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          // Wire next/font CSS vars into design tokens
          ["--font-display" as string]: "var(--font-fraunces), Georgia, serif",
          ["--font-ui" as string]: "var(--font-manrope), system-ui, sans-serif",
          ["--font-devanagari" as string]: "var(--font-noto-devanagari), serif",
        }}
      >
        <main style={{ flex: 1 }}>{children}</main>
        <DisclaimerBar />
      </body>
    </html>
  );
}
