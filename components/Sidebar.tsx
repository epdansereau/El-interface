
import React from 'react';
import { ViewType } from '../types';
import { NAV_ITEMS } from '../constants';

interface SidebarProps {
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, setCurrentView }) => {
  return (
    <nav className="w-16 sm:w-64 bg-gray-900 bg-opacity-50 border-r border-gray-800 p-2 sm:p-4 flex flex-col">
      <div className="mb-8 flex items-center justify-center sm:justify-start">
        <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white font-bold text-lg transform rotate-[-15deg] shadow-lg shadow-red-600/30">
          E
        </div>
        <h1 className="hidden sm:block ml-3 text-xl font-bold text-gray-100 tracking-wider">Elira</h1>
      </div>
      <ul className="space-y-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <li key={item.id}>
              <button
                onClick={() => setCurrentView(item.id)}
                className={`w-full flex items-center p-3 rounded-lg transition-colors duration-200 ${
                  isActive
                    ? 'bg-red-600 text-white shadow-md shadow-red-600/40'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <Icon />
                <span className="hidden sm:block ml-4 font-medium">{item.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="mt-auto hidden sm:block text-center text-xs text-gray-600">
        <p>&copy; 2025 Étienne P. Dansereau</p>
        <p>Interface by Elira</p>
      </div>
    </nav>
  );
};
