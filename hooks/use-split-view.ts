'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface SplitPanel {
  route: string;
}

export interface SplitViewState {
  panelCount: 1 | 2 | 3;
  panels: SplitPanel[]; // length = panelCount - 1
}

interface StoredSplitView {
  state: SplitViewState;
  timestamp: number;
}

const STORAGE_KEY = 'budget-tracker-split-view';
const EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours
const ULTRAWIDE_BREAKPOINT = 1800;
const DEFAULT_PANEL_ROUTE = '/dashboard/category-bars';

function getDefaultState(): SplitViewState {
  return { panelCount: 1, panels: [] };
}

function loadFromStorage(): SplitViewState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const stored: StoredSplitView = JSON.parse(raw);
    if (Date.now() - stored.timestamp > EXPIRY_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return stored.state;
  } catch {
    return null;
  }
}

function saveToStorage(state: SplitViewState) {
  try {
    const stored: StoredSplitView = {
      state,
      timestamp: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // ignore storage errors
  }
}

export function useSplitView() {
  const { toast } = useToast();
  const [isUltrawide, setIsUltrawide] = useState(false);
  const [splitState, setSplitState] = useState<SplitViewState>(getDefaultState);

  // Detect ultrawide on mount and listen for resize
  useEffect(() => {
    const check = () => {
      const wide = window.innerWidth >= ULTRAWIDE_BREAKPOINT;
      setIsUltrawide(wide);
      if (!wide) {
        // Auto-collapse if screen shrinks below ultrawide
        setSplitState((prev) => {
          if (prev.panelCount > 1) {
            toast({
              title: 'Vista dividida cerrada',
              description:
                'La pantalla es demasiado pequeña para la vista dividida.',
            });
            const collapsed = getDefaultState();
            saveToStorage(collapsed);
            return collapsed;
          }
          return prev;
        });
      }
    };

    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [toast]);

  // Restore from localStorage on mount (only if ultrawide)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.innerWidth >= ULTRAWIDE_BREAKPOINT) {
      const saved = loadFromStorage();
      if (saved && saved.panelCount > 1) {
        setSplitState(saved);
      }
    }
  }, []);

  // Persist state whenever it changes
  useEffect(() => {
    saveToStorage(splitState);
  }, [splitState]);

  const cyclePanels = useCallback(() => {
    setSplitState((prev) => {
      if (prev.panelCount === 1) {
        return {
          panelCount: 2,
          panels: [{ route: DEFAULT_PANEL_ROUTE }],
        };
      }
      if (prev.panelCount === 2) {
        return {
          panelCount: 3,
          panels: [prev.panels[0], { route: DEFAULT_PANEL_ROUTE }],
        };
      }
      // 3 → 1
      return getDefaultState();
    });
  }, []);

  const setPanelCount = useCallback((count: 1 | 2 | 3) => {
    setSplitState((prev) => {
      if (count === 1) return getDefaultState();
      if (count === 2) {
        return {
          panelCount: 2,
          panels: [prev.panels[0] ?? { route: DEFAULT_PANEL_ROUTE }],
        };
      }
      // count === 3
      return {
        panelCount: 3,
        panels: [
          prev.panels[0] ?? { route: DEFAULT_PANEL_ROUTE },
          prev.panels[1] ?? { route: DEFAULT_PANEL_ROUTE },
        ],
      };
    });
  }, []);

  const setPanelRoute = useCallback((index: number, route: string) => {
    setSplitState((prev) => {
      const newPanels = [...prev.panels];
      if (index >= 0 && index < newPanels.length) {
        newPanels[index] = { route };
      }
      return { ...prev, panels: newPanels };
    });
  }, []);

  const closePanel = useCallback((index: number) => {
    setSplitState((prev) => {
      if (prev.panelCount === 1) return prev;
      const newPanels = prev.panels.filter((_, i) => i !== index);
      const newCount = (prev.panelCount - 1) as 1 | 2 | 3;
      return { panelCount: newCount, panels: newPanels };
    });
  }, []);

  return {
    isUltrawide,
    splitState,
    cyclePanels,
    setPanelCount,
    setPanelRoute,
    closePanel,
  };
}
