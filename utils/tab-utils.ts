import { RouteConfig } from '@/types/tabs';
import {
  Home,
  PieChart,
  CalendarRange,
  Calculator,
  TrendingUp,
  Receipt,
  CreditCard,
  Wallet,
  Layers as LayersIcon,
  BookOpen,
  Zap,
  BarChart3,
  Database,
} from 'lucide-react';

// Route configuration for tab system
export const routeConfig: Record<string, RouteConfig> = {
  '/': {
    path: '/',
    title: 'Dashboard',
    icon: Home,
    isClosable: true,
    requiresAuth: true,
  },
  '/categorias': {
    path: '/categorias',
    title: 'Categorías',
    icon: PieChart,
    isClosable: true,
    requiresAuth: true,
  },
  '/periodos': {
    path: '/periodos',
    title: 'Períodos',
    icon: CalendarRange,
    isClosable: true,
    requiresAuth: true,
  },
  '/presupuestos': {
    path: '/presupuestos',
    title: 'Presupuestos',
    icon: Calculator,
    isClosable: true,
    requiresAuth: true,
  },
  '/ingresos': {
    path: '/ingresos',
    title: 'Ingresos',
    icon: TrendingUp,
    isClosable: true,
    requiresAuth: true,
  },
  '/gastos': {
    path: '/gastos',
    title: 'Gastos',
    icon: Receipt,
    isClosable: true,
    requiresAuth: true,
  },
  '/tarjetas-credito': {
    path: '/tarjetas-credito',
    title: 'Tarjetas de Crédito',
    icon: CreditCard,
    isClosable: true,
    requiresAuth: true,
  },
  '/fondos': {
    path: '/fondos',
    title: 'Fondos',
    icon: Wallet,
    isClosable: true,
    requiresAuth: true,
  },
  '/agrupadores': {
    path: '/agrupadores',
    title: 'Agrupadores',
    icon: LayersIcon,
    isClosable: true,
    requiresAuth: true,
  },
  '/estudios': {
    path: '/estudios',
    title: 'Estudios',
    icon: BookOpen,
    isClosable: true,
    requiresAuth: true,
  },
  '/simular': {
    path: '/simular',
    title: 'Simular',
    icon: Zap,
    isClosable: true,
    requiresAuth: true,
  },
  '/dashboard/groupers': {
    path: '/dashboard/groupers',
    title: 'Dashboard Agrupadores',
    icon: BarChart3,
    isClosable: true,
    requiresAuth: true,
  },
  '/dashboard/fondos': {
    path: '/dashboard/fondos',
    title: 'Dashboard Fondos',
    icon: BarChart3,
    isClosable: true,
    requiresAuth: true,
  },
  '/dashboard/remainder': {
    path: '/dashboard/remainder',
    title: 'Dashboard Remanentes',
    icon: TrendingUp,
    isClosable: true,
    requiresAuth: true,
  },
  '/dashboard/category-bars': {
    path: '/dashboard/category-bars',
    title: 'Gastos por Fecha',
    icon: BarChart3,
    isClosable: true,
    requiresAuth: true,
  },
  '/dashboard/period-bars': {
    path: '/dashboard/period-bars',
    title: 'Gastos por Periodo',
    icon: BarChart3,
    isClosable: true,
    requiresAuth: true,
  },
  '/dashboard/overspend': {
    path: '/dashboard/overspend',
    title: 'Overspend Actual',
    icon: BarChart3,
    isClosable: true,
    requiresAuth: true,
  },
  '/setup': {
    path: '/setup',
    title: 'Configuración',
    icon: Database,
    isClosable: true,
    requiresAuth: true,
  },
};

// Generate tab title from path
export const getTabTitle = (path: string): string => {
  // Check exact match first
  if (routeConfig[path]) {
    return routeConfig[path].title;
  }

  // Check for dynamic routes
  Object.keys(routeConfig).forEach((routePath) => {
    if (path.startsWith(routePath)) {
      // Handle dynamic routes like /simular/[id], /estudios/[id]
      const segments = path.split('/');
      const routeSegments = routePath.split('/');

      if (segments.length === routeSegments.length + 1) {
        // Dynamic route with parameter
        const baseConfig = routeConfig[routePath];
        if (baseConfig) {
          // For now, just return the base title
          // In the future, we could fetch the specific entity name
          return baseConfig.title;
        }
      }
    }
  });

  // Fallback: generate title from path
  const segments = path.split('/').filter(Boolean);
  return segments
    .map(segment => {
      // Convert kebab-case to Title Case
      return segment
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    })
    .join(' / ') || 'Untitled';
};

// Get tab icon from path
export const getTabIcon = (path: string) => {
  // First try exact match
  if (routeConfig[path]) {
    return routeConfig[path].icon;
  }

  // Check for dynamic routes
  for (const routePath of Object.keys(routeConfig)) {
    if (path.startsWith(routePath)) {
      const segments = path.split('/');
      const routeSegments = routePath.split('/');

      if (segments.length === routeSegments.length + 1) {
        return routeConfig[routePath]?.icon;
      }
    }
  }

  return undefined;
};

// Generate unique tab ID
export const generateTabId = (): string => {
  return `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Check if route is closable
export const isRouteClosable = (path: string): boolean => {
  if (routeConfig[path]) {
    return routeConfig[path].isClosable !== false;
  }

  // For dynamic routes, check base route
  Object.keys(routeConfig).forEach((routePath) => {
    if (path.startsWith(routePath)) {
      const segments = path.split('/');
      const routeSegments = routePath.split('/');

      if (segments.length === routeSegments.length + 1) {
        return routeConfig[routePath]?.isClosable !== false;
      }
    }
  });

  return true;
};

// Extract base route from dynamic route
export const getBaseRoute = (path: string): string => {
  if (routeConfig[path]) {
    return path;
  }

  // Find the matching base route for dynamic routes
  Object.keys(routeConfig).forEach((routePath) => {
    if (path.startsWith(routePath)) {
      const segments = path.split('/');
      const routeSegments = routePath.split('/');

      if (segments.length === routeSegments.length + 1) {
        return routePath;
      }
    }
  });

  return path;
};

// Validate tab data
export const validateTabData = (tab: any): boolean => {
  return (
    tab &&
    typeof tab.id === 'string' &&
    typeof tab.title === 'string' &&
    typeof tab.path === 'string' &&
    typeof tab.isActive === 'boolean' &&
    (tab.createdAt instanceof Date || typeof tab.createdAt === 'string') &&
    (tab.lastAccessed instanceof Date || typeof tab.lastAccessed === 'string')
  );
};