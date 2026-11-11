import type { Metadata } from "next";
import "@fontsource-variable/vazirmatn/index.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "مدیریت توکن‌های پرسنل",
  description: "مدیریت آسان توکن‌ها، ثبت تراکنش‌ها و مشاهده تاریخچه",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body className="min-h-screen bg-canvas font-sans text-ink antialiased">{children}</body>
    </html>
  );
}
