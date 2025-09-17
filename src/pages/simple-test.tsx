import { useState } from 'react';

export default function SimpleTestPage() {
  const [content, setContent] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    console.log('Simple textarea changed to:', newContent);
    alert(`Simple textarea changed to: "${newContent}"`);
    setContent(newContent);
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Simple Test Page</h1>
      <p className="mb-4">Current content: "{content}"</p>
      
      <textarea
        value={content}
        onChange={handleChange}
        placeholder="Type something here..."
        className="w-full h-32 p-4 border border-gray-300 rounded"
      />
      
      <p className="mt-4 text-sm text-gray-600">
        If you see alerts when typing, the basic functionality works.
      </p>
    </div>
  );
}
