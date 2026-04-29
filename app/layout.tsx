import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BESTIE — Find a Bestie for the moments that matter",
  description:
    "Browse identity-verified companions for coffee chats, hikes, festivals, voice calls, and travel adventures.",
  openGraph: {
    title: "BESTIE",
    description: "Your social passport. Find real connections.",
    url: "https://bestiehere.com",
    siteName: "BESTIE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    site: "@joinbestie",
    creator: "@joinbestie",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
