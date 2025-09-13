import React from 'react'
import ModernAppShell from '../components/ModernAppShell'

export default function SimpleNotesPage() {
  return (
    <ModernAppShell title="Notes">
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Notes</h1>
        <p className="text-gray-600">This is a simple notes page to test the basic setup.</p>
        <div className="mt-4">
          <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            Create Note
          </button>
        </div>
      </div>
    </ModernAppShell>
  )
}
