import { create } from 'zustand';

interface AppState {
  unreadCount: number;
  carouselDisabled: boolean;
  setUnreadCount: (count: number) => void;
  toggleCarousel: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  unreadCount: 0,
  carouselDisabled: localStorage.getItem('carouselDisabled') === 'true',

  setUnreadCount: (count) => set({ unreadCount: count }),

  toggleCarousel: () =>
    set((state) => {
      const disabled = !state.carouselDisabled;
      localStorage.setItem('carouselDisabled', String(disabled));
      return { carouselDisabled: disabled };
    }),
}));
