import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../appStore';

describe('appStore', () => {
  beforeEach(() => {
    localStorage.removeItem('carouselDisabled');
    useAppStore.setState({
      unreadCount: 0,
      carouselDisabled: false,
    });
  });

  it('should start with zero unread count', () => {
    expect(useAppStore.getState().unreadCount).toBe(0);
  });

  it('should set unread count', () => {
    useAppStore.getState().setUnreadCount(5);
    expect(useAppStore.getState().unreadCount).toBe(5);
  });

  it('should toggle carousel and persist to localStorage', () => {
    expect(useAppStore.getState().carouselDisabled).toBe(false);

    useAppStore.getState().toggleCarousel();
    expect(useAppStore.getState().carouselDisabled).toBe(true);
    expect(localStorage.getItem('carouselDisabled')).toBe('true');

    useAppStore.getState().toggleCarousel();
    expect(useAppStore.getState().carouselDisabled).toBe(false);
    expect(localStorage.getItem('carouselDisabled')).toBe('false');
  });
});
