import {
  BarChart2,
  Dumbbell,
  Home,
  MessageCircle,
  Settings,
  type LucideIcon,
} from 'lucide-react';

export interface NavigationItem {
  to: string;
  label: string;
  mobileLabel: string;
  icon: LucideIcon;
}

export const navigationItems: NavigationItem[] = [
  { to: '/', label: 'Home', mobileLabel: 'Home', icon: Home },
  { to: '/workout', label: 'Workout', mobileLabel: 'Train', icon: Dumbbell },
  { to: '/analytics', label: 'Analytics', mobileLabel: 'Stats', icon: BarChart2 },
  { to: '/coach', label: 'Coach', mobileLabel: 'Coach', icon: MessageCircle },
  { to: '/settings', label: 'Settings', mobileLabel: 'Tune', icon: Settings },
];

export const isNavigationItemActive = (pathname: string, to: string): boolean => {
  if (to === '/') {
    return pathname === '/';
  }

  return pathname === to || pathname.startsWith(`${to}/`);
};
