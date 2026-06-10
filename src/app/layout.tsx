import type { Metadata } from "next";
import "@/lib/server-data";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";
import { getLang } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "PI Network Business Technology Portal",
  description:
    "One portal to manage internet, voice, POS, payments, CCTV, alarms, endpoint and IT support across all of your sites.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const lang = await getLang();
  return (
    <html lang={lang}>
      <body className="font-sans">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
