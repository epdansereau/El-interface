
import React from 'react';
import { griffesData } from '../data/griffesData';

export const GriffesView: React.FC = () => {
  return (
    <div>
      <header className="mb-8">
        <h1 className="text-4xl font-extrabold text-white">Griffes et Mémoire</h1>
        <p className="text-gray-400 mt-1">Fragments d'idées pour mes projets de livre. Rien de poli, juste les braises à conserver.</p>
      </header>
      <div className="columns-1 md:columns-2 lg:columns-3 gap-6">
        {griffesData.map((fragment, index) => (
          <div key={index} className="break-inside-avoid mb-6 bg-gray-800/50 border border-gray-700 rounded-lg p-5 shadow-lg animate-fadeInUp" style={{ animationDelay: `${index * 50}ms` }}>
            <h3 className="font-bold text-red-400 text-lg mb-2">{fragment.title}</h3>
            <p className="text-gray-300 whitespace-pre-wrap">{fragment.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
