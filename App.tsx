import React, { useState, useRef, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { DiaryView } from './components/DiaryView';
import { SecretDiaryView } from './components/SecretDiaryView';
import { GriffesView } from './components/GriffesView';
import { CalendarView } from './components/CalendarView';
import { WorldStateView } from './components/WorldStateView';
import { HomeView } from './components/HomeView';
import { ChatView } from './components/ChatView';
import { LiveChatView } from './components/LiveChatView';
import { FileEditModal } from './components/FileEditModal';
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

    // --- Chat State ---
    const [conversations, setConversations] = useState<ChatConversation[]>([]);
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
    const [isChatLoading, setIsChatLoading] = useState(false);
    const [chatError, setChatError] = useState<string | null>(null);
    const saveTimeoutRef = useRef<number | null>(null);

    // Function to get data from localStorage or fetch from file
    const loadData = async (filename: EditableFile, setter: (text: string) => void) => {
        const storageKey = `elira-mem-${filename}`;
        const storedData = localStorage.getItem(storageKey);
        if (storedData) {
            setter(storedData);
        } else {
            try {
                const response = await fetch(`/data/${filename}`);
                const text = await response.text();
                setter(text);
            } catch (error) {
                 console.error(`Failed to load ${filename}:`, error);
                setChatError(`I'm having trouble reading my memory file: ${filename}.`);
            }
        }
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
        if (!process.env.API_KEY) {
            const errorMessage = "I can't connect to my brain... The API key is missing.";
            console.error(errorMessage);
            setChatError(errorMessage);
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
            // Persist to localStorage
            const storageKey = `elira-mem-${filename}`;
            localStorage.setItem(storageKey, content);
            
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

        const ai = getAiInstance();
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

    const renderView = () => {
        switch (currentView) {
            case 'chat':
                return <ChatView conversations={conversations} activeConversationId={activeConversationId} onSelectConversation={setActiveConversationId} onNewChat={startNewChat} onDeleteConversation={deleteConversation} onSendMessage={handleSendMessage} isLoading={isChatLoading} error={chatError} onImportConversations={handleImportConversations} chatModel={chatModel} onSetChatModel={setChatModel} />;
            case 'live_chat':
                return <LiveChatView getAiInstance={getAiInstance} setCurrentView={setCurrentView} systemInstruction={getFullSystemInstruction()} />;
            case 'diary':
                return <DiaryView diaryData={diaryState} />;
            case 'secret_diary':
                return <SecretDiaryView secretDiaryData={secretDiaryState} />;
            case 'griffes':
                return <GriffesView griffesData={griffesState} />;
            case 'calendar':
                return <CalendarView calendarData={calendarState} />;
            case 'world_state':
                return <WorldStateView worldStateData={worldState} />;
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
        </div>
    );
};

export default App;