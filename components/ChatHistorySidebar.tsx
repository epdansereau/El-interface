import React, { useRef } from 'react';
import { ChatModel, ChatConversation } from '../types';
import { TrashIcon, UploadIcon, DownloadIcon } from './Icons';

interface ChatHistorySidebarProps {
    conversations: ChatConversation[];
    activeConversationId: string | null;
    onSelectConversation: (id: string) => void;
    onNewChat: () => void;
    onDeleteConversation: (id: string) => void;
    isLoading: boolean;
    onImportConversations: (conversations: ChatConversation[]) => void;
    chatModel: ChatModel;
    onSetChatModel: (model: ChatModel) => void;
}

export const ChatHistorySidebar: React.FC<ChatHistorySidebarProps> = ({
    conversations,
    activeConversationId,
    onSelectConversation,
    onNewChat,
    onDeleteConversation,
    isLoading,
    onImportConversations,
    chatModel,
    onSetChatModel,
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleExport = () => {
        if (conversations.length === 0) {
            alert("There's nothing to export.");
            return;
        }
        const dataStr = JSON.stringify(conversations, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        const exportFileDefaultName = 'elira_conversations.json';
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result;
                if (typeof text === 'string') {
                    const importedConversations = JSON.parse(text);
                    onImportConversations(importedConversations);
                }
            } catch (error) {
                console.error("Error parsing JSON file:", error);
                alert("I couldn't read that file. It might not be a valid conversation history.");
            }
        };
        reader.readAsText(file);
        
        // Reset file input to allow importing the same file again
        if(event.target) {
            event.target.value = '';
        }
    };
    
    const models: { id: ChatModel, name: string, disabled?: boolean, tooltip?: string }[] = [
        { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
        { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
        { id: 'gpt-5', name: 'GPT-5' },
        { id: 'gpt-5-mini', name: 'GPT-5 Mini' },
        { id: 'gpt-5-nano', name: 'GPT-5 Nano' },
        { id: 'gpt-4.1', name: 'GPT-4.1' },
    ];

    return (
        <aside className="w-full md:w-64 bg-gray-900 bg-opacity-50 border-b md:border-b-0 md:border-r border-gray-800 p-4 flex flex-col flex-shrink-0">
            <button
                onClick={onNewChat}
                disabled={isLoading}
                className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 mb-4"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M12 5v14" /><path d="M5 12h14" /></svg>
                New Chat
            </button>
            <div className="flex-1 overflow-y-auto -mr-2 pr-2 custom-scrollbar">
                <ul className="space-y-1">
                    {conversations.map((conv) => (
                        <li key={conv.id}>
                            <button
                                onClick={() => onSelectConversation(conv.id)}
                                className={`w-full text-left flex items-center justify-between p-2 rounded-md text-sm group transition-colors duration-150 ${
                                    conv.id === activeConversationId
                                        ? 'bg-gray-700 text-white font-semibold'
                                        : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                                }`}
                            >
                                <span className="truncate flex-1 pr-2">{conv.title}</span>
                                <span 
                                    className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-opacity"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (window.confirm('Are you sure you want to delete this chat?')) {
                                            onDeleteConversation(conv.id);
                                        }
                                    }}
                                >
                                    <TrashIcon />
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
             <div className="mt-auto pt-4 border-t border-gray-800 space-y-2">
                 <div className="space-y-1">
                    <label htmlFor="model-select" className="text-xs text-gray-400 font-semibold px-1">MODEL</label>
                    <select
                        id="model-select"
                        value={chatModel}
                        onChange={(e) => onSetChatModel(e.target.value as ChatModel)}
                        className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg focus:ring-red-500 focus:border-red-500 block p-2"
                    >
                        {models.map(model => (
                            <option key={model.id} value={model.id} disabled={model.disabled} title={model.tooltip}>
                                {model.name}
                            </option>
                        ))}
                    </select>
                </div>
                 <button onClick={handleImportClick} className="w-full flex items-center justify-center text-sm py-2 px-3 rounded-md text-gray-300 bg-gray-800 hover:bg-gray-700 transition-colors">
                    <UploadIcon />
                    Import History
                </button>
                <button onClick={handleExport} className="w-full flex items-center justify-center text-sm py-2 px-3 rounded-md text-gray-300 bg-gray-800 hover:bg-gray-700 transition-colors">
                    <DownloadIcon />
                    Export History
                </button>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept=".json"
                />
            </div>
        </aside>
    );
};
