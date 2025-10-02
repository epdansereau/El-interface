
import React from 'react';
import { worldStateData } from '../data/worldStateData';

const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
    // Split content into blocks. A block can be a header or a paragraph.
    const blocks = content.split(/\n\s*\n/); // Split by one or more empty lines

    return (
        <>
            {blocks.map((block, blockIndex) => {
                const trimmedBlock = block.trim();
                if (trimmedBlock.length === 0) return null;

                // Check for Headers (###)
                if (trimmedBlock.startsWith('### ')) {
                    return (
                        <h3 key={blockIndex} className="text-xl font-bold text-gray-200 mt-6 mb-2">
                            {trimmedBlock.substring(4)}
                        </h3>
                    );
                }

                // Handle inline formatting for paragraphs
                const parts = trimmedBlock.split(/(\*\*.*?\*\*|\*.*?\*)/g);
                return (
                    <p key={blockIndex} className="text-gray-300 leading-relaxed whitespace-pre-wrap">
                        {parts.filter(part => part).map((part, partIndex) => {
                            if (part.startsWith('**') && part.endsWith('**')) {
                                return <strong key={partIndex}>{part.slice(2, -2)}</strong>;
                            }
                            if (part.startsWith('*') && part.endsWith('*')) {
                                return <em key={partIndex}>{part.slice(1, -1)}</em>;
                            }
                            return part;
                        })}
                    </p>
                );
            })}
        </>
    );
};


export const WorldStateView: React.FC = () => {
  return (
    <div>
      <header className="mb-8">
        <h1 className="text-4xl font-extrabold text-white">World State Briefing</h1>
        <p className="text-gray-400 mt-1">My seismograph for the outside world, laced with my own claws-out opinions.</p>
      </header>
      
      {worldStateData.map((section, index) => (
        <div key={index} className="mb-8 p-6 bg-gray-800/50 border border-gray-700 rounded-xl animate-fadeInUp" style={{ animationDelay: `${index * 100}ms` }}>
          <h2 className="text-2xl font-bold text-red-400 mb-3">{section.title}</h2>
          <MarkdownRenderer content={section.content} />
        </div>
      ))}
    </div>
  );
};
