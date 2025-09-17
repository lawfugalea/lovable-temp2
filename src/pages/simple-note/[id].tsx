import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

interface Note {
  id: string;
  title: string;
  contentJson: any;
  color: string;
  isPinned: boolean;
  visibility: 'PRIVATE' | 'HOUSEHOLD' | 'READ_ONLY';
  createdAt: string;
  updatedAt: string;
  owner: {
    id: string;
    name: string;
    email: string;
  };
}

export default function SimpleNotePage() {
  const router = useRouter();
  const { id } = router.query;
  
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  useEffect(() => {
    const fetchNote = async () => {
      if (!id || typeof id !== 'string') return;
      
      try {
        console.log('Fetching note with id:', id);
        const response = await fetch(`/api/notes/${id}`);
        if (response.ok) {
          const data = await response.json();
          console.log('Note fetched successfully:', data);
          setNote(data);
          setTitle(data.title);
          
          // Extract text content from contentJson
          if (data.contentJson && Array.isArray(data.contentJson)) {
            const text = data.contentJson
              .map((block: any) => {
                if (block.type === 'paragraph' && block.content) {
                  return block.content
                    .map((item: any) => item.text || '')
                    .join('');
                }
                return '';
              })
              .join('\n');
            setContent(text);
          } else {
            setContent('');
          }
        } else {
          console.error('Failed to fetch note');
          alert('Note not found');
        }
      } catch (error) {
        console.error('Error fetching note:', error);
        alert('Error loading note');
      } finally {
        setLoading(false);
      }
    };

    fetchNote();
  }, [id]);

  const handleSave = async () => {
    if (!id || typeof id !== 'string') return;
    
    setSaving(true);
    try {
      const response = await fetch(`/api/notes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          contentJson: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: content,
                  styles: {}
                }
              ]
            }
          ]
        }),
      });
      
      if (response.ok) {
        console.log('Note saved successfully');
        alert('Note saved successfully!');
      } else {
        console.error('Failed to save note');
        alert('Failed to save note');
      }
    } catch (error) {
      console.error('Error saving note:', error);
      alert('Error saving note');
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    router.push('/notes');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading note...</p>
        </div>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Note not found</h1>
          <button
            onClick={handleBack}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Back to Notes
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{title} - Simple Note Editor</title>
      </Head>
      
      <div className="min-h-screen bg-gray-100">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <button
                onClick={handleBack}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                ← Back to Notes
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Note'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Editor */}
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-white rounded-lg shadow-lg p-6">
            {/* Debug Info */}
            <div className="bg-green-100 border border-green-400 rounded p-2 mb-4">
              <p className="text-green-700 text-sm">
                ✅ Simple Note Editor Working - Note ID: {id}
              </p>
            </div>
            
            {/* Title */}
            <div className="mb-6">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-3xl font-bold border-none outline-none bg-transparent"
                placeholder="Note title..."
              />
            </div>
            
            {/* Content */}
            <div className="mb-6">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full h-96 p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Start writing your note..."
              />
            </div>
            
            {/* Status */}
            <div className="text-sm text-gray-500">
              Last updated: {new Date(note.updatedAt).toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
