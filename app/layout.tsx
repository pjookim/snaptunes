import type { Metadata } from "next";
import "./globals.css";

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
    <>
      {children}
    </>
  );
}
