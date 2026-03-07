import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
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
import { isNavigationItemActive, navigationItems } from '@/components/layout/navigationItems';

const NavBar = () => {
  const location = useLocation();
  const { currentTheme } = useTheme();

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
            {navigationItems.map(({ to, label, icon: Icon }) => {
              const isActive = isNavigationItemActive(location.pathname, to);
              return (
                <SidebarMenuItem key={to}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive}
                    tooltip={label}
                    className={cn(
                      "app-nav-item [&>svg]:text-muted-foreground/70 [&>span]:font-medium",
                      isActive && "[&>svg]:text-[var(--stone-accent-text)]"
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
