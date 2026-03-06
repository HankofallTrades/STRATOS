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

const BottomNav = () => {
  const location = useLocation();

  const items = [
    { to: '/analytics', label: 'Analytics', icon: BarChart2 },
    { to: '/workout', label: 'Workout', icon: Dumbbell },
    { to: '/', label: 'Home', icon: Home },
    { to: '/coach', label: 'Coach', icon: MessageCircle },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <Sidebar collapsible="icon" side="left">
      <SidebarRail />
      <SidebarHeader className="flex items-center justify-between">
        <div className="px-2 text-sm font-semibold">STRATOS</div>
        <SidebarTrigger />
      </SidebarHeader>
      <SidebarContent>
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
      <SidebarFooter />
    </Sidebar>
  );
};

export default BottomNav; 