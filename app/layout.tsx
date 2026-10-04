import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers"

export const metadata: Metadata = {
  title: "aspirantbook - Learn Data Science, AI & Programming",
  description: "Master data science, AI, and programming with interactive courses, coding exercises, and real-world projects.",
  keywords: ["data science", "programming", "AI", "machine learning", "online learning", "coding"],
  manifest: '/manifest.json',
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
