import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "REWIND — Travel Through Time",
  description:
    "Upload any photo. AI reimagines it across 200 years of history.",
  openGraph: {
    title: "REWIND — Travel Through Time",
    description:
      "Upload any photo. AI reimagines it across 200 years of history with generated artwork, music, narration, and more.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "REWIND — Travel Through Time",
    description:
      "Upload any photo. AI reimagines it across 200 years of history.",
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
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-[#050508] text-white overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}
