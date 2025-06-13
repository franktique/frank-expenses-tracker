"use client"

import { BarChart3, CalendarRange, Calculator, CreditCard, Database, DollarSign, Home, Layers as LayersIcon, PieChart, TrendingUp } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function AppSidebar() {
  const pathname = usePathname()

  const isActive = (path: string) => {
    return pathname === path
  }

  return (
    <Sidebar>
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-2 px-4 py-2">
          <DollarSign className="h-6 w-6" />
          <span className="text-lg font-semibold">Budget Tracker</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive("/")}>
              <Link href="/">
                <Home className="h-4 w-4" />
                <span>Dashboard</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive("/categorias")}>
              <Link href="/categorias">
                <PieChart className="h-4 w-4" />
                <span>Categorias</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive("/periodos")}>
              <Link href="/periodos">
                <CalendarRange className="h-4 w-4" />
                <span>Periodos</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive("/presupuestos")}>
              <Link href="/presupuestos">
                <Calculator className="h-4 w-4" />
                <span>Presupuestos</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive("/ingresos")}>
              <Link href="/ingresos">
                <TrendingUp className="h-4 w-4" />
                <span>Ingresos</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive("/gastos")}>
              <Link href="/gastos">
                <CreditCard className="h-4 w-4" />
                <span>Gastos</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive("/agrupadores")}>
              <Link href="/agrupadores">
                <LayersIcon className="h-4 w-4" />
                <span>Agrupadores</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive("/dashboard/groupers")}>
              <Link href="/dashboard/groupers">
                <BarChart3 className="h-4 w-4" />
                <span>Dashboard Agrupadores</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive("/setup")}>
              <Link href="/setup">
                <Database className="h-4 w-4" />
                <span>Configuración</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="border-t p-4">
        <div className="text-xs text-muted-foreground">Budget Tracker v1.0</div>
      </SidebarFooter>
    </Sidebar>
  )
}
