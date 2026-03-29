import type { Metadata } from "next";
import { DM_Sans, Fraunces, Geist_Mono } from "next/font/google";

import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default:
      "Burnout Radar — Private burnout snapshot, plan, chat, and check-ins",
    template: "%s · Burnout Radar",
  },
  description:
    "Anonymous, on-device check-in turns into a private burnout readout: strain rings, dimensions, and plain language—not a diagnosis. Then use one workspace for a tailored plan with tasks, support chat grounded in your snapshot, a full Burnout view with history, and check-ins again when life shifts. Optional sleep context. Students and early-career friendly.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${fraunces.variable} ${geistMono.variable} h-full`}
    >
      <body className="flex min-h-full flex-col font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
