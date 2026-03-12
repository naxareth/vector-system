import type { Metadata } from "next";
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
  title: "Vector",
  description: "Vector",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={openSans.variable}>
      <body>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
