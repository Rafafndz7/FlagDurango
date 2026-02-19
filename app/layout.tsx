import type React from "react"
import type { Metadata, Viewport } from "next"
import "./globals.css"
import { Navigation } from "@/components/navigation"
import { NavGuard } from "@/components/nav-guard"


export const metadata: Metadata = {
  title: "Liga Flag Durango - 20 Años Haciendo Historia",
  description: "Liga oficial de flag football en Durango. 20 años promoviendo el deporte y la competencia sana.",
  keywords: ["flag football", "durango", "liga", "deporte", "competencia"],
  authors: [{ name: "Liga Flag Durango" }],
  creator: "Liga Flag Durango",
  publisher: "Liga Flag Durango",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://ligaflagdurango.com.mx"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Liga Flag Durango - 20 Años Haciendo Historia",
    description: "Liga oficial de flag football en Durango. 20 años promoviendo el deporte y la competencia sana.",
    url: "https://ligaflagdurango.com.mx",
    siteName: "Liga Flag Durango",
    images: [
      {
        url: "/icons/android-chrome-512x512.png",
        width: 512,
        height: 512,
        alt: "Liga Flag Durango Logo",
      },
    ],
    locale: "es_MX",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Liga Flag Durango - 20 Años Haciendo Historia",
    description: "Liga oficial de flag football en Durango. 20 años promoviendo el deporte y la competencia sana.",
    images: ["/icons/icon-512x512.png"],
  },
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon.ico" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Liga Flag Durango",
  },
  applicationName: "Liga Flag Durango",
  category: "sports",
  generator: "v0.dev",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#3b82f6" },
    { media: "(prefers-color-scheme: dark)", color: "#1e40af" },
  ],
  colorScheme: "light",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Liga Flag Durango" />
        <meta name="application-name" content="Liga Flag Durango" />
        <meta name="msapplication-TileColor" content="#3b82f6" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
      </head>
      <body className="min-h-screen bg-white antialiased">
        

        {/* Navbar global blanca. NavGuard la oculta en dashboards */}
        <NavGuard>
          <Navigation />
        </NavGuard>
        <main>{children}</main>

        {/* Service Worker Registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(registration) {
                      console.log('SW registered: ', registration);
                    })
                    .catch(function(registrationError) {
                      console.log('SW registration failed: ', registrationError);
                    });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  )
}
