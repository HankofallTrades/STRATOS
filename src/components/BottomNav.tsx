import React from 'react';
import { NavLink } from 'react-router-dom';
import { Dumbbell, BarChart2, Settings as SettingsIcon } from 'lucide-react';

const BottomNav: React.FC = () => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 p-2 z-50">
      <div className="flex justify-around items-center">
        {/* Analytics Tab */}
        <NavLink
          to="/analytics"
          className={({ isActive }) => 
            `flex flex-col items-center p-2 ${isActive ? 'text-blue-500' : 'text-gray-500'}`
          }
        >
          <BarChart2 className="h-6 w-6" />
          <span className="text-xs mt-1">Analytics</span>
        </NavLink>
        
        {/* Workout Tab */}
        <NavLink
          to="/"
          className={({ isActive }) => 
            `flex flex-col items-center p-2 ${isActive ? 'text-blue-500' : 'text-gray-500'}`
          }
          end
        >
          <Dumbbell className="h-6 w-6" />
          <span className="text-xs mt-1">Workout</span>
        </NavLink>
        
        {/* Settings Tab */}
        <NavLink
          to="/settings"
          className={({ isActive }) => 
            `flex flex-col items-center p-2 ${isActive ? 'text-blue-500' : 'text-gray-500'}`
          }
        >
          <SettingsIcon className="h-6 w-6" />
          <span className="text-xs mt-1">Settings</span>
        </NavLink>
      </div>
    </nav>
  );
};

export default BottomNav; 