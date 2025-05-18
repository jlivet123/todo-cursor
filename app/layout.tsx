'use client'

import type React from "react"
import "@/app/globals.css"
import { Inter } from "next/font/google"
import { cn } from "@/lib/utils"
import { AuthProvider } from "@/lib/auth-context"
import { ThemeProvider } from "@/components/theme-provider"
import ErrorBoundary from "@/components/error-boundary"

const inter = Inter({ subsets: ["latin"] })

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <AuthProvider>{children}</AuthProvider>
    </ThemeProvider>
  )
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      </head>
      <body className={cn(inter.className, "antialiased")} suppressHydrationWarning>
        <ErrorBoundary>
          <Providers>{children}</Providers>
        </ErrorBoundary>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Fix for chunk loading in development
              if (process.env.NODE_ENV === 'development') {
                const originalWebpackJsonp = window.webpackJsonp;
                window.webpackJsonp = function() {
                  try {
                    return originalWebpackJsonp.apply(this, arguments);
                  } catch (e) {
                    console.warn('Webpack chunk loading error:', e);
                    return [];
                  }
                };
              }
            `,
          }}
        />
      </body>
    </html>
  )
}

export const metadata = {
  generator: 'v0.dev',
  title: 'Todo Cursor - Task Management App',
  description: 'A personal task management application',
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    }
  }
};
