import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { parseText } from '../utils/parser'
import { saveMaterial } from '../utils/storage'
import {
  fetchBilibiliSubtitles, isBilibiliUrl, extractBvid,
  checkSubtitlesExist, fetchChineseSubtitles
} from '../utils/bilibili'
import { callLLM, hasLLM } from '../utils/llm'

type ImportMode = 'paste' | 'file' | 'bilibili'

export default function HomePage() {
  const [text, setText] = useState('')
  const [title, setTitle] = useState('')
  const [mode, setMode] = useState<ImportMode>('paste')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [bilibiliUrl, setBilibiliUrl] = useState('')
  const [subStatus, setSubStatus] = useState<{ hasEnglish: boolean; hasChinese: boolean; message: string } | null>(null)
  const [translating, setTranslating] = useState(false)
  const navigate = useNavigate()

  const isChrome = /Chrome/.test(navigator.userAgent) && !/Edge|OPR/.test(navigator.userAgent)

  async function handleBilibiliBlur() {
    const bvid = extractBvid(bilibiliUrl)
    if (!bvid) { setSubStatus(null); return }
    setSubStatus(null)
    const status = await checkSubtitlesExist(bvid)
    setSubStatus(status)
  }

  async function handleTranslateChinese() {
    if (!hasLLM()) { setError('Configure an LLM API key in Settings first.'); return }
    setTranslating(true); setError('')
    try {
      const { chineseText } = await fetchChineseSubtitles(bilibiliUrl)
      const translated = await callLLM(
        'You are a translator. Translate the following Chinese text to natural, fluent English. Output ONLY the English translation.',
        chineseText, { maxTokens: 4000 }
      )
      if (!translated) throw new Error('Translation failed')
      const sentences = parseText(translated, 'txt')
      if (sentences.length === 0) throw new Error('No sentences in translation')
      const mid = crypto.randomUUID()
      await saveMaterial({
        id: mid, title: title.trim() || 'Bilibili (AI translated)',
        source: 'bilibili' as const, sentences, createdAt: Date.now(),
        totalWords: sentences.reduce((s, sen) => s + sen.words.length, 0),
      })
      navigate('/library')
    } catch (e: any) { setError(e.message || 'Translation failed.') }
    setTranslating(false)
  }

  async function handleImport() {
    setError('')
    let sourceText = ''
    let sourceFormat: 'paste' | 'srt' | 'vtt' | 'txt' | 'bilibili' = 'paste'
    let finalTitle = title.trim()

    if (mode === 'bilibili') {
      if (!bilibiliUrl.trim()) { setError('Enter a Bilibili video URL.'); return }
      if (!isBilibiliUrl(bilibiliUrl)) { setError('Not a valid Bilibili URL.'); return }
      if (/b23\.tv/.test(bilibiliUrl)) { setError('Short links (b23.tv) not supported.'); return }
      setLoading(true)
      try {
        const result = await fetchBilibiliSubtitles(bilibiliUrl)
        sourceText = result.subtitles; sourceFormat = 'bilibili'
        if (!finalTitle) finalTitle = result.title
      } catch (e: any) { setError(e.message || 'Failed.'); setLoading(false); return }
    } else {
      sourceText = text
      sourceFormat = mode === 'file' ? detectFormat(text) : 'paste'
    }

    if (!sourceText.trim()) { setError('No content to practice.'); setLoading(false); return }
    setLoading(true)
    try {
      const sentences = parseText(sourceText, sourceFormat === 'bilibili' ? 'txt' : sourceFormat)
      if (sentences.length === 0) { setError('No sentences found.'); setLoading(false); return }
      const material = {
        id: crypto.randomUUID(),
        title: finalTitle || `Practice ${new Date().toLocaleDateString()}`,
        source: sourceFormat, sentences, createdAt: Date.now(),
        totalWords: sentences.reduce((s, sen) => s + sen.words.length, 0),
      }
      await saveMaterial(material)
      navigate('/library')
    } catch (e) { setError('Failed to process text.'); }
    setLoading(false)
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const c = ev.target?.result as string; setText(c)
      if (!title) setTitle(file.name.replace(/\.\w+$/, ''))
    }
    reader.readAsText(file); setMode('file')
  }

  const tabs: { key: ImportMode; icon: string; label: string }[] = [
    { key: 'paste', icon: '✏️', label: 'Paste' },
    { key: 'file', icon: '📁', label: 'Upload' },
    { key: 'bilibili', icon: '📺', label: 'Bilibili' },
  ]

  return (
    <div className="space-y-12">
      {/* Hero */}
      <section className="text-center pt-6 pb-2 space-y-4">
        <h1 className="font-display text-5xl md:text-6xl font-black text-ink-700 tracking-tight leading-tight">
          Practice English<br />
          <span className="text-amber-500 italic font-medium">with content you love</span>
        </h1>
        <p className="text-ink-300 text-lg max-w-lg mx-auto leading-relaxed">
          Import subtitles, paste text, or link a Bilibili video.
          Then listen, write, and speak — one sentence at a time.
        </p>
        {!isChrome && (
          <div className="inline-block px-4 py-2 bg-amber-50 border border-amber-200 rounded-full text-amber-700 text-sm">
            For the full experience, open in Chrome (speech recognition required).
          </div>
        )}
      </section>

      {/* Import card */}
      <section className="max-w-xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-paper-300 overflow-hidden">
          {/* Tabs */}
          <div className="flex bg-paper-200 p-1.5 gap-1 mx-4 mt-4 rounded-xl">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => { setMode(t.key); setError(''); setText(''); setBilibiliUrl(''); setSubStatus(null) }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  mode === t.key
                    ? 'bg-white text-ink-700 shadow-sm'
                    : 'text-ink-300 hover:text-ink-500'
                }`}
              >
                <span className="mr-1.5">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>

          <div className="p-5 space-y-4">
            {/* Title */}
            <input
              type="text" value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title (optional)"
              className="w-full bg-paper-100 border border-paper-300 rounded-xl px-4 py-3 text-sm text-ink-600 placeholder-ink-200 focus:outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-50 transition font-sans"
            />

            {/* Bilibili URL */}
            {mode === 'bilibili' && (
              <div className="space-y-2">
                <input
                  type="text" value={bilibiliUrl}
                  onChange={(e) => { setBilibiliUrl(e.target.value); setSubStatus(null) }}
                  onBlur={handleBilibiliBlur}
                  placeholder="https://www.bilibili.com/video/BV..."
                  className="w-full bg-paper-100 border border-paper-300 rounded-xl px-4 py-3 text-sm font-mono text-ink-600 placeholder-ink-200 focus:outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-50 transition"
                />
                {subStatus && (
                  <p className={`text-xs font-medium px-1 ${
                    subStatus.hasEnglish ? 'text-sage-600' : subStatus.hasChinese ? 'text-amber-600' : 'text-ink-300'
                  }`}>
                    {subStatus.hasEnglish ? '✓' : subStatus.hasChinese ? '!' : '·'} {subStatus.message}
                  </p>
                )}
                {subStatus?.hasChinese && !subStatus?.hasEnglish && (
                  <button onClick={handleTranslateChinese} disabled={translating}
                    className="w-full py-3 bg-amber-50 hover:bg-amber-100 disabled:bg-paper-200 border border-amber-200 rounded-xl text-sm font-semibold text-amber-700 transition flex items-center justify-center gap-2"
                  >
                    <span>✨</span>
                    <span>{translating ? 'Translating...' : hasLLM() ? 'Translate Chinese → English' : 'Set up LLM in Settings →'}</span>
                  </button>
                )}
                {!subStatus && (
                  <p className="text-xs text-ink-200 px-1">Paste a link and click outside to check subtitles.</p>
                )}
              </div>
            )}

            {/* Text area (paste) */}
            {mode === 'paste' && (
              <textarea
                value={text} onChange={(e) => setText(e.target.value)}
                placeholder={"The quick brown fox jumps over the lazy dog.\nIt was a beautiful day in the neighborhood."}
                rows={10}
                className="w-full bg-paper-100 border border-paper-300 rounded-xl px-4 py-3 text-sm font-mono text-ink-600 placeholder-ink-200 focus:outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-50 transition resize-y"
              />
            )}

            {/* File upload */}
            {mode === 'file' && (
              <label className="flex flex-col items-center gap-3 py-12 bg-paper-100 border-2 border-dashed border-paper-300 hover:border-amber-300 rounded-xl cursor-pointer transition group">
                <span className="text-4xl group-hover:scale-110 transition-transform">📁</span>
                <span className="text-sm text-ink-300 font-medium">Click to upload .txt .srt .vtt</span>
                {text && <span className="text-xs text-sage-600 font-mono">File loaded ✓</span>}
                <input type="file" accept=".txt,.srt,.vtt" onChange={handleFileUpload} className="hidden" />
              </label>
            )}

            {error && <p className="text-sm text-rust-500 font-medium">{error}</p>}

            <button onClick={handleImport} disabled={loading}
              className="w-full py-3.5 bg-ink-700 hover:bg-ink-800 disabled:bg-paper-300 rounded-xl text-sm font-bold text-white transition-all duration-200 hover:shadow-lg active:scale-[0.98]"
            >
              {loading ? 'Processing…' : 'Start Practicing →'}
            </button>
          </div>
        </div>
      </section>

      {/* Feature pills */}
      <section className="flex flex-wrap justify-center gap-3 max-w-lg mx-auto">
        {[
          { icon: '👂', label: 'Listen', desc: 'Hear the sentence' },
          { icon: '✍️', label: 'Write', desc: 'Type from memory' },
          { icon: '🎤', label: 'Speak', desc: 'Read aloud, get feedback' },
          { icon: '🎭', label: 'Shadow', desc: 'Full-text flow practice' },
        ].map((f) => (
          <div key={f.label} className="flex items-center gap-3 px-4 py-3 bg-white rounded-full border border-paper-300 shadow-sm">
            <span className="text-lg">{f.icon}</span>
            <div>
              <span className="text-sm font-semibold text-ink-600">{f.label}</span>
              <span className="text-xs text-ink-300 ml-2 hidden sm:inline">{f.desc}</span>
            </div>
          </div>
        ))}
      </section>
    </div>
  )
}

function detectFormat(text: string): 'srt' | 'vtt' | 'txt' {
  if (/^\d+\s*\n\d{2}:\d{2}:\d{2}[,.]\d{3}\s*-->/m.test(text)) return 'srt'
  if (/^\d{2}:\d{2}:\d{2}\.\d{3}\s*-->/m.test(text) || text.includes('WEBVTT')) return 'vtt'
  return 'txt'
}
