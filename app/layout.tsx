import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from '../components/ui/sonner';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: 'swap',
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: 'swap',
});

export const metadata: Metadata = {
  title: "SnapTunes - From Snap to Sound",
  description: "Create Spotify playlists instantly from images or text with SnapTunes. Powered by AI and OCR, we turn your moments into music.",
  keywords: ['SnapTunes', 'AI playlist generator', 'OCR music app', 'image to music', 'text to playlist'],
  openGraph: {
    title: 'SnapTunes - From Snap to Sound',
    description: 'Create playlists instantly from images or text using SnapTunes.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#eeeee7]`}
      >
        <Toaster />
        {children}
      </body>
    </html>
  );
}
