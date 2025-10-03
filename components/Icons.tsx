import React from 'react';

const iconProps = {
  className: "h-5 w-5",
  strokeWidth: "2",
  fill: "none",
  strokeLinecap: "round" as "round",
  strokeLinejoin: "round" as "round",
  stroke: "currentColor"
};

export const HomeIcon: React.FC = () => (
  <svg {...iconProps} viewBox="0 0 24 24">
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

export const BookOpen: React.FC = () => (
  <svg {...iconProps} viewBox="0 0 24 24">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </svg>
);

export const HeartCrack: React.FC = () => (
  <svg {...iconProps} viewBox="0 0 24 24">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    <path d="m15 11-4 4" />
    <path d="m11 11-4 4" />
  </svg>
);

export const PenSquare: React.FC = () => (
  <svg {...iconProps} viewBox="0 0 24 24">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

export const CalendarDays: React.FC = () => (
    <svg {...iconProps} viewBox="0 0 24 24">
        <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
        <line x1="16" x2="16" y1="2" y2="6" />
        <line x1="8" x2="8" y1="2" y2="6" />
        <line x1="3" x2="21" y1="10" y2="10" />
    </svg>
);

export const Globe: React.FC = () => (
    <svg {...iconProps} viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" />
        <line x1="2" x2="22" y1="12" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
);

export const MessageSquareIcon: React.FC = () => (
  <svg {...iconProps} viewBox="0 0 24 24">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

export const MicIcon: React.FC = () => (
  <svg {...iconProps} viewBox="0 0 24 24">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
    <line x1="12" y1="19" x2="12" y2="23"></line>
  </svg>
);

export const SendIcon: React.FC = () => (
    <svg {...iconProps} viewBox="0 0 24 24" className="h-5 w-5">
        <path d="M22 2 11 13" />
        <path d="m22 2-7 20-4-9-9-4 20-7z" />
    </svg>
);

export const UserIcon: React.FC = () => (
    <svg {...iconProps} viewBox="0 0 24 24" className="h-6 w-6 text-gray-400">
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
    </svg>
);

export const TrashIcon: React.FC = () => (
  <svg {...iconProps} viewBox="0 0 24 24" className="h-4 w-4">
    <path d="M3 6h18" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

export const UploadIcon: React.FC = () => (
    <svg {...iconProps} viewBox="0 0 24 24" className="h-4 w-4 mr-2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" x2="12" y1="3" y2="15" />
    </svg>
);

export const DownloadIcon: React.FC = () => (
    <svg {...iconProps} viewBox="0 0 24 24" className="h-4 w-4 mr-2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" x2="12" y1="15" y2="3" />
    </svg>
);

export const PaperclipIcon: React.FC = () => (
  <svg {...iconProps} viewBox="0 0 24 24" className="h-5 w-5">
    <path d="M21.44 11.05 12 20.5a6 6 0 0 1-8.49-8.49L12 3.5a4 4 0 0 1 5.66 5.66L8.5 18.32a2 2 0 1 1-2.83-2.83L15 6.17" />
  </svg>
);

export const BotIcon: React.FC = () => (
  <svg {...iconProps} viewBox="0 0 24 24">
    <rect x="3" y="7" width="18" height="10" rx="2" />
    <circle cx="8" cy="12" r="1" />
    <circle cx="16" cy="12" r="1" />
    <path d="M12 3v4" />
    <rect x="9" y="2" width="6" height="3" rx="1" />
  </svg>
);
