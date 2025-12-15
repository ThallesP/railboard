import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Railboard – Railway deploy leaderboard",
  description:
    "Track how many times you've deployed your Railway projects and compete on the public Railboard leaderboard.",
  openGraph: {
    title: "Railboard – Railway deploy leaderboard",
    description:
      "Track how many times you've deployed your Railway projects and compete on the public Railboard leaderboard.",
    siteName: "Railboard",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "Railboard – Railway deploy leaderboard",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Railboard – Railway deploy leaderboard",
    description:
      "Track how many times you've deployed your Railway projects and compete on the public Railboard leaderboard.",
    images: ["/logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          <div className="container mx-auto">{children}</div>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
