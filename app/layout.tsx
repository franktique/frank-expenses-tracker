import type React from 'react';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { ConditionalLayout } from '@/components/conditional-layout';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Toaster } from '@/components/ui/toaster';
import { BudgetProvider } from '@/context/budget-context';
import { AuthProvider } from '@/lib/auth-context';
import { ActivePeriodErrorBoundary } from '@/components/active-period-error-boundary';
import { TabProvider } from '@/components/tabs';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Budget Tracker',
  description: 'Track your expenses and budget',
  generator: 'v0.dev',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <AuthProvider>
            <ActivePeriodErrorBoundary showGlobalErrors={true}>
              <BudgetProvider>
                <TabProvider>
                  <SidebarProvider>
                    <Suspense fallback={<div className="flex min-h-screen" />}>
                      <ConditionalLayout>{children}</ConditionalLayout>
                    </Suspense>
                    <Toaster />
                  </SidebarProvider>
                </TabProvider>
              </BudgetProvider>
            </ActivePeriodErrorBoundary>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
