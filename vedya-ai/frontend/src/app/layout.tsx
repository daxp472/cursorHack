import type { Metadata } from "next";
import "./globals.css";
import DisclaimerBar from "@/components/DisclaimerBar";

export const metadata: Metadata = {
  title: "VedyaAI — Classical Formulation Discriminator",
  description:
    "AI-assisted Ayurvedic formulation decision support. Rank formulations with classical citations and safety gates.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <main style={{ flex: 1 }}>{children}</main>
        <DisclaimerBar />
      </body>
    </html>
  );
}
