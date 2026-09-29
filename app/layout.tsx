import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SnapNote — Join the waitlist",
  description:
    "The note app that opens before the thought is gone. A tiny markdown scratchpad for macOS that lives in your menu bar. Join the waitlist, we'll let you in as soon as a seat opens.",
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}