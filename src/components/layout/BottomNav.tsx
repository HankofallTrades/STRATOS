import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, BarChart2, Settings, Dumbbell, MessageCircle } from 'lucide-react';
// import { useIsMobile } from '@/hooks/use-is-mobile'; // Temporarily remove hook import

const BottomNav = () => {
  // const isMobile = useIsMobile(); // Temporarily remove hook usage

  // if (!isMobile) { // Temporarily remove check
  //   return null; 
  // }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t dark:border-gray-700 flex justify-around z-10">
      {/* Analytics Link */}
      <NavLink
        to="/analytics"
        className={({ isActive }) =>
          `flex flex-col items-center p-3 w-1/5 ${isActive ? 'text-blue-500 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`
        }
      >
        {({ isActive }) => (
          <>
            <BarChart2 className="h-6 w-6" aria-hidden="true" />
            <span className="text-xs mt-1">Analytics</span>
            <span className="sr-only" aria-current={isActive ? 'page' : undefined} aria-label="Analytics"></span>
          </>
        )}
      </NavLink>
      {/* Workout Link */}
      <NavLink
        to="/workout"
        className={({ isActive }) =>
          `flex flex-col items-center p-3 w-1/5 ${isActive ? 'text-blue-500 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`
        }
      >
        {({ isActive }) => (
          <>
            <Dumbbell className="h-6 w-6" aria-hidden="true" />
            <span className="text-xs mt-1">Workout</span>
            <span className="sr-only" aria-current={isActive ? 'page' : undefined} aria-label="Workout"></span>
          </>
        )}
      </NavLink>
      {/* Home Link (Middle) */}
      <NavLink
        to="/"
        className={({ isActive }) =>
          `flex flex-col items-center p-3 w-1/5 ${isActive ? 'text-blue-500 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`
        }
      >
        {({ isActive }) => (
          <>
            <Home className="h-6 w-6" aria-hidden="true" />
            <span className="text-xs mt-1">Home</span>
            <span className="sr-only" aria-current={isActive ? 'page' : undefined} aria-label="Home"></span>
          </>
        )}
      </NavLink>
      {/* Coach Link */}
      <NavLink
        to="/coach"
        className={({ isActive }) =>
          `flex flex-col items-center p-3 w-1/5 ${isActive ? 'text-blue-500 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`
        }
      >
        {({ isActive }) => (
          <>
            <MessageCircle className="h-6 w-6" aria-hidden="true" />
            <span className="text-xs mt-1">Coach</span>
            <span className="sr-only" aria-current={isActive ? 'page' : undefined} aria-label="Coach"></span>
          </>
        )}
      </NavLink>
      {/* Settings Link */}
      <NavLink
        to="/settings"
        className={({ isActive }) =>
          `flex flex-col items-center p-3 w-1/5 ${isActive ? 'text-blue-500 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`
        }
      >
        {({ isActive }) => (
          <>
            <Settings className="h-6 w-6" aria-hidden="true" />
            <span className="text-xs mt-1">Settings</span>
            <span className="sr-only" aria-current={isActive ? 'page' : undefined} aria-label="Settings"></span>
          </>
        )}
      </NavLink>
    </nav>
  );
};

export default BottomNav; 