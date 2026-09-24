import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Yene Menu — Addis Ababa menus, made easy",
  description:
    "Find restaurants in Addis Ababa and explore their menus and prices before you go.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
