import type { Metadata } from "next";
import { Inter, Marcellus } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";

const body = Inter({
  variable: "--font-body-face",
  subsets: ["latin"],
  display: "swap",
});

const display = Marcellus({
  variable: "--font-display-face",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Rift Index — League of Legends champion & mastery tracker",
    template: "%s · Rift Index",
  },
  description:
    "Browse every League of Legends champion with live patch data, and track any player's rank, champion mastery, and recent matches.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${body.variable} ${display.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <footer className="mt-20 border-t border-void-300/60 px-6 py-8">
          <div className="mx-auto max-w-6xl space-y-2 text-xs leading-relaxed text-void-200">
            <p>
              Champion data from Riot&apos;s Data Dragon CDN. Player data from
              the Riot Games API.
            </p>
            <p>
              Rift Index isn&apos;t endorsed by Riot Games and doesn&apos;t
              reflect the views or opinions of Riot Games or anyone officially
              involved in producing or managing Riot Games properties. Riot
              Games and all associated properties are trademarks or registered
              trademarks of Riot Games, Inc.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
