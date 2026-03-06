import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils/cn';
import { isNavigationItemActive, navigationItems } from '@/components/layout/navigationItems';

const BottomNav = () => {
  const location = useLocation();

  return (
    <nav className="app-bottom-nav fixed inset-x-0 bottom-0 z-40 md:hidden" aria-label="Primary">
      <div className="app-bottom-nav-frame">
        {navigationItems.map(({ to, label, icon: Icon }) => {
          const isActive = isNavigationItemActive(location.pathname, to);

          return (
            <NavLink
              key={to}
              to={to}
              aria-label={label}
              className={cn("app-bottom-nav-item", isActive && "is-active")}
            >
              <span className="app-bottom-nav-icon">
                <Icon className="h-[1.15rem] w-[1.15rem]" aria-hidden="true" />
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
