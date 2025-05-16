import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarProvider } from "@/components/ui/sidebar"
import { Toaster } from "@/components/ui/toaster"
import { BudgetProvider } from "@/context/budget-context"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Budget Tracker",
  description: "Track your expenses and budget",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <BudgetProvider>
            <SidebarProvider>
              <div className="flex min-h-screen">
                <AppSidebar />
                <main className="flex-1 p-6">{children}</main>
              </div>
              <Toaster />
            </SidebarProvider>
          </BudgetProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
