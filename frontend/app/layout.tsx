// @ts-ignore - Next.js handles global CSS side-effect imports
import "./globals.css";
import React from "react";

export const metadata = {
  title: "ResPlan Studio | 3D Floor Planner",
  description: "Advanced architectural layout viewer",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">{children}</body>
    </html>
  );
}