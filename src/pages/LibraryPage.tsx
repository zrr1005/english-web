import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAllMaterials, deleteMaterial } from '../utils/storage'
import type { TextMaterial } from '../types'

export default function LibraryPage() {
  const [materials, setMaterials] = useState<TextMaterial[]>([])
  const navigate = useNavigate()

  useEffect(() => {
    getAllMaterials().then(setMaterials)
  }, [])

  async function handleDelete(id: string) {
    await deleteMaterial(id)
    setMaterials((prev) => prev.filter((m) => m.id !== id))
  }

  if (materials.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="text-5xl mb-4">📚</div>
        <h2 className="text-xl font-semibold mb-2">No materials yet</h2>
        <p className="text-gray-500 mb-4">Import a text or subtitle to get started.</p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-medium transition"
        >
          Go to Import →
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Your Library</h1>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium transition"
        >
          + New Import
        </button>
      </div>
      <div className="grid gap-3">
        {materials.map((m) => (
          <div
            key={m.id}
            className="flex items-center justify-between p-4 bg-gray-900 border border-gray-800 rounded-xl hover:border-gray-700 transition cursor-pointer"
            onClick={() => navigate(`/practice/${m.id}`)}
          >
            <div>
              <h3 className="font-semibold">{m.title}</h3>
              <p className="text-sm text-gray-500">
                {m.sentences.length} sentences · {m.totalWords} words ·{' '}
                {new Date(m.createdAt).toLocaleDateString()} · {m.source.toUpperCase()}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDelete(m.id)
                }}
                className="px-3 py-1.5 text-sm text-red-400 hover:bg-red-900/30 rounded-lg transition"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
