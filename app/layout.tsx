import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Video Appender - Append Videos Fast",
  description: "Append videos to multiple files quickly and efficiently",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

