import type { Metadata } from "next";
import { Manrope, Newsreader, Outfit } from "next/font/google";

import { EzraLauncher } from "@/components/ezra/EzraLauncher";
import { church } from "@/content/church";

import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-outfit",
});

const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-manrope",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  display: "swap",
  style: ["normal", "italic"],
  preload: false,
  variable: "--font-newsreader",
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
    <html
      lang="en"
      className={`${outfit.variable} ${manrope.variable} ${newsreader.variable}`}
    >
      <body>
        <script
          type="application/x-design-contract"
          data-design-contract="edsa-post-hero-2026"
          dangerouslySetInnerHTML={{
            __html: `THESIS: A church homepage should move people from attention to participation, refusing the pasted-about-page scroll.\nOWN-WORLD: Midnight, indigo, paper and vivid human photography; Manrope utility precision with Newsreader spiritual cadence.\nSTORY: Meet EDSA, experience worship and prayer, hear the Word, see every generation, then plan a visit.\nFIRST VIEWPORT: The approved restoration sequence remains, now with an immediate primary visit action and secondary discovery action.\nFORM: Distinct editorial scenes with one compact utility rail and restrained depth. Seed: user-pinned-edsa-rebuild.\nFINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md`,
          }}
        />
        {children}
        <EzraLauncher />
      </body>
    </html>
  );
}
