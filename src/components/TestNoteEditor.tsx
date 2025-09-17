import { useState, useRef, useEffect } from 'react';

interface TestNoteEditorProps {
  initialContent?: string;
  onChange?: (content: string) => void;
  placeholder?: string;
  className?: string;
  editorRef?: React.MutableRefObject<any>;
}

export default function TestNoteEditor({
  initialContent = '',
  onChange,
  placeholder = "Start writing...",
  className = "",
  editorRef
}: TestNoteEditorProps) {
  const [content, setContent] = useState(initialContent);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  console.log('TestNoteEditor rendered with:', { 
    initialContent, 
    hasOnChange: !!onChange, 
    className,
    hasEditorRef: !!editorRef 
  });

  useEffect(() => {
    console.log('TestNoteEditor mounted/updated with initialContent:', initialContent);
    setContent(initialContent);
  }, [initialContent]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    console.log('TestNoteEditor: Content changed to:', newContent);
    setContent(newContent);
    
    // Simulate BlockNote editor structure for compatibility
    if (editorRef) {
      editorRef.current = {
        document: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: newContent }]
          }
        ],
        getText: () => newContent,
        setContent: (content: string) => setContent(content)
      };
    }
    
    if (onChange) {
      console.log('TestNoteEditor: Calling onChange with:', newContent);
      onChange(newContent);
    } else {
      console.log('TestNoteEditor: No onChange handler provided');
    }
  };

  return (
    <div className={className}>
      <div className="bg-green-100 border border-green-400 rounded p-2 mb-2">
        <p className="text-green-700 text-sm">
          TestNoteEditor Active - Content: "{content}" (Length: {content.length})
        </p>
      </div>
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
