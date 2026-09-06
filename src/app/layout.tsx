import type { Metadata, Viewport } from "next";
import "./globals.css";
import { assetPath } from "@/lib/assets/path";

export const metadata: Metadata = {
  metadataBase: new URL("https://ehsanwwe.github.io/"),
  title: { default: "Diamond Ring", template: "%s · Diamond Ring" },
  description:
    "A silver halo diamond ring rendered in real time with Three.js and a custom GLSL diamond tracer.",
  keywords: [
    "Three.js",
    "WebGL",
    "GLSL",
    "diamond shader",
    "ray marching",
    "creative coding",
  ],
  authors: [{ name: "Ehsan Moradi" }],
  creator: "Ehsan Moradi",
  alternates: { canonical: "/diamond-shader/" },
  icons: { icon: assetPath("brand/favicon.svg") },
  openGraph: {
    title: "Diamond Ring",
    description: "Real-time silver halo diamond ring",
    url: "/diamond-shader/",
    siteName: "Diamond Ring",
    images: [
      {
        url: assetPath("brand/social-preview.svg"),
        width: 1200,
        height: 630,
        alt: "A silver halo diamond ring",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Diamond Ring",
    description: "Real-time silver halo diamond ring",
    images: [assetPath("brand/social-preview.svg")],
  },
};
export const viewport: Viewport = {
  themeColor: "#f3f3f1",
  colorScheme: "light",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
