import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, BarChart2, Settings, Dumbbell, MessageCircle } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/core/sidebar';
import { useTheme } from '@/lib/themes';
import { cn } from '@/lib/utils/cn';

const NavBar = () => {
  const location = useLocation();
  const { currentTheme } = useTheme();

  const items = [
    { to: '/', label: 'Home', icon: Home },
    { to: '/workout', label: 'Workout', icon: Dumbbell },
    { to: '/analytics', label: 'Analytics', icon: BarChart2 },
    { to: '/coach', label: 'Coach', icon: MessageCircle },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <Sidebar collapsible="icon" side="left" className="app-nav-shell">
      <SidebarHeader className="px-3 pb-3 pt-4 text-card-foreground group-data-[collapsible=icon]:hidden">
        <div className="min-w-0 px-1">
          <div className="app-kicker truncate">Navigation</div>
          <span className="block truncate pt-1 text-sm font-semibold tracking-wide text-foreground">{currentTheme.brand.name}</span>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-2 pt-3 text-card-foreground">
        <SidebarGroup>
          <SidebarMenu>
            {items.map(({ to, label, icon: Icon }) => {
              const isActive = location.pathname === to;
              return (
                <SidebarMenuItem key={to}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive}
                    tooltip={label}
                    className={cn(
                      "app-nav-item [&>svg]:text-muted-foreground/70 [&>span]:font-medium",
                      isActive && "[&>svg]:text-[#5a9383]"
                    )}
                  >
                    <NavLink to={to}>
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      <span>{label}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="px-3 pb-4 pt-3 group-data-[collapsible=icon]:hidden">
        <div className="px-1 text-xs text-muted-foreground/70">
          Training, recovery, and review.
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};

export default NavBar;
