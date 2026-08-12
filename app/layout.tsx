import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "نظام إدارة الشركة",
  description: "نظام إدارة الشفتات والمهام والمرتبات",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body className="min-h-screen bg-slate-100 font-sans text-slate-800 antialiased">
        {children}
      </body>
    </html>
  );
}
