import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { Toaster } from "sonner";
import { AuthProvider } from "@/context/AuthContext";
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"
import OfflineBanner from "@/components/OfflineBanner";
import RecoveryRedirect from "@/components/RecoveryRedirect";
import RegisterServiceWorker from "@/components/RegisterServiceWorker";
export const viewport = { themeColor: "#2954bc" };

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen flex flex-col antialiased`}
      >
        <AuthProvider>
          {children}
        </AuthProvider>
        <Toaster />
        <OfflineBanner />
        <RecoveryRedirect />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}