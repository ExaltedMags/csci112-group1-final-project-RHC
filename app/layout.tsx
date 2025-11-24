import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { UserProvider } from "@/lib/auth-client";
import { AppHeader } from "@/components/app-header";

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
        <UserProvider>
          <AppHeader />
          <main className="flex-1 container mx-auto px-4 py-8">
            {children}
          </main>
        </UserProvider>
        <footer className="border-t py-6 bg-white text-center text-sm text-slate-500">
          <p>© {new Date().getFullYear()} PH Ride Compare Demo</p>
        </footer>
      </body>
    </html>
  );
}
