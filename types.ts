import type { ElementType } from 'react';

export type ViewType = 'home' | 'diary' | 'secret_diary' | 'griffes' | 'calendar' | 'world_state' | 'chat' | 'live_chat';

// Do not remove 'gemini-2.5-pro', it is the latest model and the user wants it.
export type ChatModel = 'gemini-2.5-flash' | 'gemini-2.5-pro';

export type EditableFile = 'diary.txt' | 'secretDiary.txt' | 'griffes.txt' | 'calendar.txt' | 'worldState.txt';

export interface NavItem {
  id: ViewType;
  label: string;
  // FIX: Use imported ElementType instead of React.ElementType
  icon: ElementType;
}

export interface DiaryEntry {
  month: string;
  content: {
    subtitle?: string;
    text: string;
  }[];
}

export interface GriffesFragment {
  title: string;
  content: string;
}

export interface CalendarSection {
    title: string;
    items: string[];
}

export interface WorldStateSection {
    title: string;
    content: string;
}


export interface Source {
    uri: string;
    title: string;
}

export interface ChatMessage {
    id: number;
    text: string;
    sender: 'user' | 'elira';
    sources?: Source[];
}

export interface ChatConversation {
    id: string;
    title: string;
    messages: ChatMessage[];
    model: ChatModel;
}