import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { ConditionalLayout } from "@/components/conditional-layout";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/toaster";
import { BudgetProvider } from "@/context/budget-context";
import { AuthProvider } from "@/lib/auth-context";
import { ActivePeriodErrorBoundary } from "@/components/active-period-error-boundary";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Budget Tracker",
  description: "Track your expenses and budget",
  generator: "v0.dev",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AuthProvider>
            <ActivePeriodErrorBoundary showGlobalErrors={true}>
              <BudgetProvider>
                <SidebarProvider>
                  <ConditionalLayout>{children}</ConditionalLayout>
                  <Toaster />
                </SidebarProvider>
              </BudgetProvider>
            </ActivePeriodErrorBoundary>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
