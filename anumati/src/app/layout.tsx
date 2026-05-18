import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { AppStoreProvider } from "@/lib/store";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Anumati — Smart Approval Workflow",
  description: "Track campus approval letters from Advisor to HOD to Principal in real time.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="min-h-full flex flex-col font-sans">
        <AppStoreProvider>
          {children}
          <Toaster richColors position="bottom-right" closeButton />
        </AppStoreProvider>
      </body>
    </html>
  );
}
