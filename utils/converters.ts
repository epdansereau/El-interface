import { DiaryEntry, GriffesFragment, CalendarSection, WorldStateSection } from '../types';

// --- DIARY CONVERTERS ---

export const textToDiary = (text: string): DiaryEntry[] => {
    if (!text || !text.trim()) return [];
    const entries: DiaryEntry[] = [];
    // Split by month headers
    const monthSections = text.split('\n## ').filter(s => s.trim());

    for (const monthSection of monthSections) {
        const lines = monthSection.trim().split('\n');
        const monthTitle = lines.shift()?.trim() || 'Untitled Month';
        const entry: DiaryEntry = { month: monthTitle, content: [] };
        
        const contentStr = lines.join('\n').trim();
        // Split by subtitle marker (###), but keep the delimiter with the following text using a positive lookahead
        const contentParts = contentStr.split(/(?=\n### )/g).filter(p => p.trim());

        for (const part of contentParts) {
            let trimmedPart = part.trim();
            if (trimmedPart.startsWith('### ')) {
                const partLines = trimmedPart.split('\n');
                const subtitle = partLines.shift()?.substring(4).trim() || '';
                const text = partLines.join('\n').trim();
                entry.content.push({ subtitle, text });
            } else {
                // This part has no subtitle, it's just plain text.
                entry.content.push({ text: trimmedPart });
            }
        }
        
        if (entry.content.length > 0) {
            entries.push(entry);
        }
    }
    return entries;
};


export const diaryToText = (entries: DiaryEntry[]): string => {
    return entries.map(entry => {
        let entryText = `## ${entry.month}\n\n`;
        entryText += entry.content.map(p => {
            if (p.subtitle) {
                return `### ${p.subtitle}\n${p.text}`;
            }
            return p.text;
        }).join('\n\n');
        return entryText;
    }).join('\n\n\n');
};

// --- GRIFFES CONVERTERS ---

export const textToGriffes = (text: string): GriffesFragment[] => {
    if (!text) return [];
    const fragments: GriffesFragment[] = [];
    const sections = text.split('\n## ').filter(s => s.trim());
    for (const section of sections) {
        const lines = section.trim().split('\n');
        const title = lines.shift()?.trim() || 'Untitled Fragment';
        const content = lines.join('\n').trim();
        if (title && content) {
            fragments.push({ title, content });
        }
    }
    return fragments;
};

export const griffesToText = (fragments: GriffesFragment[]): string => {
    return fragments.map(f => `## ${f.title}\n\n${f.content}`).join('\n\n\n');
};

// --- CALENDAR CONVERTERS ---

export const textToCalendar = (text: string): CalendarSection[] => {
    if (!text) return [];
    const sections: CalendarSection[] = [];
    const sectionBlocks = text.split('\n## ').filter(s => s.trim());
    for (const block of sectionBlocks) {
        const lines = block.trim().split('\n');
        const title = lines.shift()?.trim() || 'Untitled Section';
        const items = lines.map(line => line.replace(/^- /, '').trim()).filter(Boolean);
        if (title && items.length > 0) {
            sections.push({ title, items });
        }
    }
    return sections;
};

export const calendarToText = (sections: CalendarSection[]): string => {
    return sections.map(s => {
        const itemsText = s.items.map(item => `- ${item}`).join('\n');
        return `## ${s.title}\n\n${itemsText}`;
    }).join('\n\n\n');
};

// --- WORLD STATE CONVERTERS ---

export const textToWorldState = (text: string): WorldStateSection[] => {
    if (!text) return [];
    const sections: WorldStateSection[] = [];
    const sectionBlocks = text.split('\n## ').filter(s => s.trim());
    for (const block of sectionBlocks) {
        const lines = block.trim().split('\n');
        const title = lines.shift()?.trim() || 'Untitled Section';
        const content = lines.join('\n').trim();
        if (title && content) {
            sections.push({ title, content });
        }
    }
    return sections;
};

export const worldStateToText = (sections: WorldStateSection[]): string => {
    return sections.map(s => `## ${s.title}\n\n${s.content}`).join('\n\n\n');
};
