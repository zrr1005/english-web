import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getRecord } from '../utils/storage'
import type { PracticeRecord, SentenceAction } from '../types'

export default function ReportPage() {
  const { id } = useParams<{ id: string }>()
  const [record, setRecord] = useState<PracticeRecord | null>(null)
  const navigate = useNavigate()

  useEffect(() => { if (id) getRecord(id).then(setRecord) }, [id])

  if (!record) return <div className="text-center py-24 text-ink-300 font-display text-lg">加载中…</div>

  const grouped = new Map<number, SentenceAction[]>()
  for (const a of record.actions) {
    const e = grouped.get(a.sentenceIndex) || []
    grouped.set(a.sentenceIndex, [...e, a])
  }
  const entries = Array.from(grouped.entries()).sort(([a], [b]) => a - b)

  const labelMap: Record<string, string> = { listen: '👂', write: '✍️', speak: '🎤' }
  const labelName: Record<string, string> = { listen: '听', write: '写', speak: '读' }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <button onClick={() => navigate(-1)} className="text-sm text-ink-300 hover:text-ink-600 transition-colors">← 返回</button>

      <div className="text-center py-10 space-y-3">
        <div className="text-6xl">{record.overallScore >= 90 ? '🏆' : record.overallScore >= 70 ? '⭐' : '💪'}</div>
        <div className="font-display text-5xl font-black text-ink-700">{record.overallScore}<span className="text-2xl text-ink-300">%</span></div>
        <p className="text-ink-300 text-sm">
          {record.actions.length} 次操作 · {entries.length} 句 · {Math.round(record.duration / 1000)}秒
        </p>
      </div>

      <div className="space-y-3">
        <h3 className="font-display text-xl font-bold text-ink-700">逐句详情</h3>
        {entries.map(([idx, actions]) => (
          <div key={idx} className="bg-white border border-paper-300 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-ink-500">第 {idx + 1} 句</span>
              <span className="text-xs text-ink-300">{actions.map(a => labelMap[a.actionType] || a.actionType).join(' ')}</span>
            </div>
            {actions.map((a, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-ink-400 uppercase">{labelMap[a.actionType]} {labelName[a.actionType]}</span>
                  {a.wordResults.length > 0 && (
                    <span className={`text-xs font-bold font-mono ${a.accuracy >= 90 ? 'text-sage-600' : a.accuracy >= 60 ? 'text-amber-600' : 'text-rust-500'}`}>{a.accuracy}%</span>
                  )}
                </div>
                {a.wordResults.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-1">
                    {a.wordResults.map((w, j) => (
                      <span key={j} className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                        w.match === 'correct' ? 'bg-sage-50 text-sage-700' : w.match === 'missing' ? 'bg-rust-50 text-rust-500 line-through' : w.match === 'extra' ? 'bg-amber-50 text-amber-600' : 'bg-rust-50 text-rust-500'
                      }`}>{w.original || w.user}</span>
                    ))}
                  </div>
                )}
                {a.userInput && <p className="text-xs text-ink-300 font-mono truncate">{a.actionType === 'speak' ? '朗读' : '默写'}: "{a.userInput}"</p>}
                {a.audioUrl && <audio src={a.audioUrl} controls className="h-7 mt-1" />}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
