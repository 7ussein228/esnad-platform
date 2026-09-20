import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Cairo, Amiri } from "next/font/google";
import "./globals.css";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
  display: "swap",
});

const amiri = Amiri({
  subsets: ["arabic", "latin"],
  weight: ["400", "700"],
  variable: "--font-amiri",
  display: "swap",
});

const siteName = "منصة إسناد";
const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${siteName} | دراسات اجتماعية، تاريخ وجغرافيا`,
    template: `%s | ${siteName}`,
  },
  description:
    "منصة إسناد التعليمية المتخصصة في الدراسات الاجتماعية والتاريخ والجغرافيا، من الصف الأول الإعدادي حتى الثانية بكالوريا. دروس فيديو، اختبارات، امتحانات، وواجبات مع متابعة تقدم دقيقة.",
  keywords: [
    "دراسات اجتماعية",
    "تاريخ",
    "جغرافيا",
    "منصة تعليمية",
    "إعدادي",
    "ثانوي",
    "بكالوريا",
  ],
  openGraph: {
    title: `${siteName} | دراسات اجتماعية، تاريخ وجغرافيا`,
    description: "منصة تعليمية عربية متخصصة في الدراسات الاجتماعية والتاريخ والجغرافيا.",
    locale: "ar_EG",
    type: "website",
    siteName,
  },
  alternates: {
    canonical: "/",
  },
  // Set NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION in Vercel env after adding
  // the property in Google Search Console (HTML-tag method).
  verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
    : undefined,
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={`${cairo.variable} ${amiri.variable}`}>
      <body className="min-h-screen bg-papyrus-50 font-sans text-ink-900 antialiased">{children}</body>
    </html>
  );
}
