"use client"

import { usePathname } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { AppSidebar } from "@/components/app-sidebar"

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  const pathname = usePathname()
  
  // Don't show sidebar on login page or when not authenticated
  const isLoginPage = pathname === "/login"
  const showSidebar = isAuthenticated && !isLoginPage

  return (
    <div className="flex min-h-screen">
      {/* Only render sidebar if authenticated and not on login page */}
      {showSidebar && <AppSidebar />}
      
      {/* Adjust main content padding based on sidebar presence */}
      <main className={`flex-1 ${showSidebar ? "p-6" : "p-0"}`}>
        {children}
      </main>
    </div>
  )
}
