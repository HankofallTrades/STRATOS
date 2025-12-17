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
  SidebarRail,
  SidebarTrigger,
} from '@/components/core/sidebar';
import { useTheme } from '@/lib/themes';

const NavBar = () => {
  const location = useLocation();

  const items = [
    { to: '/', label: 'Home', icon: Home },
    { to: '/workout', label: 'Workout', icon: Dumbbell },
    { to: '/analytics', label: 'Analytics', icon: BarChart2 },
    { to: '/coach', label: 'Coach', icon: MessageCircle },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <Sidebar collapsible="icon" side="left" className="border-r border-border bg-card">
      <SidebarRail />
      <SidebarHeader className="flex items-center justify-end px-2 bg-card text-card-foreground">
        <SidebarTrigger />
      </SidebarHeader>
      <SidebarContent className="bg-card text-card-foreground">
        <SidebarGroup>
          <SidebarMenu>
            {items.map(({ to, label, icon: Icon }) => {
              const isActive = location.pathname === to;
              return (
                <SidebarMenuItem key={to}>
                  <SidebarMenuButton asChild isActive={isActive} tooltip={label}>
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
      <SidebarFooter className="bg-card" />
    </Sidebar>
  );
};

export default NavBar;
