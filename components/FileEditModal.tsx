import React, { useState, useEffect } from 'react';
import { EditableFile } from '../types';

interface FileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (filename: EditableFile, content: string) => Promise<void>;
  filename: EditableFile | null;
  initialContent: string;
  error: string | null;
  onContentChange: (newContent: string) => void;
}

export const FileEditModal: React.FC<FileEditModalProps> = ({
  isOpen,
  onClose,
  onSave,
  filename,
  initialContent,
  error,
  onContentChange
}) => {
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // This syncs the parent's state with the modal's display
    // The parent component is now the source of truth for the content
  }, [initialContent]);

  if (!isOpen || !filename) return null;

  const handleSave = async () => {
    setIsSaving(true);
    await onSave(filename, initialContent); // Save the content from the parent state
    setIsSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col">
        <header className="p-4 border-b border-gray-800 flex justify-between items-center flex-shrink-0">
          <h2 className="text-lg font-semibold text-white">
            Editing: <span className="font-mono text-red-400">{filename}</span>
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl font-bold">&times;</button>
        </header>
        <main className="p-4 flex-1 overflow-y-auto">
          <textarea
            value={initialContent}
            onChange={(e) => onContentChange(e.target.value)}
            className="w-full h-full bg-gray-950 text-gray-200 p-4 rounded-md border border-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500 font-mono text-sm resize-none custom-scrollbar"
            spellCheck="false"
          />
        </main>
        <footer className="p-4 border-t border-gray-800 flex justify-end items-center gap-4 flex-shrink-0">
           {error && <p className="text-red-400 text-sm mr-auto animate-pulse">{error}</p>}
          <button onClick={onClose} className="px-4 py-2 rounded-md bg-gray-700 text-white hover:bg-gray-600 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-500 disabled:cursor-wait transition-colors"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </footer>
      </div>
    </div>
  );
};

const style = document.createElement('style');
style.textContent = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  .animate-fadeIn {
    animation: fadeIn 0.2s ease-out forwards;
  }
`;
document.head.append(style);