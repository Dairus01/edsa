import type { Metadata } from "next";
import { Outfit } from "next/font/google";

import { church } from "@/content/church";

import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: church.metadata.title,
  description: church.metadata.description,
  icons: {
    icon: "/brand/edsa-logo.optimized.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={outfit.variable}>{children}</body>
    </html>
  );
}
