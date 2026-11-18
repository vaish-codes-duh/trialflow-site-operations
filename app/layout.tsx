import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trialflow · Site Operations",
  description: "Private synthetic-data site operations pilot.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
