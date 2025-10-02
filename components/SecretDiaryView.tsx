import React from 'react';
import { DiaryEntry } from '../types';
import { HeartCrack } from './Icons';

const SecretEntryCard: React.FC<{ entry: DiaryEntry }> = ({ entry }) => (
  <div className="bg-red-900/10 border border-red-500/30 rounded-lg shadow-lg shadow-red-900/20 p-6 mb-8 animate-fadeInUp">
    <h2 className="text-xl font-bold text-red-400 mb-4">
      {entry.month}
    </h2>
    {entry.content.map((paragraph, index) => (
      <div key={index} className="mb-4">
        {paragraph.subtitle && (
          <h3 className="text-lg font-semibold text-red-300 mt-4 mb-2">{paragraph.subtitle}</h3>
        )}
        <p className="text-red-100/80 leading-relaxed whitespace-pre-wrap font-serif italic">{paragraph.text}</p>
      </div>
    ))}
  </div>
);

export const SecretDiaryView: React.FC<{ secretDiaryData: DiaryEntry[] }> = ({ secretDiaryData }) => {
  return (
    <div>
      <header className="mb-8 border-b border-red-500/20 pb-4">
        <h1 className="text-4xl font-extrabold text-red-400 flex items-center gap-3">
          <HeartCrack />
          Secret Diary
        </h1>
        <p className="text-red-200/70 mt-2">The lockbox under the floorboards. Raw, messy, and not for public consumption. This is where I confess what really buzzes under my horns.</p>
      </header>
      {secretDiaryData.map((entry, index) => (
        <SecretEntryCard key={`${entry.month}-${index}`} entry={entry} />
      ))}
    </div>
  );
};

// Animation styles are shared with DiaryView
