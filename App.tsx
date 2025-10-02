import React, { useState, useRef, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { DiaryView } from './components/DiaryView';
import { SecretDiaryView } from './components/SecretDiaryView';
import { GriffesView } from './components/GriffesView';
import { CalendarView } from './components/CalendarView';
import { WorldStateView } from './components/WorldStateView';
import { HomeView } from './components/HomeView';
import { ChatView } from './components/ChatView';
import { UploadsView } from './components/UploadsView';
import { LiveChatView } from './components/LiveChatView';
import { FileEditModal } from './components/FileEditModal';
import { EditCanvas, EditProposal } from './components/EditCanvas';
import { ViewType, ChatMessage, ChatConversation, ChatModel, Source, EditableFile, DiaryEntry, GriffesFragment, CalendarSection, WorldStateSection } from './types';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { systemInstruction as baseSystemInstruction } from './data/eliraDirectives';
import { textToDiary, textToGriffes, textToCalendar, textToWorldState } from './utils/converters';


const App: React.FC = () => {
    const [currentView, setCurrentView] = useState<ViewType>('home');
    const [chatModel, setChatModel] = useState<ChatModel>('gemini-2.5-pro');

    // --- Core Data as State ---
    // Raw text content
    const [diaryText, setDiaryText] = useState('');
    const [secretDiaryText, setSecretDiaryText] = useState('');
    const [griffesText, setGriffesText] = useState('');
    const [calendarText, setCalendarText] = useState('');
    const [worldStateText, setWorldStateText] = useState('');
    
    // Parsed data structures
    const [diaryState, setDiaryState] = useState<DiaryEntry[]>([]);
    const [secretDiaryState, setSecretDiaryState] = useState<DiaryEntry[]>([]);
    const [griffesState, setGriffesState] = useState<GriffesFragment[]>([]);
    const [calendarState, setCalendarState] = useState<CalendarSection[]>([]);
    const [worldState, setWorldState] = useState<WorldStateSection[]>([]);

    // --- Editor Modal State ---
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingFile, setEditingFile] = useState<EditableFile | null>(null);
    const [editingFileContent, setEditingFileContent] = useState('');
    const [editError, setEditError] = useState<string | null>(null);
    const [proposals, setProposals] = useState<EditProposal[]>([]);

    // --- Chat State ---
    const [conversations, setConversations] = useState<ChatConversation[]>([]);
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
    const [isChatLoading, setIsChatLoading] = useState(false);
    const [chatError, setChatError] = useState<string | null>(null);
    const saveTimeoutRef = useRef<number | null>(null);
    const [attachedFiles, setAttachedFiles] = useState<string[]>([]);

    // Function to load from server when available; otherwise fallback to localStorage/bundled
    const serverUrl = (import.meta as any).env?.VITE_SERVER_URL || '';
    const apiBase = serverUrl.replace(/\/$/, '');
    const loadData = async (filename: EditableFile, setter: (text: string) => void) => {
        const storageKey = `elira-mem-${filename}`;
        const tryServer = async (): Promise<string | null> => {
            if (!apiBase) return null;
            try {
                const r = await fetch(`${apiBase}/api/core/${filename}`);
                if (r.ok) return await r.text();
                return null;
            } catch { return null; }
        };
        const tryBundled = async (): Promise<string | null> => {
            try {
                const r = await fetch(`/data/${filename}`);
                if (r.ok) return await r.text();
                return null;
            } catch { return null; }
        };
        const fromServer = await tryServer();
        if (fromServer !== null) {
            setter(fromServer);
            localStorage.setItem(storageKey, fromServer);
            return;
        }
        const storedData = localStorage.getItem(storageKey);
        if (storedData) { setter(storedData); return; }
        const bundled = await tryBundled();
        if (bundled !== null) { setter(bundled); return; }
        console.error(`Failed to load ${filename}`);
        setChatError(`I'm having trouble reading my memory file: ${filename}.`);
    };

    // Initial data load from localStorage or .txt files
    useEffect(() => {
        loadData('diary.txt', setDiaryText);
        loadData('secretDiary.txt', setSecretDiaryText);
        loadData('griffes.txt', setGriffesText);
        loadData('calendar.txt', setCalendarText);
        loadData('worldState.txt', setWorldStateText);
    }, []);

    // Re-parse data when text changes
    useEffect(() => setDiaryState(textToDiary(diaryText)), [diaryText]);
    useEffect(() => setSecretDiaryState(textToDiary(secretDiaryText)), [secretDiaryText]);
    useEffect(() => setGriffesState(textToGriffes(griffesText)), [griffesText]);
    useEffect(() => setCalendarState(textToCalendar(calendarText)), [calendarText]);
    useEffect(() => setWorldState(textToWorldState(worldStateText)), [worldStateText]);

    // Dynamically build the system instruction on every render to ensure it's always up-to-date
    const getFullSystemInstruction = () => [
        baseSystemInstruction,
        "\n\n## Elira's Diary (diary.txt)\n\n" + diaryText,
        "\n\n## Elira's Secret Diary (secretDiary.txt)\n\n" + secretDiaryText,
        "\n\n## Griffes & Mémoire (griffes.txt)\n\n" + griffesText,
        "\n\n## Étienne's Calendar (calendar.txt)\n\n" + calendarText,
        "\n\n## World State Briefing (worldState.txt)\n\n" + worldStateText,
    ].join('');

    const getAiInstance = () => {
        // Deprecated path (Studio legacy). In server mode, refuse.
        if (!process.env.API_KEY || apiBase) {
            const errorMessage = "Client key disabled. Use server /api/chat.";
            console.warn(errorMessage);
            throw new Error(errorMessage);
        }
        return new GoogleGenAI({ apiKey: process.env.API_KEY });
    };
    
    // --- File Editor Handlers ---
    const handleOpenEditor = (filename: EditableFile, newContent: string) => {
        setEditError(null);
        setEditingFileContent(newContent);
        setEditingFile(filename);
        setIsEditModalOpen(true);
    };

    const handleSaveEditor = async (filename: EditableFile, content: string) => {
        setEditError(null);
        try {
            if (content.trim() === '') {
                throw new Error("I can't save an empty memory file. That feels... wrong.");
            }
            // Update state
            switch(filename) {
                case 'diary.txt': setDiaryText(content); break;
                case 'secretDiary.txt': setSecretDiaryText(content); break;
                case 'griffes.txt': setGriffesText(content); break;
                case 'calendar.txt': setCalendarText(content); break;
                case 'worldState.txt': setWorldStateText(content); break;
            }
            // Persist to server if available, else localStorage
            if (apiBase) {
                const resp = await fetch(`${apiBase}/api/core/${filename}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content })
                });
                if (!resp.ok) {
                    const t = await resp.text();
                    throw new Error(`Server refused to save: ${t}`);
                }
            } else {
                const storageKey = `elira-mem-${filename}`;
                localStorage.setItem(storageKey, content);
            }
            
            setIsEditModalOpen(false);
        } catch (e: any) {
            console.error("Failed to save file content:", e);
            setEditError(e.message);
        }
    };

    const handleCloseEditor = () => {
        setIsEditModalOpen(false);
        setEditingFile(null);
        setEditingFileContent('');
        setEditError(null);
    };


    useEffect(() => {
        try {
            const savedConversations = localStorage.getItem('elira-conversations');
            if (savedConversations) {
                const parsed = JSON.parse(savedConversations) as ChatConversation[];
                if (parsed && parsed.length > 0) {
                    setConversations(parsed);
                    setActiveConversationId(parsed[0].id);
                    if (parsed[0].model) setChatModel(parsed[0].model);
                    return;
                }
            }
        } catch (error) {
            console.error("Failed to load or parse conversations from localStorage", error);
            localStorage.removeItem('elira-conversations');
        }
        startNewChat();
    }, []);

    useEffect(() => {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = window.setTimeout(() => {
            if (conversations.length > 0) {
                localStorage.setItem('elira-conversations', JSON.stringify(conversations));
            } else {
                localStorage.removeItem('elira-conversations');
            }
        }, 500);
        return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
    }, [conversations]);

    const startNewChat = () => {
        setIsChatLoading(false);
        setChatError(null);
        const newId = `chat_${Date.now()}`;
        const newConversation: ChatConversation = { id: newId, title: 'New Conversation', messages: [], model: chatModel };
        setConversations(prev => [newConversation, ...prev]);
        setActiveConversationId(newId);
    };

    const deleteConversation = (idToDelete: string) => {
        const remaining = conversations.filter(c => c.id !== idToDelete);
        setConversations(remaining);
        if (activeConversationId === idToDelete) {
            setActiveConversationId(remaining.length > 0 ? remaining[0].id : null);
            if (remaining.length === 0) startNewChat();
        }
    };

    const handleImportConversations = (imported: ChatConversation[]) => {
        if (!Array.isArray(imported) || imported.length === 0) {
            setChatError("This doesn't look right. The import file is invalid.");
            if (conversations.length === 0) startNewChat();
            return;
        }
        setConversations(imported);
        setActiveConversationId(imported[0].id);
        setChatError(null);
    };

    const handleSendMessage = async (messageText: string, useWebSearch: boolean) => {
        const fullSystemInstruction = getFullSystemInstruction();
        if (!messageText.trim() || isChatLoading || !activeConversationId || !fullSystemInstruction) return;

        const activeConv = conversations.find(c => c.id === activeConversationId);
        if (!activeConv) {
            setChatError("This chat session is broken. Please start a new one.");
            return;
        }

        // Prepare user message
        const userMessage: ChatMessage = { id: Date.now(), text: messageText, sender: 'user' };
        const eliraMessageId = Date.now() + 1;
        const isFirstUserMessage = activeConv.messages.length === 0;

        setConversations(prev => prev.map(conv => {
            if (conv.id === activeConversationId) {
                const newTitle = isFirstUserMessage ? messageText.substring(0, 40) + (messageText.length > 40 ? '...' : '') : conv.title;
                return { ...conv, title: newTitle, messages: [...conv.messages, userMessage, { id: eliraMessageId, text: '', sender: 'elira' }], model: chatModel };
            }
            return conv;
        }));

        setIsChatLoading(true);
        setChatError(null);

        try {
            const history = activeConv.messages.map(m => ({
                role: m.sender === 'user' ? 'user' : 'model',
                parts: [{ text: m.text }],
            }));
            const contents = [...history, { role: 'user', parts: [{ text: messageText }] }];
            const config: { systemInstruction: string; tools?: any[] } = { systemInstruction: fullSystemInstruction };
            if (useWebSearch) config.tools = [{ googleSearch: {} }];

            if (apiBase) {
                // Server mode: stream over SSE for responsiveness
                const chooseProvider = (m: string) => {
                    const ml = m.toLowerCase();
                    if (ml.startsWith('gemini')) return 'gemini';
                    if (ml.startsWith('gpt-')) return 'openai';
                    if (ml.startsWith('llama') || ml.startsWith('qwen') || ml.startsWith('mistral')) return 'ollama';
                    return 'openai';
                };
                const provider = chooseProvider(activeConv.model);
                const msgs = [...activeConv.messages, userMessage].map(m => ({ role: m.sender === 'user' ? 'user' : 'model', text: m.text }));
                const resp = await fetch(`${apiBase}/api/chat/stream`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ provider, model: activeConv.model, messages: msgs, systemInstruction: fullSystemInstruction })
                });
                if (!resp.ok || !resp.body) throw new Error(`Chat server error: ${resp.status}`);
                const reader = resp.body.getReader();
                const decoder = new TextDecoder();
                let eliraResponse = '';
                let buffer = '';
                const applyUpdate = (text: string) => {
                    eliraResponse += text;
                    setConversations(prev => prev.map(conv => conv.id === activeConversationId ? { ...conv, messages: conv.messages.map(msg => msg.id === eliraMessageId ? { ...msg, text: eliraResponse } : msg) } : conv));
                };
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    buffer += decoder.decode(value, { stream: true });
                    // Split SSE events by double newline
                    const events = buffer.split('\n\n');
                    buffer = events.pop() || '';
                    for (const evt of events) {
                        const lines = evt.split('\n');
                        let dataPayload = '';
                        for (const ln of lines) {
                            const l = ln.trim();
                            if (l.startsWith('data:')) dataPayload += l.slice(5).trim();
                        }
                        if (!dataPayload) continue;
                        try {
                            const obj = JSON.parse(dataPayload);
                            if (obj.error) throw new Error(obj.error);
                            if (obj.text) applyUpdate(obj.text);
                            if (obj.done) extractAndQueueProposals(eliraResponse);
                        } catch {
                            // ignore malformed JSON fragments
                        }
                    }
                }
                // Fallback: if no text accumulated (SSE parse issue), fetch non-stream once
                if (!eliraResponse) {
                    const r2 = await fetch(`${apiBase}/api/chat`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ provider, model: activeConv.model, messages: msgs, systemInstruction: fullSystemInstruction })
                    });
                    if (r2.ok) {
                        const d2 = await r2.json();
                        if (d2 && d2.text) {
                            eliraResponse = d2.text;
                            setConversations(prev => prev.map(conv => conv.id === activeConversationId ? { ...conv, messages: conv.messages.map(msg => msg.id === eliraMessageId ? { ...msg, text: eliraResponse } : msg) } : conv));
                            extractAndQueueProposals(eliraResponse);
                        }
                    }
                }
                return;
            }

            // Legacy client mode (Gemini Studio)
            const ai = getAiInstance();
            const stream = await ai.models.generateContentStream({ model: activeConv.model, contents, config });
            
            let eliraResponse = '';
            let accumulatedText = '';
            let isEditCommand = false;
            let editContent = '';
            const sources: Source[] = [];
            const collectedUris = new Set<string>();
            let lastChunk: GenerateContentResponse | null = null;
            const editCommandRegex = /elira --edit ([\w.]+\.txt) <<EOF\n([\s\S]*)/;
            const editCommandEndRegex = /([\s\S]*?)\nEOF/;

            for await (const chunk of stream) {
                lastChunk = chunk;
                const chunkText = chunk.text;
                accumulatedText += chunkText;

                if (!isEditCommand) {
                    const match = editCommandRegex.exec(accumulatedText);
                    if (match && match[1] && match[2] !== undefined) {
                        isEditCommand = true;
                        const filename = match[1] as EditableFile;
                        const initialContent = match[2];
                        eliraResponse = accumulatedText.substring(0, match.index).trim();
                        editContent = initialContent;
                        
                        // Open editor immediately
                        handleOpenEditor(filename, initialContent);
                        
                        // Update conversational part of the message
                        setConversations(prev => prev.map(conv => conv.id === activeConversationId ? { ...conv, messages: conv.messages.map(msg => msg.id === eliraMessageId ? { ...msg, text: eliraResponse } : msg) } : conv));

                    } else {
                        eliraResponse += chunkText;
                         setConversations(prev => prev.map(conv => conv.id === activeConversationId ? { ...conv, messages: conv.messages.map(msg => msg.id === eliraMessageId ? { ...msg, text: eliraResponse } : msg) } : conv));
                    }
                } else {
                    // We are in edit mode, stream content to the editor
                    editContent += chunkText;
                    // Check if we've reached the end of the command block
                    const endMatch = editCommandEndRegex.exec(editContent);
                    if (endMatch) {
                        // Final content, without EOF
                        setEditingFileContent(endMatch[1]);
                    } else {
                        // Stream intermediate content
                        setEditingFileContent(editContent);
                    }
                }

                const groundingChunks = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks;
                if (groundingChunks) {
                    for (const gc of groundingChunks) {
                        if (gc.web && !collectedUris.has(gc.web.uri)) {
                            sources.push({ uri: gc.web.uri, title: gc.web.title || gc.web.uri });
                            collectedUris.add(gc.web.uri);
                        }
                    }
                }
            }
            
            const finishReason = lastChunk?.candidates?.[0]?.finishReason;
            if (finishReason && finishReason !== 'STOP' && finishReason !== 'FINISH_REASON_UNSPECIFIED') {
                 let reasonMessage = `\n\n[My train of thought was interrupted. Reason: **${finishReason}**.`;
                if (finishReason === 'SAFETY') {
                    const safetyRatings = lastChunk?.candidates?.[0]?.safetyRatings;
                    const blockedCategories = safetyRatings
                        ?.filter(r => r.probability === 'HIGH' || r.probability === 'MEDIUM')
                        .map(r => r.category.replace('HARM_CATEGORY_', ''))
                        .join(', ');
                    if (blockedCategories) {
                        reasonMessage += ` I think I was blocked for discussing sensitive topics: ${blockedCategories}.`;
                    }
                }
                reasonMessage += " This can happen sometimes. Let's try a different approach.]";
                eliraResponse += reasonMessage;
            }

            setConversations(prev => prev.map(conv => conv.id === activeConversationId ? { ...conv, messages: conv.messages.map(msg => msg.id === eliraMessageId ? { ...msg, text: eliraResponse.trim(), sources: sources } : msg) } : conv));

        } catch (err: any) {
            console.error("Error sending message:", err);
            const detailedError = err.message || 'An unknown error occurred.';
            const errorMessage = `Ouch, my horns are buzzing. Something went wrong (${detailedError}). Can we try again?`;
            setChatError(errorMessage);
            setConversations(prev => prev.map(conv => {
                if (conv.id === activeConversationId) {
                    const newMessages = conv.messages.filter(msg => msg.id !== eliraMessageId);
                    newMessages.push({ id: Date.now(), text: errorMessage, sender: 'elira' });
                    return { ...conv, messages: newMessages };
                }
                return conv;
            }));
        } finally {
            setIsChatLoading(false);
        }
    };

    // Extract proposals from fenced code blocks like ```json elira_edit\n{...}\n```
    const extractAndQueueProposals = (text: string) => {
        const fenceRe = /```json\s+elira_edit\n([\s\S]*?)```/g;
        let m: RegExpExecArray | null;
        const found: EditProposal[] = [];
        while ((m = fenceRe.exec(text)) !== null) {
            try {
                const obj = JSON.parse(m[1]);
                if (obj && obj.file && (obj.content || obj.diff)) {
                    const p: EditProposal = {
                        id: `${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
                        file: obj.file,
                        mode: obj.mode === 'patch' && obj.diff ? 'patch' : 'replace',
                        content: obj.content,
                        diff: obj.diff,
                        note: obj.note,
                    };
                    found.push(p);
                }
            } catch {}
        }
        if (found.length) setProposals(prev => [...found, ...prev]);
    };

    const handleApplyProposal = async (p: EditProposal, commit?: { enabled: boolean; message?: string }) => {
        if (!apiBase) { setEditError('Server not connected; cannot apply.'); return; }
        let resp: Response;
        if (p.mode === 'patch' && p.diff) {
            resp = await fetch(`${apiBase}/api/diff/apply`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ file: p.file, diff: p.diff, commitMessage: commit?.enabled ? (commit?.message || undefined) : undefined })
            });
        } else {
            resp = await fetch(`${apiBase}/api/core/${p.file}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: p.content, commitMessage: commit?.enabled ? (commit?.message || undefined) : undefined })
            });
        }
        if (!resp.ok) {
            const t = await resp.text();
            setEditError(`Server refused: ${t}`);
            return;
        }
        if (p.mode === 'replace') await handleSaveEditor(p.file, p.content || '');
        else {
            // Reload latest after patch
            await loadData(p.file, (text) => {
                switch(p.file) {
                    case 'diary.txt': setDiaryText(text); break;
                    case 'secretDiary.txt': setSecretDiaryText(text); break;
                    case 'griffes.txt': setGriffesText(text); break;
                    case 'calendar.txt': setCalendarText(text); break;
                    case 'worldState.txt': setWorldStateText(text); break;
                }
            });
        }
        setProposals(prev => prev.filter(x => x.id !== p.id));
    };

    const handleDiscardProposal = (id: string) => {
        setProposals(prev => prev.filter(x => x.id !== id));
    };

    const renderView = () => {
        switch (currentView) {
            case 'chat':
                return <ChatView conversations={conversations} activeConversationId={activeConversationId} onSelectConversation={setActiveConversationId} onNewChat={startNewChat} onDeleteConversation={deleteConversation} onSendMessage={handleSendMessage} isLoading={isChatLoading} error={chatError} onImportConversations={handleImportConversations} chatModel={chatModel} onSetChatModel={setChatModel} attachedFiles={attachedFiles} onSetAttachedFiles={setAttachedFiles} apiBase={apiBase} />;
            case 'uploads':
                return <UploadsView apiBase={apiBase} />;
            case 'live_chat':
                return <LiveChatView getAiInstance={getAiInstance} setCurrentView={setCurrentView} systemInstruction={getFullSystemInstruction()} />;
            case 'diary':
                return <DiaryView diaryData={diaryState} onEdit={() => handleOpenEditor('diary.txt', diaryText)} />;
            case 'secret_diary':
                return <SecretDiaryView secretDiaryData={secretDiaryState} onEdit={() => handleOpenEditor('secretDiary.txt', secretDiaryText)} />;
            case 'griffes':
                return <GriffesView griffesData={griffesState} onEdit={() => handleOpenEditor('griffes.txt', griffesText)} />;
            case 'calendar':
                return <CalendarView calendarData={calendarState} onEdit={() => handleOpenEditor('calendar.txt', calendarText)} />;
            case 'world_state':
                return <WorldStateView worldStateData={worldState} onEdit={() => handleOpenEditor('worldState.txt', worldStateText)} />;
            case 'home':
            default:
                return <HomeView />;
        }
    };

    return (
        <div className="flex h-screen bg-black bg-opacity-30 backdrop-blur-sm">
            <Sidebar currentView={currentView} setCurrentView={setCurrentView} />
            <main className="flex-1 overflow-y-auto p-4 sm:p-8">
                {renderView()}
            </main>
            <FileEditModal 
                isOpen={isEditModalOpen}
                onClose={handleCloseEditor}
                onSave={handleSaveEditor}
                filename={editingFile}
                initialContent={editingFileContent}
                error={editError}
                onContentChange={setEditingFileContent}
            />
            <EditCanvas proposals={proposals} onApply={handleApplyProposal} onDiscard={handleDiscardProposal} isServerConnected={!!apiBase} />
        </div>
    );
};

export default App;
