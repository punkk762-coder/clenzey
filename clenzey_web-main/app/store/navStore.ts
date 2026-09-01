import { create } from 'zustand';

interface NavState {
  menuOpen: boolean;
  navHidden: boolean;
  navScrolled: boolean;
  heroVisible: boolean;
  setNavHidden: (hidden: boolean) => void;
  setNavScrolled: (scrolled: boolean) => void;
  setHeroVisible: (visible: boolean) => void;
  toggleMenu: () => void;
  closeMenu: () => void;
}

export const useNavStore = create<NavState>((set, get) => ({
  menuOpen: false,
  navHidden: false,
  navScrolled: false,
  heroVisible: true,

  setNavHidden: (navHidden) => set({ navHidden }),
  setNavScrolled: (navScrolled) => set({ navScrolled }),
  setHeroVisible: (heroVisible) => set({ heroVisible }),

  toggleMenu: () => {
    const next = !get().menuOpen;
    document.body.style.overflow = next ? 'hidden' : '';
    set({ menuOpen: next });
  },

  closeMenu: () => {
    document.body.style.overflow = '';
    set({ menuOpen: false });
  },
}));
