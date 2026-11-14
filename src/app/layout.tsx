import type { Metadata } from "next";
import { siteUrl } from "@/lib/site";
import { Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";
import { Suspense } from "react";
import { Analytics } from "@/components/analytics";
import { SourceTracker } from "@/components/source-tracker";
import { ChatButtons } from "@/components/chat-buttons";

const beVietnam = Be_Vietnam_Pro({
  variable: "--font-sans-vn",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Học viện Lê Bá Tùng — Khóa học quảng cáo Facebook & marketing thực chiến",
  description: "Khóa học online quảng cáo Facebook, marketing và AI thực chiến cùng Lê Bá Tùng — 10 năm chạy quảng cáo thật. Học mọi lúc, kích hoạt tự động.",
  applicationName: "Học viện Lê Bá Tùng",
  authors: [{ name: "Lê Bá Tùng", url: `${siteUrl}/p/le-ba-tung-la-ai` }],
  creator: "Lê Bá Tùng",
  publisher: "Học viện Lê Bá Tùng",
  formatDetection: { telephone: false },
  openGraph: {
    type: "website",
    locale: "vi_VN",
    siteName: "Học viện Lê Bá Tùng",
    images: [{ url: "/logo.png", width: 512, height: 512, alt: "Học viện Lê Bá Tùng" }],
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
};

// Chống nhấp nháy theme: đặt class .dark trước khi React hydrate
const themeScript = `(function(){try{var t=localStorage.getItem('theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark');}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" className={`${beVietnam.variable} h-full`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full">
        {children}
        <Suspense fallback={null}>
          <Analytics />
          <SourceTracker />
          <ChatButtons />
        </Suspense>
      </body>
    </html>
  );
}
