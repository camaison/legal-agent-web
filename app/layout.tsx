import type React from "react"
import { Inter, Nunito, DM_Sans } from "next/font/google"
import { Toaster } from "@/components/ui/toaster"
import { Header } from "@/components/header"
import { ThemeProvider } from "@/components/theme-provider"
import "@/app/globals.css"

// Import Darker Grotesque font
const darkerGrotesque = DM_Sans({
  subsets: ["latin"],
  variable: "--font-darker-grotesque",
  weight: ["400", "500", "600", "700", "800"],
})

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
  weight: ["400", "500", "600", "700"],
})

export const metadata = {
  title: "Legal Foundry | Document Analysis",
  description: "AI-powered legal document analysis tool",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${nunito.variable} ${darkerGrotesque.variable} font-sans`}>
        <ThemeProvider
          attribute="class" 
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="flex min-h-screen flex-col bg-background text-foreground">
            <Header />
            <main className="flex-1 bg-slate-50 dark:bg-slate-900">{children}</main>
          </div>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}

