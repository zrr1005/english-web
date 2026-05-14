import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { getMaterial, saveTranslation } from '../utils/storage'
import { speak, stopSpeaking } from '../utils/speech'
import { callLLM, hasLLM } from '../utils/llm'
import SentencePractice from '../components/SentencePractice'
import ShadowMode from '../components/ShadowMode'
import type { TextMaterial, SentenceAction, WordResult } from '../types'

type ViewMode = 'listen' | 'dictation' | 'shadow'

export default function ListenPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const [material, setMaterial] = useState<TextMaterial | null>(null)
  const [showText, setShowText] = useState(true)
  const [showTranslation, setShowTranslation] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('listen')
  const [playing, setPlaying] = useState(false)
  const [currentSentIdx, setCurrentSentIdx] = useState(-1)
  const [translationInput, setTranslationInput] = useState('')
  const [translationSource, setTranslationSource] = useState<'bilibili' | 'llm' | 'manual' | null>(null)
  const [translating, setTranslating] = useState(false)
  const [editTranslation, setEditTranslation] = useState(false)

  const [dictIdx, setDictIdx] = useState(0)
  const [dictActions, setDictActions] = useState<Map<number, SentenceAction[]>>(new Map())

  const sentences = material?.sentences || []

  useEffect(() => {
    const mode = searchParams.get('mode')
    if (mode === 'dictation') setViewMode('dictation')
    else if (mode === 'shadow') setViewMode('shadow')
  }, [searchParams])

  useEffect(() => {
    if (id) getMaterial(id).then(m => {
      if (m) {
        setMaterial(m)
        if (m.translation) { setTranslationInput(m.translation); setTranslationSource(m.translationSource || null) }
      } else navigate('/library')
    })
  }, [id, navigate])

  const playFullText = useCallback(async () => {
    if (!material || playing) return
    setPlaying(true)
    for (let i = 0; i < sentences.length; i++) {
      setCurrentSentIdx(i)
      await speak(sentences[i].text)
      if (!playing) break
    }
    setCurrentSentIdx(-1)
    setPlaying(false)
  }, [material, playing, sentences])

  function stopPlayback() {
    stopSpeaking()
    setPlaying(false)
    setCurrentSentIdx(-1)
  }

  async function handleLLMTranslate() {
    if (!material || !hasLLM()) return
    setTranslating(true)
    const fullText = sentences.map(s => s.text).join(' ')
    const result = await callLLM(
      '将以下英文原文翻译成中文。只输出中文译文，不要解释。',
      fullText, { maxTokens: 4000 }
    )
    if (result) {
      setTranslationInput(result); setTranslationSource('llm')
      await saveTranslation(material.id, result, 'llm')
    }
    setTranslating(false)
  }

  async function handleSaveManualTranslation() {
    if (!material || !translationInput.trim()) return
    setTranslationSource('manual'); setEditTranslation(false)
    await saveTranslation(material.id, translationInput, 'manual')
  }

  function handleDictationComplete(action: SentenceAction) {
    setDictActions(prev => {
      const next = new Map(prev)
      const existing = next.get(action.sentenceIndex) || []
      next.set(action.sentenceIndex, [...existing.filter(a => a.actionType !== action.actionType), action])
      return next
    })
  }

  function handleShadowComplete(_results: { sentenceIndex: number; userInput: string; wordResults: WordResult[]; accuracy: number }[]) {
    setViewMode('listen')
  }

  if (!material) return <div className="text-center py-24 text-ink-300 font-display text-lg">加载中…</div>
  if (sentences.length === 0) return <div className="text-center py-24 text-ink-300">没有找到句子</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4 min-w-0">
          <button onClick={() => navigate('/library')} className="text-sm text-ink-300 hover:text-ink-600 transition-colors shrink-0">
            ← 素材库
          </button>
          <h1 className="font-display text-xl font-bold text-ink-700 truncate">{material.title}</h1>
        </div>
        <span className="text-xs text-ink-300">{sentences.length} 句</span>
      </div>

      {/* 听力模式 */}
      {viewMode === 'listen' && (
        <div className="space-y-6">
          <div className="flex items-center gap-2 flex-wrap bg-white rounded-2xl border border-paper-300 shadow-sm p-2">
            <button
              onClick={playing ? stopPlayback : playFullText}
              className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all ${
                playing ? 'bg-rust-500 text-white' : 'bg-ink-700 hover:bg-ink-800 text-white hover:shadow-md'
              }`}
            >
              {playing ? '⏹ 停止' : '▶ 播放全文'}
            </button>

            <button
              onClick={() => setShowText(!showText)}
              className={`px-4 py-2.5 rounded-full text-sm font-semibold border transition ${
                !showText ? 'bg-amber-50 border-amber-300 text-amber-700' : 'bg-white border-paper-300 text-ink-500 hover:border-amber-300'
              }`}
            >
              {showText ? '👁 隐藏原文' : '👁 显示原文（盲听中）'}
            </button>

            <button
              onClick={() => setShowTranslation(!showTranslation)}
              className={`px-4 py-2.5 rounded-full text-sm font-semibold border transition ${
                showTranslation ? 'bg-amber-50 border-amber-300 text-amber-700' : 'bg-white border-paper-300 text-ink-500 hover:border-amber-300'
              }`}
            >
              🌐 {showTranslation ? '隐藏译文' : '译文'}
            </button>

            <div className="flex-1" />

            <button
              onClick={() => { setDictIdx(0); setDictActions(new Map()); setViewMode('dictation') }}
              className="px-4 py-2.5 rounded-full text-sm font-semibold border border-paper-300 bg-white text-ink-500 hover:border-amber-300 hover:text-ink-700 transition"
            >
              ✍️ 逐句听写
            </button>
            <button
              onClick={() => setViewMode('shadow')}
              className="px-4 py-2.5 rounded-full text-sm font-semibold border border-paper-300 bg-white text-ink-500 hover:border-amber-300 hover:text-ink-700 transition"
            >
              🎭 影子跟读
            </button>
          </div>

          {/* 进度条 */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-1.5 bg-paper-300 rounded-full overflow-hidden">
                <div className="h-full bg-amber-400 rounded-full transition-all duration-300"
                  style={{ width: playing ? `${((currentSentIdx + 1) / sentences.length) * 100}%` : '0%' }} />
              </div>
              <span className="text-xs font-mono text-ink-300 tabular-nums">
                {currentSentIdx >= 0 ? `${currentSentIdx + 1}/${sentences.length}` : '—'}
              </span>
            </div>

            {/* 盲听语音纹 */}
            {!showText && (
              <div className="flex items-end gap-[1px] h-12 px-1">
                {sentences.map((s, i) => {
                  const wordCount = s.words.length
                  const height = Math.max(4, Math.min(48, wordCount * 3))
                  const isCurrent = i === currentSentIdx
                  return (
                    <div key={i}
                      className={`flex-1 rounded-t transition-all duration-200 ${
                        isCurrent ? 'bg-amber-400' : i < currentSentIdx ? 'bg-amber-200' : 'bg-paper-300'
                      }`}
                      style={{ height: `${height}px` }}
                    />
                  )
                })}
              </div>
            )}
          </div>

          {/* 全文 */}
          {showText && (
            <div className="bg-white rounded-2xl border border-paper-300 shadow-sm p-6 md:p-8">
              <div className="font-display text-lg md:text-xl text-ink-700 leading-relaxed space-y-1">
                {sentences.map((s, i) => (
                  <span key={i}
                    onClick={() => { stopPlayback(); speak(s.text) }}
                    className={`cursor-pointer transition-colors duration-200 hover:text-amber-600 ${
                      i === currentSentIdx ? 'bg-amber-100 text-amber-700 rounded px-0.5 -mx-0.5' : ''
                    }`}
                  >
                    {s.text}{' '}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 译文 */}
          {showTranslation && (
            <div className="bg-white rounded-2xl border border-paper-300 shadow-sm p-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-ink-400 uppercase tracking-wider">
                  🌐 译文 {translationSource && <span className="text-ink-200">· {translationSource === 'bilibili' ? 'B站' : translationSource === 'llm' ? 'AI翻译' : '手动'}</span>}
                </span>
                <div className="flex gap-2">
                  {!translationInput && hasLLM() && (
                    <button onClick={handleLLMTranslate} disabled={translating}
                      className="text-xs text-amber-600 hover:text-amber-700 font-medium">
                      {translating ? '翻译中…' : '✨ AI 翻译'}
                    </button>
                  )}
                  <button onClick={() => setEditTranslation(!editTranslation)}
                    className="text-xs text-ink-300 hover:text-ink-600 font-medium">
                    {editTranslation ? '完成' : '✏️ 编辑'}
                  </button>
                </div>
              </div>

              {editTranslation ? (
                <div className="space-y-2">
                  <textarea value={translationInput} onChange={(e) => setTranslationInput(e.target.value)}
                    placeholder="粘贴或输入译文…" rows={6}
                    className="w-full bg-paper-100 border border-paper-300 rounded-xl px-4 py-3 text-sm text-ink-600 placeholder-ink-200 focus:outline-none focus:border-amber-300 transition resize-y" />
                  <button onClick={handleSaveManualTranslation}
                    className="px-4 py-2 bg-ink-700 text-white rounded-full text-xs font-semibold hover:bg-ink-800 transition">
                    保存译文
                  </button>
                </div>
              ) : translationInput ? (
                <p className="text-sm text-ink-500 leading-relaxed">{translationInput}</p>
              ) : (
                <p className="text-sm text-ink-200 italic">暂无译文，使用 ✨ AI 翻译 或 ✏️ 手动粘贴</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* 逐句听写 */}
      {viewMode === 'dictation' && (
        <div className="space-y-4">
          <button onClick={() => setViewMode('listen')}
            className="text-sm text-ink-300 hover:text-ink-600 transition-colors">
            ← 返回听力
          </button>
          <SentencePractice
            key={`dict-${dictIdx}`}
            sentence={sentences[dictIdx]}
            sentenceIndex={dictIdx}
            totalSentences={sentences.length}
            existingActions={dictActions.get(dictIdx) || []}
            onActionComplete={handleDictationComplete}
            onNext={() => dictIdx < sentences.length - 1 ? setDictIdx(i => i + 1) : setViewMode('listen')}
            onPrev={() => dictIdx > 0 ? setDictIdx(i => i - 1) : null}
          />
        </div>
      )}

      {/* 影子跟读 */}
      {viewMode === 'shadow' && (
        <div className="space-y-4">
          <button onClick={() => setViewMode('listen')}
            className="text-sm text-ink-300 hover:text-ink-600 transition-colors">
            ← 返回听力
          </button>
          <ShadowMode sentences={sentences} onComplete={handleShadowComplete} />
        </div>
      )}
    </div>
  )
}
