import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://most-rpa-web.vercel.app"),
  title: "Most RPA Web",
  description:
    "Plataforma para consultas via webhook do MAKE com autenticação, resultados consolidados e detalhes por benefício.",
  applicationName: "Most RPA Web",
  openGraph: {
    title: "Most RPA Web",
    description:
      "Consultas via MAKE com visualização de resultados e detalhes por benefício.",
    type: "website",
    locale: "pt_BR",
    url: "https://most-rpa-web.vercel.app/login",
    siteName: "Most RPA Web",
  },
  twitter: {
    card: "summary",
    title: "Most RPA Web",
    description:
      "Consultas via MAKE com visualização de resultados e detalhes por benefício.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
