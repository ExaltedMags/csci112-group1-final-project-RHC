import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PH Ride Compare",
  description: "Compare simulated ride-hailing fares in the Philippines",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-slate-50 flex flex-col`}
      >
        <header className="border-b bg-white sticky top-0 z-10">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <Link href="/" className="font-bold text-xl tracking-tight text-slate-900">
              PH Ride Compare
            </Link>
            <nav className="flex gap-4">
              <Button variant="ghost" asChild>
                <Link href="/">Search</Link>
              </Button>
              <Button variant="ghost" asChild>
                <Link href="/history">History</Link>
              </Button>
            </nav>
          </div>
        </header>
        <main className="flex-1 container mx-auto px-4 py-8">
          {children}
        </main>
        <footer className="border-t py-6 bg-white text-center text-sm text-slate-500">
          <p>© {new Date().getFullYear()} PH Ride Compare Demo</p>
        </footer>
      </body>
    </html>
  );
}
