import type { Metadata } from "next";
import "@/lib/server-data";
import "./globals.css";

export const metadata: Metadata = {
  title: "PI Network Business Technology Portal",
  description:
    "One portal to manage internet, voice, POS, payments, CCTV, alarms, endpoint and IT support across all of your sites.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans">{children}</body>
    </html>
  );
}
