import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import { NavigationMotion } from "@/components/navigation-motion";
import { PwaRegister } from "@/components/pwa-register";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.BETTER_AUTH_URL ?? "http://localhost:3001"),
  title: { default: "Be Rich — Clareza para o seu dinheiro", template: "%s — Be Rich" },
  description:
    "Gestão financeira pessoal e familiar com patrimônio, planejamento e relatórios conciliáveis.",
  applicationName: "Be Rich",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f8f5" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0e0c" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <body>
        <ThemeProvider>{children}</ThemeProvider>
        <Suspense fallback={null}>
          <NavigationMotion />
        </Suspense>
        <PwaRegister />
      </body>
    </html>
  );
}
