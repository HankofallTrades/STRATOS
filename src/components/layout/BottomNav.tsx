import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils/cn';
import { isNavigationItemActive, navigationItems } from '@/components/layout/navigationItems';
import PresenceMark from '@/components/layout/PresenceMark';

const BottomNav = () => {
  const location = useLocation();
  const midpoint = Math.ceil(navigationItems.length / 2);
  const leftItems = navigationItems.slice(0, midpoint);
  const rightItems = navigationItems.slice(midpoint);

  const renderItem = ({ to, label, icon: Icon }: (typeof navigationItems)[number]) => {
    const isActive = isNavigationItemActive(location.pathname, to);
    return (
      <NavLink
        key={to}
        to={to}
        aria-label={label}
        className={cn('app-bottom-nav-item', isActive && 'is-active')}
      >
        <span className="app-bottom-nav-icon">
          <Icon className="h-[1.15rem] w-[1.15rem]" aria-hidden="true" />
        </span>
      </NavLink>
    );
  };

  return (
    <nav className="app-bottom-nav fixed inset-x-0 bottom-0 z-40 md:hidden" aria-label="Primary">
      <div className="app-bottom-nav-frame">
        {leftItems.map(renderItem)}
        <div className="flex flex-1 items-start justify-center">
          <PresenceMark size={46} className="-mt-5" />
        </div>
        {rightItems.map(renderItem)}
      </div>
    </nav>
  );
};

export default BottomNav;
