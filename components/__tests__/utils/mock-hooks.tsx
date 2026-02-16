export const mockUseToast = () => {
  const toastFn = jest.fn();

  return {
    toast: toastFn,
    dismiss: jest.fn(),
    toasts: [],
  };
};

export const mockUseRouter = () => ({
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  prefetch: jest.fn(),
  pathname: '/test',
  query: {},
  asPath: '/test',
});

export const mockUseMobile = (isMobile = false) => ({
  isMobile,
});

// Setup common mocks for all tests
export const setupCommonMocks = () => {
  // Mock useToast
  jest.mock('@/components/ui/use-toast', () => ({
    useToast: mockUseToast,
  }));

  // Mock Next.js router
  jest.mock('next/navigation', () => ({
    useRouter: mockUseRouter,
    usePathname: () => '/test',
    useSearchParams: () => new URLSearchParams(),
  }));

  // Mock mobile hook
  jest.mock('@/hooks/use-mobile', () => ({
    useMobile: mockUseMobile,
  }));

  // Mock Recharts for performance
  jest.mock('recharts', () => ({
    BarChart: ({ children }: any) => (
      <div data-testid="bar-chart">{children}</div>
    ),
    Bar: () => <div data-testid="bar" />,
    XAxis: () => <div data-testid="x-axis" />,
    YAxis: () => <div data-testid="y-axis" />,
    CartesianGrid: () => <div data-testid="cartesian-grid" />,
    Tooltip: () => <div data-testid="tooltip" />,
    Legend: () => <div data-testid="legend" />,
    ResponsiveContainer: ({ children }: any) => (
      <div data-testid="responsive-container">{children}</div>
    ),
    LineChart: ({ children }: any) => (
      <div data-testid="line-chart">{children}</div>
    ),
    Line: () => <div data-testid="line" />,
    PieChart: ({ children }: any) => (
      <div data-testid="pie-chart">{children}</div>
    ),
    Pie: () => <div data-testid="pie" />,
    Cell: () => <div data-testid="cell" />,
  }));
};
