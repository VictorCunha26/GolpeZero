import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GolpeZero — Entenda os sinais de risco",
  description: "Analise mensagens, links e imagens suspeitas e saiba o que fazer agora.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch.png" },
  appleWebApp: { capable: true, title: "GolpeZero", statusBarStyle: "black-translucent" }
};
export const viewport: Viewport = { themeColor: "#010A2C" };

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
