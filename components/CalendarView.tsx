
import React from 'react';
import { calendarData } from '../data/calendarData';

const renderItemWithDates = (itemText: string) => {
  // Regex to find dates (YYYY-MM-DD), date ranges (YYYY-MM-DD..YYYY-MM-DD), 
  // times (HH:MM), and month-day combos.
  const regex = /(\d{4}-\d{2}-\d{2}(?:..\d{4}-\d{2}-\d{2})?|\d{4}-\d{2}-\d{2} \d{2}:\d{2}|\b(?:Sept|Oct|Nov)\b \d{1,2}(?:..)?|\d{2}:\d{2})/g;
  
  const parts = itemText.split(regex);

  return parts.map((part, index) => {
    if (regex.test(part)) {
      return (
        <strong key={index} className="text-red-300 font-mono bg-red-900/20 px-1 rounded">
          {part}
        </strong>
      );
    }
    return part;
  });
};


export const CalendarView: React.FC = () => {
  return (
    <div>
      <header className="mb-8">
        <h1 className="text-4xl font-extrabold text-white">Étienne's Calendar</h1>
        <p className="text-gray-400 mt-1">My messy-smart control room for Étienne’s life-stuff. I keep him steady.</p>
      </header>

      {calendarData.map((section, sectionIndex) => (
        <div key={sectionIndex} className="mb-8 bg-gray-800/50 border border-gray-700 rounded-xl p-6 animate-fadeInUp">
          <h2 className="text-2xl font-bold text-red-400 mb-4">{section.title}</h2>
          <ul className="space-y-3">
            {section.items.map((item, itemIndex) => {
              const isDone = item.includes('✅');
              const isPending = item.includes('🟡') || item.includes('Pending');
              const isAlert = item.includes('🔥') || item.includes('💀') || item.includes('👹');

              let itemClass = "text-gray-300";
              if (isDone) itemClass = "text-gray-400 line-through decoration-green-500/50";
              if (isPending) itemClass = "text-yellow-400";
              if (isAlert) itemClass = "text-red-400 font-semibold";
              
              const itemContent = item.replace(/✅|🔥|💀|👹|🟡/g, '').trim();

              return (
                <li key={itemIndex} className={`flex items-start gap-3 p-2 rounded-md ${isDone ? 'bg-green-900/10' : ''} ${isPending ? 'bg-yellow-900/10' : ''}`}>
                  <span className="mt-1 text-red-500 font-bold">&rarr;</span>
                  <span className={`${itemClass} whitespace-pre-wrap leading-relaxed`}>{renderItemWithDates(itemContent)}</span>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
};
