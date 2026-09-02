import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import { ToastProvider } from "@/components/toast-provider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "GameDay OS",
  description: "A venue-first operating system for sports fields.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable} data-scroll-behavior="smooth">
      <body>
        <a className="ui-skip-link" href="#main-content">Skip to main content</a>
        <div className="min-h-screen">
          <SiteHeader />
          <div id="main-content" tabIndex={-1}>{children}</div>
          <ToastProvider />
        </div>
      </body>
    </html>
  );
}
