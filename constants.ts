import { NavItem } from './types';
import { HomeIcon, BookOpen, HeartCrack, PenSquare, CalendarDays, Globe, MessageSquareIcon, MicIcon, UploadIcon } from './components/Icons';

export const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Home', icon: HomeIcon },
  { id: 'chat', label: 'Chat', icon: MessageSquareIcon },
  { id: 'live_chat', label: 'Live Chat', icon: MicIcon },
  { id: 'diary', label: 'Elira\'s Diary', icon: BookOpen },
  { id: 'secret_diary', label: 'Secret Diary', icon: HeartCrack },
  { id: 'griffes', label: 'Griffes & Mémoire', icon: PenSquare },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'world_state', label: 'World State', icon: Globe },
  { id: 'uploads', label: 'Uploads', icon: UploadIcon },
];
