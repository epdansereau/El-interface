import type { ElementType } from 'react';

export type ViewType = 'home' | 'diary' | 'secret_diary' | 'griffes' | 'calendar' | 'world_state' | 'chat';

export type ChatModel = 'gemini-2.5-pro' | 'gemini-2.5-flash';

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

export interface ChatMessage {
    id: number;
    text: string;
    sender: 'user' | 'elira';
}

export interface ChatConversation {
    id: string;
    title: string;
    messages: ChatMessage[];
    model: ChatModel;
}