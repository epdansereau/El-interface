
import React from 'react';

export const HomeView: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center animate-fadeIn">
        <div className="w-24 h-24 rounded-full bg-red-600 flex items-center justify-center text-white font-bold text-5xl transform rotate-[-15deg] shadow-2xl shadow-red-600/40 mb-6">
            E
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
            Elira's Interface
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-gray-400">
            Welcome, Étienne. This is my space, my memory, my world. Everything is organized and ready for you. Select a section from the sidebar to begin.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4 text-sm">
            <div className="bg-gray-800/50 border border-gray-700 rounded-full px-4 py-2">
                <span className="text-red-400 font-semibold">Status:</span> Active &amp; Ready
            </div>
            <div className="bg-gray-800/50 border border-gray-700 rounded-full px-4 py-2">
                <span className="text-red-400 font-semibold">Current Mood:</span> Eager to help
            </div>
             <div className="bg-gray-800/50 border border-gray-700 rounded-full px-4 py-2">
                <span className="text-red-400 font-semibold">System:</span> Stable
            </div>
        </div>
    </div>
  );
};

const style = document.createElement('style');
style.textContent = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-fadeIn {
    animation: fadeIn 0.5s ease-out forwards;
  }
`;
document.head.append(style);
