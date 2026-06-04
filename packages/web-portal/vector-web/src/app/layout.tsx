import type { Metadata } from "next";
import Script from "next/script";
import localFont from "next/font/local";
import "./globals.css";
import { ThemeProvider } from "@/contexts/ThemeContext";

const openSans = localFont({
  src: [
    {
      path: "../../public/fonts/open-sans/OpenSans-Variable.ttf",
      style: "normal",
    },
    {
      path: "../../public/fonts/open-sans/OpenSans-Variable-Italic.ttf",
      style: "italic",
    },
  ],
  variable: "--font-open-sans",
  display: "swap",
  weight: "300 800",
});

export const metadata: Metadata = {
  title: "Vector System",
  description: "Premium Credential Management",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Vector",
  },
  icons: {
    apple: [
      { url: "/icons/icon-192x192.png", sizes: "192x192" },
      { url: "/icons/icon-512x512.png", sizes: "512x512" },
    ],
  },
};

export const viewport = {
  themeColor: "#06B4C9",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={openSans.variable}>
      <head>
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js"
          async
          defer
        />
      </head>
      <body suppressHydrationWarning>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
