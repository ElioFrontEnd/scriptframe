import type { Metadata } from "next";
import "./globals.css";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://cutframe.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: "Cutframe — paste your script, get every image for the video",
    template: "%s · Cutframe",
  },
  description:
    "Cutframe breaks a narration script into beats, writes a prompt for each one, and generates a full set of images that hold one look across the whole video — numbered in script order.",
  openGraph: {
    title: "Cutframe — paste your script, get every image for the video",
    description:
      "A full set of style-consistent images for your faceless video, numbered in script order and ready for the timeline.",
    url: SITE,
    siteName: "Cutframe",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Cutframe" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Cutframe — paste your script, get every image for the video",
    description:
      "A full set of style-consistent images for your faceless video, numbered in script order.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <head>
        {/*
          Webfonts are requested here rather than through next/font because the
          build environment cannot reach Google's servers. Every stack in
          globals.css ends in faces that ship with real operating systems, so
          the design holds if these never load.
        */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {/* eslint-disable-next-line @next/next/no-page-custom-font --
            next/font would be better (self-hosted, no extra request, no layout
            shift) but it fetches from Google at build time, which this build
            environment cannot reach — so the build would fail rather than the
            font merely being slower. Switching to next/font is a safe one-file
            change to make from a machine with normal network access. */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Newsreader:ital,opsz,wght@0,6..72,300;0,6..72,400;0,6..72,500;1,6..72,400&display=swap"
        />
      </head>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
