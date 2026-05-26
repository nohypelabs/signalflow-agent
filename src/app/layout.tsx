import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import ServiceWorkerCleanup from "@/components/ServiceWorkerCleanup";
import CacheBuster from "@/components/CacheBuster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#00E5A8",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "SignalFlow Agent — NoHype Labs",
  description: "AI-powered signal-to-execution agent built on SoSoValue API and SoDEX",
  appleWebApp: {
    capable: false,
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#05070D] text-[#F8FAFC]">
        <Providers>{children}</Providers>
        <ServiceWorkerCleanup />
        <CacheBuster />
      </body>
    </html>
  );
}
