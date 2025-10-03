import React, { useEffect, useRef, useState } from 'react';

interface AgentEvent {
  event?: string;
  step?: number;
  action?: string;
  tool?: string;
  args?: any;
  result?: string;
  text?: string;
  error?: string;
  done?: boolean;
  final?: string;
}

export const AgentView: React.FC<{ apiBase: string }>= ({ apiBase }) => {
  const [goal, setGoal] = useState('Extract text from an uploaded PDF, clean it, and write to workspace:output.txt');
  const [model, setModel] = useState('gpt-5-mini');
  const [provider, setProvider] = useState<'openai'|'gemini'|'ollama'>('openai');
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<string>('');
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => () => { if (esRef.current) { esRef.current.close(); } }, []);

  const start = async () => {
    if (!apiBase || running) return;
    setRunning(true);
    setLog('');
    const resp = await fetch(`${apiBase}/api/agent/stream`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ goal, model, provider, maxSteps: 6 }) });
    if (!resp.ok || !resp.body) { setLog(`Error: ${await resp.text()}`); setRunning(false); return; }
    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    const append = (s: string) => setLog(prev => prev + s);
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const events = buf.split('\n\n');
      buf = events.pop() || '';
      for (const e of events) {
        const line = e.split('\n').find(l => l.startsWith('data:'));
        if (!line) continue;
        try {
          const obj: AgentEvent = JSON.parse(line.slice(5).trim());
          if (obj.error) append(`\n[error] ${obj.error}`);
          else if (obj.event === 'step') append(`\n[step ${obj.step}] model call`);
          else if (obj.event === 'tool_requested') append(`\n[tool] ${obj.tool} args=${JSON.stringify(obj.args)}`);
          else if (obj.event === 'tool_result') append(`\n[result] ${obj.tool}: ${obj.result?.slice(0,200)}...`);
          else if (obj.event === 'final') append(`\n[final draft]\n${obj.text}`);
          if (obj.done) { append(`\n[done]\n${obj.final || ''}`); setRunning(false); }
        } catch {}
      }
    }
    setRunning(false);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl text-white font-semibold">Agent</h2>
      {!apiBase && <div className="p-3 bg-yellow-900/40 border border-yellow-700 text-yellow-200 rounded">Server not connected. Set VITE_SERVER_URL.</div>}
      <div className="bg-gray-900/40 border border-gray-800 rounded-lg p-4 space-y-3">
        <label className="block text-sm text-gray-300">Goal
          <textarea className="mt-1 w-full bg-gray-800 text-gray-100 border border-gray-700 rounded p-2" rows={3} value={goal} onChange={e=>setGoal(e.target.value)} />
        </label>
        <div className="flex gap-3">
          <label className="text-sm text-gray-300">Provider
            <select className="ml-2 bg-gray-800 text-gray-100 border border-gray-700 rounded p-1" value={provider} onChange={e=>setProvider(e.target.value as any)}>
              <option value="openai">OpenAI</option>
              <option value="gemini">Gemini</option>
              <option value="ollama">Ollama</option>
            </select>
          </label>
          <label className="text-sm text-gray-300">Model
            <input className="ml-2 bg-gray-800 text-gray-100 border border-gray-700 rounded p-1 w-56" value={model} onChange={e=>setModel(e.target.value)} />
          </label>
          <button disabled={running || !apiBase} onClick={start} className="px-3 py-1 bg-red-600 text-white rounded disabled:bg-gray-700">{running ? 'Running…' : 'Start'}</button>
        </div>
      </div>
      <div className="bg-gray-900/40 border border-gray-800 rounded-lg p-4">
        <h3 className="text-white text-sm mb-2">Events</h3>
        <pre className="max-h-[50vh] overflow-auto text-xs text-gray-200 whitespace-pre-wrap">{log || '—'}</pre>
      </div>
    </div>
  );
};

