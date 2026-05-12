import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getMaterial, saveRecord } from '../utils/storage'
import SentencePractice from '../components/SentencePractice'
import ShadowMode from '../components/ShadowMode'
import type { TextMaterial, PracticeMode, SentenceAction, WordResult } from '../types'

export default function PracticePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [material, setMaterial] = useState<TextMaterial | null>(null)
  const [mode, setMode] = useState<PracticeMode>('practice')   // 'practice' | 'shadow'
  const [currentIdx, setCurrentIdx] = useState(0)
  const [actionsMap, setActionsMap] = useState<Map<number, SentenceAction[]>>(new Map())
  const [startTime] = useState(Date.now())

  useEffect(() => {
    if (id) {
      getMaterial(id).then((m) => {
        if (m) setMaterial(m)
        else navigate('/')
      })
    }
  }, [id, navigate])

  const handleActionComplete = useCallback((action: SentenceAction) => {
    setActionsMap((prev) => {
      const next = new Map(prev)
      const existing = next.get(action.sentenceIndex) || []
      // Replace if same actionType, otherwise append
      const filtered = existing.filter(a => a.actionType !== action.actionType)
      next.set(action.sentenceIndex, [...filtered, action])
      return next
    })
  }, [])

  function handleNext() {
    if (currentIdx < (material?.sentences.length || 0) - 1) {
      setCurrentIdx((i) => i + 1)
    } else {
      finishPractice()
    }
  }

  function handlePrev() {
    if (currentIdx > 0) setCurrentIdx((i) => i - 1)
  }

  function handleShadowComplete(
    shadowResults: { sentenceIndex: number; userInput: string; wordResults: WordResult[]; accuracy: number }[]
  ) {
    const map = new Map<number, SentenceAction[]>()
    for (const r of shadowResults) {
      map.set(r.sentenceIndex, [{
        sentenceIndex: r.sentenceIndex,
        actionType: 'speak',
        userInput: r.userInput,
        wordResults: r.wordResults,
        accuracy: r.accuracy,
        timestamp: Date.now(),
      }])
    }
    setActionsMap(map)
    // Return to practice view with results
    setMode('practice')
    setCurrentIdx(0)
  }

  async function finishPractice() {
    const allActions: SentenceAction[] = []
    for (const actions of actionsMap.values()) {
      allActions.push(...actions)
    }
    allActions.sort((a, b) => a.sentenceIndex - b.sentenceIndex)

    const overallScore = allActions.length > 0
      ? Math.round(allActions.reduce((sum, a) => sum + a.accuracy, 0) / allActions.length)
      : 0

    const record = {
      id: crypto.randomUUID(),
      materialId: material!.id,
      actions: allActions,
      overallScore,
      duration: Date.now() - startTime,
      createdAt: Date.now(),
    }

    await saveRecord(record)
    navigate(`/report/${record.id}`)
  }

  if (!material || material.sentences.length === 0) {
    return (
      <div className="text-center py-20 text-gray-500">
        <div className="text-4xl mb-3">📖</div>
        <p>Loading material...</p>
      </div>
    )
  }

  const sentences = material.sentences

  // Sentence dot state: 'empty' | 'partial' | 'done'
  function getDotState(idx: number): 'empty' | 'partial' | 'done' {
    const actions = actionsMap.get(idx)
    if (!actions || actions.length === 0) return 'empty'
    if (actions.length >= 3) return 'done'
    return 'partial'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/library')} className="text-gray-400 hover:text-white text-sm">
            ← Library
          </button>
          <h1 className="text-lg font-bold truncate max-w-[200px]">{material.title}</h1>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-600">{sentences.length} sentences</span>
          <button
            onClick={() => setMode(mode === 'shadow' ? 'practice' : 'shadow')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              mode === 'shadow'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            {mode === 'shadow' ? '📖 Practice' : '🎭 Shadow'}
          </button>
        </div>
      </div>

      {/* Mode content */}
      {mode === 'shadow' ? (
        <ShadowMode
          key={`shadow-${startTime}`}
          sentences={sentences}
          onComplete={handleShadowComplete}
        />
      ) : (
        <>
          <SentencePractice
            key={`practice-${currentIdx}`}
            sentence={sentences[currentIdx]}
            sentenceIndex={currentIdx}
            totalSentences={sentences.length}
            existingActions={actionsMap.get(currentIdx) || []}
            onActionComplete={handleActionComplete}
            onNext={handleNext}
            onPrev={handlePrev}
          />

          {/* Sentence navigation dots — three states */}
          <div className="flex justify-center gap-1.5 flex-wrap pt-2">
            {sentences.map((_, i) => {
              const state = getDotState(i)
              return (
                <button
                  key={i}
                  onClick={() => setCurrentIdx(i)}
                  className={`w-3 h-3 rounded-full transition-all ${
                    i === currentIdx
                      ? 'bg-indigo-500 ring-2 ring-indigo-500/30 scale-125'
                      : state === 'done'
                      ? 'bg-green-500'
                      : state === 'partial'
                      ? 'bg-yellow-500'
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                  title={`Sentence ${i + 1}${
                    state === 'done' ? ' (all done)' :
                    state === 'partial' ? ' (partial)' : ''
                  }`}
                />
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
