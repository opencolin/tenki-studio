import type { Metadata } from "next";
import { Sora, Public_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const display = Sora({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-display" });
const body = Public_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-body" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "600"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Tenki Studio",
  description:
    "Build multi-agent automations on a canvas and run every crew inside a disposable Tenki.cloud sandbox.",
};

/** Applied before paint so a stored theme choice never flashes. */
const themeBoot = `(function(){try{var t=localStorage.getItem("tenki-theme");if(t==="dark"||t==="light"){document.documentElement.dataset.theme=t;}}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBoot }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
