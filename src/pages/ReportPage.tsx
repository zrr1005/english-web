import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getRecord } from '../utils/storage'
import type { PracticeRecord, SentenceAction } from '../types'

export default function ReportPage() {
  const { id } = useParams<{ id: string }>()
  const [record, setRecord] = useState<PracticeRecord | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (id) getRecord(id).then(setRecord)
  }, [id])

  if (!record) {
    return <div className="text-center py-20 text-gray-500">Loading...</div>
  }

  // Group actions by sentence index
  const groupedBySentence = new Map<number, SentenceAction[]>()
  for (const a of record.actions) {
    const existing = groupedBySentence.get(a.sentenceIndex) || []
    groupedBySentence.set(a.sentenceIndex, [...existing, a])
  }
  const sentenceEntries = Array.from(groupedBySentence.entries()).sort(([a], [b]) => a - b)

  const actionTypeLabel: Record<string, string> = {
    listen: '🔊 Listened',
    write: '✍️ Wrote',
    speak: '🎤 Spoke',
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-white text-sm">
        ← Back
      </button>

      <div className="text-center py-6">
        <div className="text-5xl mb-3">
          {record.overallScore >= 90 ? '🏆' : record.overallScore >= 70 ? '⭐' : '💪'}
        </div>
        <div className="text-4xl font-extrabold text-indigo-400">{record.overallScore}%</div>
        <p className="text-gray-400 mt-2">
          {record.actions.length} actions · {sentenceEntries.length} sentences ·{' '}
          {Math.round(record.duration / 1000)}s
        </p>
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold text-lg">Sentence Details</h3>
        {sentenceEntries.map(([sentenceIdx, actions]) => (
          <div key={sentenceIdx} className="p-4 bg-gray-900 border border-gray-800 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Sentence {sentenceIdx + 1}</span>
              <span className="text-xs text-gray-600">
                {actions.map(a => actionTypeLabel[a.actionType] || a.actionType).join(' · ')}
              </span>
            </div>

            {actions.map((action, i) => (
              <div key={i} className="mb-2 last:mb-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-600">{actionTypeLabel[action.actionType]}</span>
                  {action.wordResults.length > 0 && (
                    <span className={`text-xs font-mono font-bold ${
                      action.accuracy >= 90 ? 'text-green-400' :
                      action.accuracy >= 60 ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {action.accuracy}%
                    </span>
                  )}
                </div>
                {action.wordResults.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-1">
                    {action.wordResults.map((w, j) => (
                      <span key={j} className={`text-xs px-1 py-0.5 rounded ${
                        w.match === 'correct' ? 'bg-green-900/40 text-green-300' :
                        w.match === 'missing' ? 'bg-red-900/40 text-red-300 line-through' :
                        w.match === 'extra' ? 'bg-yellow-900/40 text-yellow-300' :
                        'bg-red-900/40 text-red-300'
                      }`}>
                        {w.original || w.user}
                      </span>
                    ))}
                  </div>
                )}
                {action.userInput && (
                  <p className="text-xs text-gray-600 font-mono truncate">
                    {action.actionType === 'speak' ? 'Said' : 'Wrote'}: "{action.userInput}"
                  </p>
                )}
                {action.audioUrl && (
                  <audio src={action.audioUrl} controls className="h-7 mt-1" />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
