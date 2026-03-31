'use client';

import {
  BarChart3,
  BookOpen,
  CalendarRange,
  Calculator,
  ClipboardList,
  CreditCard,
  Database,
  DollarSign,
  Home,
  Landmark,
  Layers as LayersIcon,
  Percent,
  PieChart,
  Tag,
  TrendingUp,
  Wallet,
  Zap,
  Receipt,
  ChevronRight,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { LogoutButton } from '@/components/logout-button';
import { useAuth } from '@/lib/auth-context';
import { ThemeToggle } from '@/components/theme-toggle';

export function AppSidebar() {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();
  const [overspendOpen, setOverspendOpen] = useState(false);
  const [creditCardMenuOpen, setCreditCardMenuOpen] = useState(false);
  const { toggleSidebar, state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  const isActive = (path: string) => {
    if (path === '/estudios') {
      return pathname === '/estudios' || pathname.startsWith('/estudios/');
    }
    if (path === '/simular') {
      return pathname === '/simular' || pathname.startsWith('/simular/');
    }
    if (path === '/simular-prestamos') {
      return (
        pathname === '/simular-prestamos' ||
        pathname.startsWith('/simular-prestamos/')
      );
    }
    if (path === '/simular-inversiones') {
      return (
        pathname === '/simular-inversiones' ||
        pathname.startsWith('/simular-inversiones/')
      );
    }
    if (path === '/simular-tasas') {
      return (
        pathname === '/simular-tasas' || pathname.startsWith('/simular-tasas/')
      );
    }
    if (path === '/dashboard/overspend') {
      return (
        pathname === '/dashboard/overspend' ||
        pathname.startsWith('/dashboard/overspend/')
      );
    }
    if (path === '/tarjetas-credito') {
      return (
        pathname === '/tarjetas-credito' ||
        pathname === '/dashboard/credit-cards'
      );
    }
    if (path === '/dashboard/eventos') {
      return (
        pathname === '/dashboard/eventos' ||
        pathname.startsWith('/dashboard/eventos/')
      );
    }
    if (path === '/cotizaciones') {
      return (
        pathname === '/cotizaciones' || pathname.startsWith('/cotizaciones/')
      );
    }
    return pathname === path;
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b">
        <div className="flex items-center justify-between px-2 py-2">
          <div className="flex items-center gap-2 overflow-hidden">
            <DollarSign className="h-6 w-6 shrink-0" />
            <span
              className={`whitespace-nowrap text-lg font-semibold transition-opacity duration-200 ${isCollapsed ? 'w-0 opacity-0' : 'opacity-100'}`}
            >
              Budget Tracker
            </span>
          </div>
          <div
            className={`flex items-center gap-1 ${isCollapsed ? 'hidden' : ''}`}
          >
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={toggleSidebar}
              title="Collapse sidebar (Ctrl+B)"
            >
              <PanelLeftClose className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {isCollapsed && (
          <div className="flex flex-col items-center gap-1 py-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={toggleSidebar}
              title="Expand sidebar (Ctrl+B)"
            >
              <PanelLeft className="h-4 w-4" />
            </Button>
            <ThemeToggle />
          </div>
        )}
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isActive('/')}
              tooltip="Dashboard"
            >
              <Link href="/">
                <Home className="h-4 w-4" />
                <span>Dashboard</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isActive('/categorias')}
              tooltip="Categorias"
            >
              <Link href="/categorias">
                <PieChart className="h-4 w-4" />
                <span>Categorias</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isActive('/periodos')}
              tooltip="Periodos"
            >
              <Link href="/periodos">
                <CalendarRange className="h-4 w-4" />
                <span>Periodos</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isActive('/presupuestos')}
              tooltip="Presupuestos"
            >
              <Link href="/presupuestos">
                <Calculator className="h-4 w-4" />
                <span>Presupuestos</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isActive('/ingresos')}
              tooltip="Ingresos"
            >
              <Link href="/ingresos">
                <TrendingUp className="h-4 w-4" />
                <span>Ingresos</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isActive('/gastos')}
              tooltip="Gastos"
            >
              <Link href="/gastos">
                <Receipt className="h-4 w-4" />
                <span>Gastos</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isActive('/dashboard/eventos')}
              tooltip="Eventos"
            >
              <Link href="/dashboard/eventos">
                <Tag className="h-4 w-4" />
                <span>Eventos</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isActive('/cotizaciones')}
              tooltip="Cotizaciones"
            >
              <Link href="/cotizaciones">
                <ClipboardList className="h-4 w-4" />
                <span>Cotizaciones</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <Collapsible
              open={creditCardMenuOpen}
              onOpenChange={setCreditCardMenuOpen}
              className="w-full"
            >
              <CollapsibleTrigger asChild>
                <SidebarMenuButton
                  isActive={isActive('/tarjetas-credito')}
                  className="w-full"
                  tooltip="Tarjetas de Crédito"
                >
                  <CreditCard className="h-4 w-4" />
                  <span>Tarjetas de Crédito</span>
                  <ChevronRight
                    className={`ml-auto h-4 w-4 transition-transform ${
                      creditCardMenuOpen ? 'rotate-90' : ''
                    }`}
                  />
                </SidebarMenuButton>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenuSub>
                  <SidebarMenuSubItem>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === '/tarjetas-credito'}
                    >
                      <Link href="/tarjetas-credito">
                        <span>Gestión</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuSubItem>
                  <SidebarMenuSubItem>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === '/dashboard/credit-cards'}
                    >
                      <Link href="/dashboard/credit-cards">
                        <span>Dashboard</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuSubItem>
                </SidebarMenuSub>
              </CollapsibleContent>
            </Collapsible>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isActive('/agrupadores')}
              tooltip="Agrupadores"
            >
              <Link href="/agrupadores">
                <LayersIcon className="h-4 w-4" />
                <span>Agrupadores</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isActive('/estudios')}
              tooltip="Estudios"
            >
              <Link href="/estudios">
                <BookOpen className="h-4 w-4" />
                <span>Estudios</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isActive('/simular')}
              tooltip="Simular"
            >
              <Link href="/simular">
                <Zap className="h-4 w-4" />
                <span>Simular</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isActive('/simular-prestamos')}
              tooltip="Simular Préstamos"
            >
              <Link href="/simular-prestamos">
                <Landmark className="h-4 w-4" />
                <span>Simular Préstamos</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isActive('/simular-inversiones')}
              tooltip="Simular Inversiones"
            >
              <Link href="/simular-inversiones">
                <TrendingUp className="h-4 w-4" />
                <span>Simular Inversiones</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isActive('/simular-tasas')}
              tooltip="Simular Tasas"
            >
              <Link href="/simular-tasas">
                <Percent className="h-4 w-4" />
                <span>Simular Tasas</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isActive('/dashboard/groupers')}
              tooltip="Dashboard Agrupadores"
            >
              <Link href="/dashboard/groupers">
                <BarChart3 className="h-4 w-4" />
                <span>Dashboard Agrupadores</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isActive('/dashboard/remainder')}
              tooltip="Dashboard Remanentes"
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
              isActive={isActive('/dashboard/category-bars')}
              tooltip="Gastos por Fecha"
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
              isActive={isActive('/dashboard/period-bars')}
              tooltip="Gastos por Periodo"
            >
              <Link href="/dashboard/period-bars">
                <BarChart3 className="h-4 w-4" />
                <span>Gastos por Periodo</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <Collapsible
              open={overspendOpen}
              onOpenChange={setOverspendOpen}
              className="w-full"
            >
              <CollapsibleTrigger asChild>
                <SidebarMenuButton
                  isActive={isActive('/dashboard/overspend')}
                  className="w-full"
                  tooltip="Overspend Actual"
                >
                  <BarChart3 className="h-4 w-4" />
                  <span>Overspend Actual</span>
                  <ChevronRight
                    className={`ml-auto h-4 w-4 transition-transform ${
                      overspendOpen ? 'rotate-90' : ''
                    }`}
                  />
                </SidebarMenuButton>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenuSub>
                  <SidebarMenuSubItem>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === '/dashboard/overspend'}
                    >
                      <Link href="/dashboard/overspend">
                        <span>Periodo Actual</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuSubItem>
                  <SidebarMenuSubItem>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === '/dashboard/overspend/all-periods'}
                    >
                      <Link href="/dashboard/overspend/all-periods">
                        <span>Todos los Periodos</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuSubItem>
                </SidebarMenuSub>
              </CollapsibleContent>
            </Collapsible>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isActive('/dashboard/projected-execution')}
              tooltip="Ejecución Proyectada"
            >
              <Link href="/dashboard/projected-execution">
                <TrendingUp className="h-4 w-4" />
                <span>Ejecución Proyectada</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isActive('/dashboard/payment-calendar')}
              tooltip="Calendario de Pagos"
            >
              <Link href="/dashboard/payment-calendar">
                <CalendarRange className="h-4 w-4" />
                <span>Calendario de Pagos</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isActive('/setup')}
              tooltip="Configuración"
            >
              <Link href="/setup">
                <Database className="h-4 w-4" />
                <span>Configuración</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className={`border-t ${isCollapsed ? 'p-2' : 'p-4'}`}>
        <div
          className={`flex flex-col gap-2 ${isCollapsed ? 'items-center' : ''}`}
        >
          {isAuthenticated && <LogoutButton />}
          {!isCollapsed && (
            <div className="text-xs text-muted-foreground">
              Budget Tracker v1.0
            </div>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
