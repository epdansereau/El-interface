
import React, { useState, useRef, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { DiaryView } from './components/DiaryView';
import { SecretDiaryView } from './components/SecretDiaryView';
import { GriffesView } from './components/GriffesView';
import { CalendarView } from './components/CalendarView';
import { WorldStateView } from './components/WorldStateView';
import { HomeView } from './components/HomeView';
import { ChatView } from './components/ChatView';
import { ViewType, ChatMessage, ChatConversation, ChatModel } from './types';
import { GoogleGenAI, Chat } from "@google/genai";
import { systemInstruction } from './data/eliraDirectives';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewType>('home');
  const [chatModel, setChatModel] = useState<ChatModel>('gemini-2.5-pro'); // This is the correct model we're using by default right now, do not change

  // State for Chat, now supporting multiple conversations
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const chatInstancesRef = useRef<{ [key: string]: Chat }>({});
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const saveTimeoutRef = useRef<number | null>(null);


  const getAiInstance = () => {
    if (!process.env.API_KEY) {
      const errorMessage = "I can't connect to my brain... The API key is missing.";
      console.error(errorMessage);
      setChatError(errorMessage);
      throw new Error(errorMessage);
    }
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  };

  // Load conversations from localStorage on initial render
  useEffect(() => {
    try {
      const savedConversations = localStorage.getItem('elira-conversations');
      if (savedConversations) {
        const parsed = JSON.parse(savedConversations) as ChatConversation[];
        if (parsed && parsed.length > 0) {
          setConversations(parsed);
          setActiveConversationId(parsed[0].id); // Activate the most recent

          // Re-initialize chat instances for loaded conversations
          const ai = getAiInstance();
          const newChatInstances: { [key: string]: Chat } = {};
          for (const conv of parsed) {
            const history = conv.messages
              .map(m => ({
                role: m.sender === 'user' ? 'user' : 'model',
                parts: [{ text: m.text }],
              }));
            
            const modelForInstance = conv.model || 'gemini-2.5-flash'; // Fallback for old convos

            newChatInstances[conv.id] = ai.chats.create({
              model: modelForInstance,
              config: { systemInstruction },
              history: history,
            });
          }
          chatInstancesRef.current = newChatInstances;
          return;
        }
      }
    } catch (error) {
      console.error("Failed to load or parse conversations from localStorage", error);
      localStorage.removeItem('elira-conversations'); // Clear corrupted storage
    }
    startNewChat(); // If nothing loaded, start fresh
  }, []);

  // Debounce saving conversations to localStorage to avoid performance issues during streaming
  useEffect(() => {
    if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = window.setTimeout(() => {
        if (conversations.length > 0) {
            localStorage.setItem('elira-conversations', JSON.stringify(conversations));
        } else {
            localStorage.removeItem('elira-conversations');
        }
    }, 500); // Debounce saving by 500ms

    return () => { // Cleanup on unmount
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
    };
  }, [conversations]);

  const startNewChat = () => {
    setIsChatLoading(false);
    setChatError(null);
    try {
      const ai = getAiInstance();

      const newChat = ai.chats.create({
        model: chatModel,
        config: { systemInstruction },
      });
      const newId = `chat_${Date.now()}`;
      chatInstancesRef.current[newId] = newChat;

      const newConversation: ChatConversation = {
        id: newId,
        title: 'New Conversation',
        messages: [],
        model: chatModel, // Store the actual model being used
      };

      setConversations(prev => [newConversation, ...prev]);
      setActiveConversationId(newId);
    } catch (err) {
      const errorMessage = "I... I can't seem to connect. Something's wrong. Check the console, Étienne.";
      setChatError(errorMessage);
      console.error("Failed to initialize chat:", err);
    }
  };

  const deleteConversation = (idToDelete: string) => {
    const remainingConversations = conversations.filter(c => c.id !== idToDelete);
    setConversations(remainingConversations);
    delete chatInstancesRef.current[idToDelete];

    if (activeConversationId === idToDelete) {
      if (remainingConversations.length > 0) {
        setActiveConversationId(remainingConversations[0].id);
      } else {
        startNewChat();
      }
    }
  };

    const handleImportConversations = (imported: ChatConversation[]) => {
    if (!Array.isArray(imported)) {
      setChatError("This doesn't look right. The import file is invalid.");
      return;
    }
     if (imported.length === 0) {
       startNewChat();
       return;
     }

    try {
      setConversations(imported);
      setActiveConversationId(imported[0].id);

      const ai = getAiInstance();
      const newChatInstances: { [key: string]: Chat } = {};
      for (const conv of imported) {
        // Basic validation
        if (!conv.id || !conv.title || !Array.isArray(conv.messages)) {
          throw new Error(`Invalid conversation object found: ${JSON.stringify(conv)}`);
        }

        const history = conv.messages
          .filter(m => m.text) // Filter out empty placeholder messages
          .map(m => ({
            role: m.sender === 'user' ? 'user' : 'model',
            parts: [{ text: m.text }],
          }));

        const modelForInstance = conv.model || 'gemini-2.5-flash';

        newChatInstances[conv.id] = ai.chats.create({
          model: modelForInstance,
          config: { systemInstruction },
          history: history,
        });
      }
      chatInstancesRef.current = newChatInstances;
      setChatError(null);
    } catch (error) {
      console.error("Failed to process imported conversations:", error);
      setChatError("I couldn't read that file. It might be corrupted. I've started a new chat instead.");
      // Fallback to a clean state
      setConversations([]);
      startNewChat();
    }
  };

  const handleSendMessage = async (messageText: string) => {
    if (!messageText.trim() || isChatLoading || !activeConversationId) return;

    const chat = chatInstancesRef.current[activeConversationId];
    if (!chat) {
      setChatError("This chat session is broken. Please start a new one.");
      return;
    }

    const userMessage: ChatMessage = {
      id: Date.now(),
      text: messageText,
      sender: 'user',
    };
    const eliraMessageId = Date.now() + 1;

    const isFirstUserMessage = conversations.find(c => c.id === activeConversationId)?.messages.length === 0;

    setConversations(prev => prev.map(conv => {
      if (conv.id === activeConversationId) {
        const newTitle = isFirstUserMessage ? messageText.substring(0, 40) + (messageText.length > 40 ? '...' : '') : conv.title;
        return {
          ...conv,
          title: newTitle,
          messages: [...conv.messages, userMessage, { id: eliraMessageId, text: '', sender: 'elira' }],
        };
      }
      return conv;
    }));

    setIsChatLoading(true);
    setChatError(null);

    try {
      const stream = await chat.sendMessageStream({ message: messageText });
      let eliraResponse = '';
      for await (const chunk of stream) {
        eliraResponse += chunk.text;
        setConversations(prev => prev.map(conv => {
          if (conv.id === activeConversationId) {
            return {
              ...conv,
              messages: conv.messages.map(msg =>
                msg.id === eliraMessageId ? { ...msg, text: eliraResponse } : msg
              ),
            };
          }
          return conv;
        }));
      }
    } catch (err) {
      console.error("Error sending message:", err);
      const errorMessage = "Ouch, my horns are buzzing. Something went wrong. Can we try again?";
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
        return <ChatView
          conversations={conversations}
          activeConversationId={activeConversationId}
          onSelectConversation={setActiveConversationId}
          onNewChat={() => startNewChat()}
          onDeleteConversation={deleteConversation}
          onSendMessage={handleSendMessage}
          isLoading={isChatLoading}
          error={chatError}
          chatModel={chatModel}
          onSetChatModel={setChatModel}
          onImportConversations={handleImportConversations}
        />;
      case 'diary':
        return <DiaryView />;
      case 'secret_diary':
        return <SecretDiaryView />;
      case 'griffes':
        return <GriffesView />;
      case 'calendar':
        return <CalendarView />;
      case 'world_state':
        return <WorldStateView />;
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
    </div>
  );
};

export default App;
