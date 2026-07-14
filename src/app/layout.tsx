import type { Metadata } from "next";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import "./globals.css";

import { DemoBanner } from "@/components/shared/demo-banner";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Soft, optical display serif for headings — warm and editorial, a deliberate
// contrast to the clean sans body.
const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: {
    default: "PeelPrep — Know the room. Own the interview.",
    template: "%s · PeelPrep",
  },
  description:
    "PeelPrep turns scattered interview research into a personalized briefing, practice plan, and confidence boost.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <DemoBanner />
        {children}
      </body>
    </html>
  );
}
