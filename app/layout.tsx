import type { Metadata } from "next";
import { Lexend, Nunito_Sans } from "next/font/google";
import "./globals.css";
import { UserProvider } from "@/lib/auth-client";
import { AppHeader } from "@/components/app-header";

const lexend = Lexend({
  variable: "--font-lexend",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

const nunitoSans = Nunito_Sans({
  variable: "--font-nunito-sans",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "PH Ride Compare",
  description: "Compare ride-hailing fares across Grab, Angkas, and JoyRide in Metro Manila",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${lexend.variable} ${nunitoSans.variable} antialiased min-h-screen bg-warm-white flex flex-col`}
      >
        <UserProvider>
          <AppHeader />
          <main className="flex-1 container mx-auto px-3 sm:px-4 py-4 sm:py-8 pb-20 md:pb-8">
            {children}
          </main>
        </UserProvider>
        <footer className="border-t border-border py-6 sm:py-8 bg-cream text-center hidden md:block">
          <div className="container mx-auto px-4">
            <p className="text-sm text-warm-gray/60 font-medium">
              © {new Date().getFullYear()} PH Ride Compare • Compare fares. Save time. Ride smart.
            </p>
            <p className="text-xs text-warm-gray/40 mt-1">
              Made with 🧡 for Filipino commuters
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
