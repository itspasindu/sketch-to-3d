// @ts-ignore - Next.js handles global CSS side-effect imports
import "./globals.css";
import React from "react";
// @ts-ignore - Next.js handles package CSS side-effect imports
import 'bootstrap/dist/css/bootstrap.min.css';

export const metadata = {
  title: "ResPlan 2D -> 3D Layout",
  description: "Floorplan layout viewer"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}