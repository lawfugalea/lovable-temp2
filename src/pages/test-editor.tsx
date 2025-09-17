import { useState } from 'react';
import TestNoteEditor from '@/components/TestNoteEditor';

export default function TestEditorPage() {
  const [content, setContent] = useState('Initial content');
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const handleChange = (newContent: string) => {
    addLog(`Content changed to: "${newContent}"`);
    setContent(newContent);
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Test Editor</h1>
      
      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-2">Current Content:</h2>
        <p className="bg-gray-100 p-2 rounded">{content}</p>
      </div>

      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-2">Editor:</h2>
        <div className="border border-gray-300 rounded">
          <TestNoteEditor
            initialContent="Test initial content"
            onChange={handleChange}
            placeholder="Type something here..."
            className="min-h-[200px]"
          />
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-2">Logs:</h2>
        <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm max-h-64 overflow-y-auto">
          {logs.map((log, index) => (
            <div key={index}>{log}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
