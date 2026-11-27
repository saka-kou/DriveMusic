import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DriveMusic",
  description: "音楽と一緒に楽しむドライブアプリ",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
