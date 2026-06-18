import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DepScope — Dependency Risk Analyzer",
  description: "Credit scores for your npm packages.",
  icons: { icon: '/favicon.svg' },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full" style={{ background: '#08091A', colorScheme: 'dark' }}>
      <head>
        <meta name="color-scheme" content="dark" />
        <meta name="theme-color" content="#08091A" />
      </head>
      <body
        className="min-h-full flex flex-col"
        style={{ background: '#08091A', color: 'rgba(255,255,255,0.93)', minHeight: '100vh' }}
      >
        <div className="bg-scene" />
        <div className="relative z-10 flex-1 flex flex-col">{children}</div>
      </body>
    </html>
  );
}
