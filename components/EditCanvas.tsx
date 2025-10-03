import React from 'react';

export interface EditProposal {
  id: string;
  // For core files use their short names; for workspace files use `workspace:<filename>`
  file: string;
  mode: 'replace' | 'patch';
  content?: string;
  diff?: string;
  note?: string;
}

interface EditCanvasProps {
  proposals: EditProposal[];
  onApply: (p: EditProposal, commit?: { enabled: boolean; message?: string }) => Promise<void>;
  onDiscard: (id: string) => void;
  isServerConnected: boolean;
}

export const EditCanvas: React.FC<EditCanvasProps> = ({ proposals, onApply, onDiscard, isServerConnected }) => {
  if (!proposals || proposals.length === 0) return null;
  return (
    <div className="fixed bottom-4 right-4 w-full max-w-2xl bg-gray-900/95 border border-gray-700 rounded-xl shadow-2xl p-4 z-40 backdrop-blur-md">
      <header className="flex items-center justify-between mb-3">
        <h3 className="text-white font-semibold">Proposed Changes</h3>
        {!isServerConnected && (
          <span className="text-xs text-yellow-400">Read-only demo — server not connected</span>
        )}
      </header>
      <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar">
        {proposals.map(p => (
          <div key={p.id} className="border border-gray-700 rounded-lg p-3 bg-gray-950">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-300">
                <span className="font-mono text-red-400">{p.file}</span>
                <span className="ml-2 px-2 py-0.5 text-xs rounded bg-gray-800 border border-gray-700">{p.mode}</span>
              </div>
              <ApplyControls proposal={p} isServerConnected={isServerConnected} onApply={onApply} onDiscard={onDiscard} />
            </div>
            {p.note && <p className="text-xs text-gray-400 mb-2">{p.note}</p>}
            {p.content && (
              <pre className="text-xs bg-black/40 text-gray-200 p-2 rounded overflow-x-auto whitespace-pre-wrap">{p.content.substring(0, 4000)}</pre>
            )}
            {p.diff && (
              <pre className="text-xs bg-black/40 text-gray-200 p-2 rounded overflow-x-auto">{p.diff.substring(0, 4000)}</pre>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const ApplyControls: React.FC<{ proposal: EditProposal; isServerConnected: boolean; onApply: EditCanvasProps['onApply']; onDiscard: (id: string) => void }>
  = ({ proposal, isServerConnected, onApply, onDiscard }) => {
  const [commit, setCommit] = React.useState(true);
  const [message, setMessage] = React.useState('');
  return (
    <div className="space-x-2 flex items-center">
      <label className="text-xs text-gray-300 flex items-center gap-1">
        <input type="checkbox" checked={commit} onChange={e => setCommit(e.target.checked)} /> Commit
      </label>
      <input
        type="text"
        placeholder="Commit message (optional)"
        value={message}
        onChange={e => setMessage(e.target.value)}
        className="text-xs bg-gray-800 border border-gray-700 rounded px-2 py-1 text-gray-200 w-48"
      />
      <button disabled={!isServerConnected} onClick={() => onApply(proposal, { enabled: commit, message })} className="px-3 py-1 rounded bg-red-600 text-white text-sm disabled:bg-gray-700">Apply</button>
      <button onClick={() => onDiscard(proposal.id)} className="px-3 py-1 rounded bg-gray-700 text-gray-200 text-sm">Discard</button>
    </div>
  );
};

const style = document.createElement('style');
style.textContent = `
  .custom-scrollbar::-webkit-scrollbar { width: 8px; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(255,255,255,0.15); border-radius: 20px; }
`;
document.head.append(style);
