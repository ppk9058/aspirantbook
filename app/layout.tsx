import type { Metadata, Viewport } from "next";
import "@/lib/boot-guard";
import "./globals.css";
import { Providers } from "./providers"
import { auth } from "@/auth"
import NativeAppListener from "@/components/native/NativeAppListener"

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://aspirantbook.com"

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "aspirantbook - Interactive Learning Platform & Test Series",
    template: "%s | aspirantbook",
  },
  description: "Master competitive exams, video courses, test series, and comprehensive digital eBooks with aspirantbook.",
  keywords: ["aspirantbook", "competitive exams", "test series", "eBooks", "interactive courses", "BPSC", "UPSC"],
  manifest: '/manifest.json',
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "/",
    siteName: "aspirantbook",
    title: "aspirantbook - Interactive Learning Platform & Test Series",
    description: "Master competitive exams, video courses, test series, and comprehensive digital eBooks with aspirantbook.",
    images: [
      {
        url: "/aspirant-logo.jpg",
        width: 1200,
        height: 630,
        alt: "aspirantbook",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "aspirantbook - Interactive Learning Platform & Test Series",
    description: "Master competitive exams, video courses, test series, and comprehensive digital eBooks with aspirantbook.",
    images: ["/aspirant-logo.jpg"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'aspirantbook',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#05192D' },
  ],
}

const themeInitScript = `(function(){try{var t=localStorage.getItem("ts_theme");if(t==="dark"){document.documentElement.classList.add("dark")}else{document.documentElement.classList.remove("dark")}}catch(e){}})();`

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  return (
    <html lang="en" suppressHydrationWarning={true}>
      <head>
        <link rel="dns-prefetch" href="https://cdn.jsdelivr.net" />
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="font-sans antialiased" suppressHydrationWarning={true}>
        <Providers session={session}>
          <NativeAppListener />
          {children}
        </Providers>
      </body>
    </html>
  )
}
