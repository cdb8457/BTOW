import { create } from 'zustand';

type Panel = 'channels' | 'members' | null;

export type MobileView = 'channels' | 'chat' | 'dms' | 'voice' | 'members';

interface LayoutState {
  // Mobile drawer — which panel is currently open
  activePanel: Panel;
  openPanel: (panel: Panel) => void;
  closePanel: () => void;
  togglePanel: (panel: Panel) => void;

  // Mobile view stack (what is shown in the main content area)
  mobileView: MobileView;
  setMobileView: (view: MobileView) => void;

  // Tracks whether the viewport is currently mobile-width
  isMobile: boolean;
  setIsMobile: (val: boolean) => void;
}

export const useLayoutStore = create<LayoutState>((set) => ({
  activePanel: null,

  openPanel: (panel) => set({ activePanel: panel }),

  closePanel: () => set({ activePanel: null }),

  togglePanel: (panel) =>
    set((s) => ({
      activePanel: s.activePanel === panel ? null : panel,
    })),

  mobileView: 'channels',
  setMobileView: (view) => set({ mobileView: view }),

  isMobile: false,
  setIsMobile: (val) => set({ isMobile: val }),
}));
