import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: "오더리 | 테이블 주문 관리",
  description: "QR 주문부터 테이블 현황과 매출까지 한눈에 관리하세요.",
  openGraph: { title: "오더리", description: "QR 주문부터 매출까지 한눈에", images: [{ url: "/og.png", width: 1200, height: 630 }] },
  twitter: { card: "summary_large_image", title: "오더리", description: "QR 주문부터 매출까지 한눈에", images: ["/og.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}

