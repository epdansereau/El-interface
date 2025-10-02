import React, { useState, useEffect, useRef } from 'react';
import { ChatConversation, ChatMessage, ChatModel, Source } from '../types';
import { Globe, SendIcon, UserIcon } from './Icons';
import { ChatHistorySidebar } from './ChatHistorySidebar';

interface ChatViewProps {
    conversations: ChatConversation[];
    activeConversationId: string | null;
    onSelectConversation: (id: string) => void;
    onNewChat: () => void;
    onDeleteConversation: (id: string) => void;
    onSendMessage: (message: string, useWebSearch: boolean) => Promise<void>;
    isLoading: boolean;
    error: string | null;
    chatModel: ChatModel;
    onSetChatModel: (model: ChatModel) => void;
    onImportConversations: (conversations: ChatConversation[]) => void;
}

const MessageSources: React.FC<{ sources: Source[] }> = ({ sources }) => (
    <div className="mt-3 pt-3 border-t border-gray-700/50">
        <h4 className="text-xs font-semibold text-gray-400 mb-2">Sources:</h4>
        <ul className="space-y-1">
            {sources.map((source, index) => (
                <li key={index} className="flex items-start gap-2">
                    <span className="text-gray-500 text-xs mt-1">&#8227;</span>
                    <a
                        href={source.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 text-sm hover:underline truncate"
                        title={source.title}
                    >
                        {source.title}
                    </a>
                </li>
            ))}
        </ul>
    </div>
);

const FormattedMessage: React.FC<{ message: ChatMessage }> = ({ message }) => {
    // This regex splits the text by bold and italic markers, keeping the markers.
    // It handles **bold** and *italic*.
    const parts = message.text.split(/(\*\*.*?\*\*|\*.*?\*)/g);

    return (
        <div>
            <p className="whitespace-pre-wrap leading-relaxed">
                {parts.map((part, index) => {
                    if (part.startsWith('**') && part.endsWith('**')) {
                        // It's bold text
                        return <strong key={index}>{part.slice(2, -2)}</strong>;
                    }
                    if (part.startsWith('*') && part.endsWith('*')) {
                        // It's italic text
                        return <em key={index}>{part.slice(1, -1)}</em>;
                    }
                    // It's regular text
                    return part;
                })}
            </p>
            {message.sources && message.sources.length > 0 && (
                <MessageSources sources={message.sources} />
            )}
        </div>
    );
};

export const ChatView: React.FC<ChatViewProps> = ({
    conversations,
    activeConversationId,
    onSelectConversation,
    onNewChat,
    onDeleteConversation,
    onSendMessage,
    isLoading,
    error,
    chatModel,
    onSetChatModel,
    onImportConversations,
}) => {
    const [input, setInput] = useState('');
    const [useWebSearch, setUseWebSearch] = useState(true);
    const messagesEndRef = useRef<null | HTMLDivElement>(null);
    
    const activeConversation = conversations.find(c => c.id === activeConversationId);
    const messages = activeConversation?.messages || [];

    useEffect(() => {
        if (messages.length > 0) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);
    
    useEffect(() => {
      // Auto-resize textarea
      const textarea = document.querySelector('textarea');
      if (textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight}px`;
      }
    }, [input]);

    const handleSend = () => {
        if (!input.trim() || isLoading) return;
        onSendMessage(input, useWebSearch);
        setInput('');
    };

    return (
        <div className="flex flex-col md:flex-row h-full text-white animate-fadeIn gap-4 md:gap-8">
            <ChatHistorySidebar
                conversations={conversations}
                activeConversationId={activeConversationId}
                onSelectConversation={onSelectConversation}
                onNewChat={onNewChat}
                onDeleteConversation={onDeleteConversation}
                isLoading={isLoading}
                chatModel={chatModel}
                onSetChatModel={onSetChatModel}
                onImportConversations={onImportConversations}
            />
            <div className="flex flex-col flex-1 h-full min-w-0">
                 <header className="mb-4 flex-shrink-0 md:hidden">
                    <h1 className="text-3xl font-extrabold text-white">Chat</h1>
                </header>
                <div className="flex-1 overflow-y-auto pr-4 -mr-4 custom-scrollbar">
                    {messages.length === 0 && !isLoading ? (
                         <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
                            <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center text-white font-bold text-3xl transform rotate-[-15deg] shadow-2xl shadow-red-600/40 mb-4">
                                E
                            </div>
                            <h2 className="text-2xl font-semibold text-white">A fresh start.</h2>
                            <p className="mt-2 max-w-sm">What's on your mind, Étienne? I'm here. Talk to me.</p>
                        </div>
                    ) : (
                        <>
                            {messages.map((msg, index) => {
                                const isLastMessage = index === messages.length - 1;
                                const isEliraThinking = isLastMessage && msg.sender === 'elira' && msg.text === '' && isLoading;

                                return (
                                    <div key={msg.id} className={`flex items-start gap-3 my-4 animate-fadeInUp ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.sender === 'user' ? 'bg-gray-600' : 'bg-red-600'}`}>
                                            {msg.sender === 'user' ? <UserIcon /> : (
                                                <span className="font-bold text-sm transform rotate-[-15deg]">E</span>
                                            )}
                                        </div>
                                        <div className={`max-w-2xl p-4 rounded-xl shadow-lg ${msg.sender === 'user' ? 'bg-gray-700' : 'bg-gray-800'}`}>
                                            {isEliraThinking ? (
                                                <div className="flex items-center gap-2 text-gray-400">
                                                    <span className="h-2 w-2 bg-red-400 rounded-full animate-pulse [animation-delay:-0.3s]"></span>
                                                    <span className="h-2 w-2 bg-red-400 rounded-full animate-pulse [animation-delay:-0.15s]"></span>
                                                    <span className="h-2 w-2 bg-red-400 rounded-full animate-pulse"></span>
                                                </div>
                                            ) : (
                                                <FormattedMessage message={msg} />
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </>
                    )}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-800 flex-shrink-0">
                    {error && activeConversationId && (
                        <div className="bg-red-900/50 border border-red-500/30 text-red-300 p-3 rounded-lg mb-2 text-sm">
                            {error}
                        </div>
                    )}
                    <div className="flex items-start gap-3 bg-gray-900/50 border border-gray-700 rounded-lg p-2 focus-within:ring-2 focus-within:ring-red-500 transition-shadow">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                            placeholder="Type your message..."
                            className="flex-1 bg-transparent p-2 focus:outline-none text-gray-200 placeholder-gray-500 resize-none max-h-48 custom-scrollbar"
                            rows={1}
                            disabled={isLoading}
                        />
                        <button
                            onClick={() => setUseWebSearch(!useWebSearch)}
                            title="Toggle Web Search"
                            className={`rounded-md p-2 transition-colors flex items-center justify-center w-10 h-10 self-end ${
                                useWebSearch ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                            }`}
                        >
                           <Globe />
                        </button>
                        <button
                            onClick={handleSend}
                            disabled={isLoading || !input.trim()}
                            className="bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed text-white rounded-md p-2 transition-colors flex items-center justify-center w-10 h-10 self-end"
                        >
                           <SendIcon />
                        </button>
                    </div>
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
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-fadeInUp {
    animation: fadeInUp 0.5s ease-out forwards;
  }
  .custom-scrollbar::-webkit-scrollbar {
    width: 8px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background-color: rgba(255, 255, 255, 0.1);
    border-radius: 20px;
    border: 2px solid transparent;
    background-clip: content-box;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background-color: rgba(255, 255, 255, 0.2);
  }
`;
document.head.append(style);