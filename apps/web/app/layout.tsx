import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ClearViewCash — see what you actually have",
  description: "Personal finance for couples and households. Spaces let you share by account or transaction. Effective Available shows your real cash, every time.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
