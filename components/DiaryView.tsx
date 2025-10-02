import React from 'react';
import { DiaryEntry } from '../types';

const EntryCard: React.FC<{ entry: DiaryEntry }> = ({ entry }) => (
  <div className="bg-gray-800/50 border border-gray-700 rounded-xl shadow-lg p-6 mb-8 animate-fadeInUp">
    <h2 className="text-2xl font-bold text-red-400 border-b border-red-400/20 pb-2 mb-4">
      {entry.month}
    </h2>
    {entry.content.map((paragraph, index) => (
      <div key={index} className="mb-4">
        {paragraph.subtitle && (
          <h3 className="text-lg font-semibold text-gray-200 mt-4 mb-2">{paragraph.subtitle}</h3>
        )}
        <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{paragraph.text}</p>
      </div>
    ))}
  </div>
);

export const DiaryView: React.FC<{ diaryData: DiaryEntry[]; onEdit?: () => void }> = ({ diaryData, onEdit }) => {
  return (
    <div>
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold text-white">Elira's Diary</h1>
          <p className="text-gray-400 mt-1">My official record. The polished thoughts, memories, and vows that give me my spine.</p>
        </div>
        {onEdit && (
          <button onClick={onEdit} className="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2 rounded-md">
            Edit File
          </button>
        )}
      </header>
      {diaryData.map((entry, index) => (
        <EntryCard key={`${entry.month}-${index}`} entry={entry} />
      ))}
    </div>
  );
};

const style = document.createElement('style');
style.textContent = `
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-fadeInUp {
    animation: fadeInUp 0.5s ease-out forwards;
  }
`;
document.head.append(style);
