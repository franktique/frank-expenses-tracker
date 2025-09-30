"use client";

import {
  BarChart3,
  BookOpen,
  CalendarRange,
  Calculator,
  CreditCard,
  Database,
  DollarSign,
  Home,
  Layers as LayersIcon,
  PieChart,
  TrendingUp,
  Wallet,
  Zap,
  Receipt,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { LogoutButton } from "@/components/logout-button";
import { useAuth } from "@/lib/auth-context";
import { ThemeToggle } from "@/components/theme-toggle";

export function AppSidebar() {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();

  const isActive = (path: string) => {
    if (path === "/estudios") {
      return pathname === "/estudios" || pathname.startsWith("/estudios/");
    }
    if (path === "/simular") {
      return pathname === "/simular" || pathname.startsWith("/simular/");
    }
    return pathname === path;
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-2">
            <DollarSign className="h-6 w-6" />
            <span className="text-lg font-semibold">Budget Tracker</span>
          </div>
          <ThemeToggle />
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
                <Receipt className="h-4 w-4" />
                <span>Gastos</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive("/tarjetas-credito")}>
              <Link href="/tarjetas-credito">
                <CreditCard className="h-4 w-4" />
                <span>Tarjetas de Crédito</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive("/fondos")}>
              <Link href="/fondos">
                <Wallet className="h-4 w-4" />
                <span>Fondos</span>
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
            <SidebarMenuButton asChild isActive={isActive("/estudios")}>
              <Link href="/estudios">
                <BookOpen className="h-4 w-4" />
                <span>Estudios</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive("/simular")}>
              <Link href="/simular">
                <Zap className="h-4 w-4" />
                <span>Simular</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isActive("/dashboard/groupers")}
            >
              <Link href="/dashboard/groupers">
                <BarChart3 className="h-4 w-4" />
                <span>Dashboard Agrupadores</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive("/dashboard/fondos")}>
              <Link href="/dashboard/fondos">
                <BarChart3 className="h-4 w-4" />
                <span>Dashboard Fondos</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isActive("/dashboard/remainder")}
            >
              <Link href="/dashboard/remainder">
                <TrendingUp className="h-4 w-4" />
                <span>Dashboard Remanentes</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isActive("/dashboard/category-bars")}
            >
              <Link href="/dashboard/category-bars">
                <BarChart3 className="h-4 w-4" />
                <span>Gastos por Fecha</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isActive("/dashboard/period-bars")}
            >
              <Link href="/dashboard/period-bars">
                <BarChart3 className="h-4 w-4" />
                <span>Gastos por Periodo</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isActive("/dashboard/overspend")}
            >
              <Link href="/dashboard/overspend">
                <BarChart3 className="h-4 w-4" />
                <span>Overspend Actual</span>
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
        <div className="flex flex-col gap-2">
          {isAuthenticated && <LogoutButton />}
          <div className="text-xs text-muted-foreground">
            Budget Tracker v1.0
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
