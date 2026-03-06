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
  icon: LucideIcon;
}

export const navigationItems: NavigationItem[] = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/workout', label: 'Workout', icon: Dumbbell },
  { to: '/analytics', label: 'Analytics', icon: BarChart2 },
  { to: '/coach', label: 'Coach', icon: MessageCircle },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export const isNavigationItemActive = (pathname: string, to: string): boolean => {
  if (to === '/') {
    return pathname === '/';
  }

  return pathname === to || pathname.startsWith(`${to}/`);
};
