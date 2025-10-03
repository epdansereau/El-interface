
import React, { useState, useEffect, useRef } from 'react';
import { ChatConversation, ChatMessage, Source, ChatModel, UploadedFileInfo } from '../types';
import { Globe, SendIcon, UserIcon, PaperclipIcon } from './Icons';
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
    onImportConversations: (conversations: ChatConversation[]) => void;
    chatModel: ChatModel;
    onSetChatModel: (model: ChatModel) => void;
    attachedFiles: string[];
    onSetAttachedFiles: (names: string[]) => void;
    apiBase: string;
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
    onImportConversations,
    chatModel,
    onSetChatModel,
    attachedFiles,
    onSetAttachedFiles,
    apiBase,
}) => {
    const [input, setInput] = useState('');
    const [useWebSearch, setUseWebSearch] = useState(true);
    const [isAttachOpen, setIsAttachOpen] = useState(false);
    const [serverFiles, setServerFiles] = useState<UploadedFileInfo[]>([]);
    const [attachError, setAttachError] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const attachPanelRef = useRef<HTMLDivElement | null>(null);
    const attachButtonRef = useRef<HTMLButtonElement | null>(null);
    const openInCanvas = async (name: string) => {
        try {
            if (!apiBase) { setAttachError('Server not connected'); return; }
            let text = '';
            try {
                const rText = await fetch(`${apiBase}/api/files/${encodeURIComponent(name)}/text`);
                if (rText.ok) {
                    const data = await rText.json();
                    text = String(data.text || '');
                }
            } catch {}
            if (!text) {
                const r = await fetch(`${apiBase}/api/files/${encodeURIComponent(name)}`);
                if (!r.ok) throw new Error(await r.text());
                const raw = await r.text();
                if (/\u0000/.test(raw)) {
                    throw new Error('Binary file cannot be opened as text. Use Preview or convert to text.');
                }
                text = raw;
            }
            const event = new CustomEvent('elira-open-canvas', { detail: { kind: 'workspace', name, content: text } });
            window.dispatchEvent(event);
            setIsAttachOpen(false);
        } catch (e: any) {
            setAttachError(e.message || 'Failed to open in canvas');
        }
    };
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

    const refreshServerFiles = async () => {
        if (!apiBase) { setAttachError('Server not connected'); return; }
        setAttachError(null);
        try {
            const r = await fetch(`${apiBase}/api/files`);
            if (!r.ok) throw new Error(await r.text());
            const data = await r.json();
            setServerFiles(data.files || []);
        } catch (e: any) {
            setAttachError(e.message || 'Failed to load files');
        }
    };

    const handleFileSelect = async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        if (!apiBase) { setAttachError('Server not connected'); return; }
        setAttachError(null);
        setIsUploading(true);
        try {
            const form = new FormData();
            Array.from(files).forEach(f => form.append('files', f));
            const r = await fetch(`${apiBase}/api/files`, { method: 'POST', body: form });
            if (!r.ok) throw new Error(await r.text());
            await refreshServerFiles();
        } catch (e: any) {
            setAttachError(e.message || 'Upload failed');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const toggleAttachOpen = () => {
        const next = !isAttachOpen;
        setIsAttachOpen(next);
        if (next) refreshServerFiles();
    };

    // Close attach panel when clicking outside or pressing Escape
    useEffect(() => {
        if (!isAttachOpen) return;
        const onDocClick = (e: MouseEvent) => {
            const panel = attachPanelRef.current;
            const btn = attachButtonRef.current;
            const target = e.target as Node | null;
            if (!panel || !target) return;
            if (panel.contains(target)) return;
            if (btn && btn.contains(target)) return;
            setIsAttachOpen(false);
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsAttachOpen(false);
        };
        document.addEventListener('mousedown', onDocClick);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDocClick);
            document.removeEventListener('keydown', onKey);
        };
    }, [isAttachOpen]);

    const toggleFile = (name: string) => {
        if (attachedFiles.includes(name)) onSetAttachedFiles(attachedFiles.filter(n => n !== name));
        else onSetAttachedFiles([...attachedFiles, name]);
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
                onImportConversations={onImportConversations}
                chatModel={chatModel}
                onSetChatModel={onSetChatModel}
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
                    <div className="flex items-start gap-3 bg-gray-900/50 border border-gray-700 rounded-lg p-2 focus-within:ring-2 focus-within:ring-red-500 transition-shadow relative">
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
                        <div className="flex flex-col items-center gap-2 self-end">
                          <button
                            ref={attachButtonRef}
                            onClick={toggleAttachOpen}
                            title="Attach files"
                            aria-label="Attach files"
                            className={`rounded-md p-2 ${isAttachOpen ? 'bg-gray-700 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
                          >
                            <PaperclipIcon />
                          </button>
                          {attachedFiles.length > 0 && (
                            <div className="text-xs text-gray-400">{attachedFiles.length} attached</div>
                          )}
                        </div>
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

                        {isAttachOpen && (
                          <div ref={attachPanelRef} className="absolute bottom-14 right-2 w-96 max-h-80 overflow-auto bg-gray-900 border border-gray-700 rounded-lg shadow-xl p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="text-sm text-white">Uploaded files</div>
                              <button className="text-xs text-gray-300 hover:text-white" onClick={refreshServerFiles}>Refresh</button>
                            </div>
                            <div className="flex items-center gap-2">
                              <input ref={fileInputRef} type="file" multiple className="hidden" id="chatFileInput" onChange={(e) => handleFileSelect(e.target.files)} />
                              <label htmlFor="chatFileInput" className="px-2 py-1 bg-red-600 text-white rounded text-xs cursor-pointer">Choose Files</label>
                              {isUploading && <span className="text-xs text-gray-400">Uploading…</span>}
                            </div>
                            {attachError && (<div className="text-xs text-red-300">{attachError}</div>)}
                            <ul className="space-y-1 mt-1">
                              {serverFiles.map(f => (
                                <li key={f.name}>
                                  <label className="flex items-center gap-2 text-sm text-gray-200">
                                    <input type="checkbox" checked={attachedFiles.includes(f.name)} onChange={() => toggleFile(f.name)} />
                                    <span className="truncate">{f.name}</span>
                                    <span className="text-xs text-gray-500">{(f.size/1024).toFixed(1)} KB</span>
                                  </label>
                                  <div className="mt-1 flex gap-2">
                                    <button className="text-xs text-gray-300 hover:text-white underline" onClick={() => openInCanvas(f.name)}>Open in Canvas</button>
                                    <a className="text-xs text-red-400 hover:text-red-200 underline" href={`${apiBase}/api/files/${encodeURIComponent(f.name)}`} target="_blank" rel="noreferrer">Open</a>
                                  </div>
                                </li>
                              ))}
                              {serverFiles.length === 0 && (<li className="text-xs text-gray-500">No files uploaded yet.</li>)}
                            </ul>
                          </div>
                        )}
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
