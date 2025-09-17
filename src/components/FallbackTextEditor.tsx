import { useState, useRef, useEffect } from 'react';

interface FallbackTextEditorProps {
  initialContent?: string;
  onChange?: (content: string) => void;
  placeholder?: string;
  className?: string;
  editorRef?: React.MutableRefObject<any>;
}

export default function FallbackTextEditor({
  initialContent = '',
  onChange,
  placeholder = "Start writing...",
  className = "",
  editorRef
}: FallbackTextEditorProps) {
  const [content, setContent] = useState(initialContent);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editorRef) {
      editorRef.current = {
        document: [{ type: 'paragraph', content: [{ type: 'text', text: content }] }],
        getText: () => content,
        setContent: (newContent: string) => setContent(newContent)
      };
    }
  }, [content, editorRef]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    if (onChange && editorRef?.current) {
      // Simulate BlockNote editor structure
      editorRef.current.document = [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: newContent }]
        }
      ];
      onChange(editorRef.current);
    }
  };

  return (
    <div className={className}>
      <textarea
        ref={textareaRef}
        value={content}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full h-full p-4 border-none outline-none resize-none bg-transparent text-gray-900 placeholder-gray-500"
        style={{ minHeight: '200px' }}
      />
    </div>
  );
}
