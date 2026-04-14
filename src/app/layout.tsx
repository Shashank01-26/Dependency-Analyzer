import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DepScope — Dependency Risk Analyzer",
  description: "Credit scores for your npm packages.",
  icons: { icon: '/favicon.svg' },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col">
        <div className="bg-scene" />
        <div className="relative z-10 flex-1 flex flex-col">{children}</div>
      </body>
    </html>
  );
}
