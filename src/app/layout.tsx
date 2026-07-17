import type { Metadata, Viewport } from "next";
import "./globals.css";
import { assetPath } from "@/lib/assets/path";

export const metadata: Metadata = {
  metadataBase: new URL("https://ehsanwwe.github.io/"),
  title: { default: "Diamond Shader Lab", template: "%s · Diamond Shader Lab" },
  description:
    "Two approaches to real-time gemstone rendering with Three.js and custom GLSL.",
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
    title: "Diamond Shader Lab",
    description: "Two approaches to real-time gemstone rendering",
    url: "/diamond-shader/",
    siteName: "Diamond Shader Lab",
    images: [
      {
        url: assetPath("brand/social-preview.svg"),
        width: 1200,
        height: 630,
        alt: "A stylized faceted diamond",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Diamond Shader Lab",
    description: "Two approaches to real-time gemstone rendering",
    images: [assetPath("brand/social-preview.svg")],
  },
};
export const viewport: Viewport = {
  themeColor: "#08090d",
  colorScheme: "dark",
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
