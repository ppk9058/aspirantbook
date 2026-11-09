import type { Metadata, Viewport } from "next";
import "@/lib/boot-guard";
import "./globals.css";
import { Providers } from "./providers"
import { getBaseUrl } from "@/lib/seo/core"

const siteUrl = getBaseUrl()

export const metadata: Metadata = {
  ...(siteUrl ? { metadataBase: new URL(siteUrl) } : {}),
  title: {
    default: "AspirantBook - Interactive Learning Platform & Test Series",
    template: "%s | AspirantBook",
  },
  description: "Master competitive exams, video courses, test series, and comprehensive digital eBooks with AspirantBook.",
  keywords: ["AspirantBook", "competitive exams", "test series", "eBooks", "interactive courses", "BPSC", "UPSC"],
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "/",
    siteName: "AspirantBook",
    title: "AspirantBook - Interactive Learning Platform & Test Series",
    description: "Master competitive exams, video courses, test series, and comprehensive digital eBooks with AspirantBook.",
    images: [
      {
        url: "/aspirant-logo.jpg",
        width: 1200,
        height: 630,
        alt: "AspirantBook",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AspirantBook - Interactive Learning Platform & Test Series",
    description: "Master competitive exams, video courses, test series, and comprehensive digital eBooks with AspirantBook.",
    images: ["/aspirant-logo.jpg"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'AspirantBook',
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

/**
 * C1: the root layout used to call `auth()` to seed SessionProvider. Because a
 * layout is part of every route's render, that single call forced every page to
 * be dynamic — `export const revalidate = 60` on the landing page could never
 * take effect and nothing could be served from the ISR cache.
 *
 * SessionProvider now fetches the session itself (GET /api/auth/session), which
 * it already did whenever the prop was missing, and the header components read
 * it through useSession.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <head>
        <link rel="dns-prefetch" href="https://cdn.jsdelivr.net" />
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="font-sans antialiased" suppressHydrationWarning={true}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
