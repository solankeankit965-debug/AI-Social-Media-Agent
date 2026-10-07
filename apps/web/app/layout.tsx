import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aether — AI Social Media Agent",
  description: "Turn ideas into reviewed, approved, and scheduled social content.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
