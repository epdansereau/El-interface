import React, { useEffect, useRef, useState } from 'react';
import { UploadedFileInfo } from '../types';

interface UploadsViewProps {
  apiBase: string;
  onOpenInCanvas?: (name: string) => void;
}

export const UploadsView: React.FC<UploadsViewProps> = ({ apiBase, onOpenInCanvas }) => {
  const [files, setFiles] = useState<UploadedFileInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const refresh = async () => {
    setError(null);
    try {
      if (!apiBase) { setError('Server not connected. Set VITE_SERVER_URL.'); return; }
      const r = await fetch(`${apiBase}/api/files`);
      if (!r.ok) throw new Error(await r.text());
      const data = await r.json();
      setFiles(data.files || []);
    } catch (e: any) {
      setError(e.message || 'Failed to list files');
    }
  };

  useEffect(() => { refresh(); }, []);

  const onSelect = async (list: FileList | null) => {
    if (!list || list.length === 0) return;
    if (!apiBase) { setError('Server not connected.'); return; }
    const form = new FormData();
    Array.from(list).forEach(f => form.append('files', f));
    setIsUploading(true);
    setError(null);
    try {
      const r = await fetch(`${apiBase}/api/files`, { method: 'POST', body: form });
      if (!r.ok) throw new Error(await r.text());
      await refresh();
    } catch (e: any) {
      setError(e.message || 'Upload failed');
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    onSelect(e.dataTransfer.files);
  };

  const onDragOver = (e: React.DragEvent) => e.preventDefault();

  const downloadUrl = (name: string) => `${apiBase}/api/files/${encodeURIComponent(name)}`;
  const [preview, setPreview] = useState<{ name: string; text: string; kind: string } | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const previewFile = async (name: string) => {
    if (!apiBase) { setError('Server not connected.'); return; }
    setIsPreviewLoading(true);
    setPreview(null);
    try {
      const r = await fetch(`${apiBase}/api/files/${encodeURIComponent(name)}/text`);
      const t = await r.text();
      if (!r.ok) throw new Error(t);
      const data = JSON.parse(t);
      setPreview({ name, text: String(data.text || ''), kind: String(data.kind || '') });
    } catch (e: any) {
      setError(e.message || 'Preview failed');
    } finally {
      setIsPreviewLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-white">Uploads</h2>
      {!apiBase && (
        <div className="p-3 bg-yellow-900/40 border border-yellow-700 text-yellow-200 rounded">
          Connect the server via VITE_SERVER_URL to enable uploads.
        </div>
      )}
      {error && <div className="p-3 bg-red-900/40 border border-red-700 text-red-200 rounded">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          className="border-2 border-dashed border-gray-700 rounded-lg p-6 text-center text-gray-300 hover:border-gray-500 transition-colors"
        >
          <p className="mb-3">Drag & drop files here</p>
          <input ref={inputRef} type="file" multiple onChange={(e) => onSelect(e.target.files)} className="hidden" id="fileInput" />
          <label htmlFor="fileInput" className="inline-block px-4 py-2 bg-red-600 text-white rounded cursor-pointer">Choose Files</label>
          {isUploading && <div className="mt-3 text-sm text-gray-400">Uploading…</div>}
        </div>

        <div className="bg-gray-900/40 border border-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg text-white">Files</h3>
            <button className="text-sm text-gray-300 hover:text-white" onClick={refresh}>Refresh</button>
          </div>
          <ul className="divide-y divide-gray-800">
            {files.map(f => (
              <li key={f.name} className="py-2 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-white">{f.name}</div>
                  <div className="text-xs text-gray-500">{(f.size/1024).toFixed(1)} KB</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a className="text-sm text-red-400 hover:text-red-200" href={downloadUrl(f.name)} target="_blank" rel="noreferrer">Open</a>
                  {onOpenInCanvas && (
                    <button className="text-sm text-gray-300 hover:text-white border border-gray-700 rounded px-2 py-1"
                      onClick={() => onOpenInCanvas(f.name)}>
                      Open in Canvas
                    </button>
                  )}
                  <button className="text-sm text-gray-300 hover:text-white border border-gray-700 rounded px-2 py-1" onClick={() => previewFile(f.name)}>
                    Preview
                  </button>
                </div>
              </li>
            ))}
            {files.length === 0 && (
              <li className="py-2 text-gray-500">No files uploaded yet.</li>
            )}
          </ul>
          {(isPreviewLoading || preview) && (
            <div className="mt-4 border-t border-gray-800 pt-3">
              <div className="flex items-center justify-between">
                <h4 className="text-white text-sm">Preview</h4>
                {preview && <span className="text-xs text-gray-500">{preview.kind}</span>}
              </div>
              {isPreviewLoading && <div className="text-xs text-gray-400">Loading…</div>}
              {preview && (
                <pre className="mt-2 max-h-64 overflow-auto text-xs bg-black/40 text-gray-200 p-2 rounded whitespace-pre-wrap">{preview.text.slice(0, 4000)}</pre>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
