import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { AppStoreProvider } from "@/lib/store";
import { RoleSwitcher } from "@/components/shared/role-switcher";
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
  title: "Anumati — Smart Approval Workflow",
  description:
    "Track campus approval letters from Advisor to HOD to Principal in real time.",
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
      <body className="min-h-full flex flex-col">
        <AppStoreProvider>
          {children}
          <RoleSwitcher />
          <Toaster richColors position="top-right" closeButton />
        </AppStoreProvider>
      </body>
    </html>
  );
}
