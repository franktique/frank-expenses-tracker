'use client';

import React from 'react';
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
  Plus,
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { LogoutButton } from '@/components/logout-button';
import { useAuth } from '@/lib/auth-context';
import { ThemeToggle } from '@/components/theme-toggle';
import { useTabs } from './tab-context';

export function TabAwareSidebar() {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();
  const { addTab } = useTabs();

  const isActive = (path: string) => {
    if (path === '/estudios') {
      return pathname === '/estudios' || pathname.startsWith('/estudios/');
    }
    if (path === '/simular') {
      return pathname === '/simular' || pathname.startsWith('/simular/');
    }
    return pathname === path;
  };

  // Handle navigation with tabs
  const handleNavigation = (
    path: string,
    title: string,
    e: React.MouseEvent
  ) => {
    e.preventDefault();

    // Check if we already have a tab with this path
    const existingTab = addTab(path, title);

    // If middle-click, open in new tab
    if (e.button === 1) {
      addTab(path, title);
    } else {
      // Regular click - add/switch to tab
      addTab(path, title);
    }
  };

  // Handle right-click context menu (future enhancement)
  const handleContextMenu = (
    path: string,
    title: string,
    e: React.MouseEvent
  ) => {
    e.preventDefault();
    // For now, just open in new tab
    // In the future, this could show a context menu with options like:
    // - Open in new tab
    // - Open in new window
    // - Copy link
    // - Add to favorites
    addTab(path, title);
  };

  const menuItems = [
    { path: '/', title: 'Dashboard', icon: Home },
    { path: '/categorias', title: 'Categorías', icon: PieChart },
    { path: '/periodos', title: 'Períodos', icon: CalendarRange },
    { path: '/presupuestos', title: 'Presupuestos', icon: Calculator },
    { path: '/ingresos', title: 'Ingresos', icon: TrendingUp },
    { path: '/gastos', title: 'Gastos', icon: Receipt },
    {
      path: '/tarjetas-credito',
      title: 'Tarjetas de Crédito',
      icon: CreditCard,
    },
    { path: '/fondos', title: 'Fondos', icon: Wallet },
    { path: '/agrupadores', title: 'Agrupadores', icon: LayersIcon },
    { path: '/estudios', title: 'Estudios', icon: BookOpen },
    { path: '/simular', title: 'Simular', icon: Zap },
    {
      path: '/dashboard/groupers',
      title: 'Dashboard Agrupadores',
      icon: BarChart3,
    },
    { path: '/dashboard/fondos', title: 'Dashboard Fondos', icon: BarChart3 },
    {
      path: '/dashboard/remainder',
      title: 'Dashboard Remanentes',
      icon: TrendingUp,
    },
    {
      path: '/dashboard/category-bars',
      title: 'Gastos por Fecha',
      icon: BarChart3,
    },
    {
      path: '/dashboard/period-bars',
      title: 'Gastos por Periodo',
      icon: BarChart3,
    },
    {
      path: '/dashboard/overspend',
      title: 'Overspend Actual',
      icon: BarChart3,
    },
    { path: '/setup', title: 'Configuración', icon: Database },
  ];

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
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <SidebarMenuItem key={item.path}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive(item.path)}
                  onMouseDown={(e) =>
                    handleNavigation(item.path, item.title, e)
                  }
                  onContextMenu={(e) =>
                    handleContextMenu(item.path, item.title, e)
                  }
                  title={`Click to open ${item.title} • Middle-click for new tab • Right-click for options`}
                  className="cursor-pointer"
                >
                  <a href={item.path} onClick={(e) => e.preventDefault()}>
                    <Icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}

          {/* Quick add tab button */}
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Button
                variant="ghost"
                className="h-8 w-full justify-start px-2 text-sm"
                onClick={() => addTab('/', 'New Tab')}
                title="Open new tab"
              >
                <Plus className="h-4 w-4" />
                <span>New Tab</span>
              </Button>
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
          <div className="text-xs text-muted-foreground">
            💡 Middle-click for new tab
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

// Enhanced sidebar with tab indicators
export function EnhancedTabAwareSidebar() {
  const pathname = usePathname();
  const { tabs } = useTabs();

  const getOpenTabCount = (basePath: string) => {
    return tabs.filter(
      (tab) => tab.path === basePath || tab.path.startsWith(basePath + '/')
    ).length;
  };

  const isActive = (path: string) => {
    if (path === '/estudios') {
      return pathname === '/estudios' || pathname.startsWith('/estudios/');
    }
    if (path === '/simular') {
      return pathname === '/simular' || pathname.startsWith('/simular/');
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
            <SidebarMenuButton asChild isActive={isActive('/')}>
              <a href="/" onClick={(e) => e.preventDefault()}>
                <Home className="h-4 w-4" />
                <span>Dashboard</span>
                {getOpenTabCount('/') > 0 && (
                  <span className="ml-auto rounded-full bg-primary px-1.5 py-0.5 text-xs text-primary-foreground">
                    {getOpenTabCount('/')}
                  </span>
                )}
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {/* Add other menu items with tab indicators */}
          {/* This would be expanded to include all menu items with tab counts */}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="border-t p-4">
        <div className="flex flex-col gap-2">
          <LogoutButton />
          <div className="text-xs text-muted-foreground">
            Budget Tracker v1.0
          </div>
          <div className="text-xs text-muted-foreground">
            {tabs.length} tab{tabs.length !== 1 ? 's' : ''} open
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
