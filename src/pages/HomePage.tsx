import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { parseText } from '../utils/parser'
import { saveMaterial } from '../utils/storage'
import { fetchBilibiliSubtitles, isBilibiliUrl, extractBvid } from '../utils/bilibili'

type ImportMode = 'paste' | 'file' | 'bilibili'

export default function HomePage() {
  const [text, setText] = useState('')
  const [title, setTitle] = useState('')
  const [mode, setMode] = useState<ImportMode>('paste')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [bilibiliUrl, setBilibiliUrl] = useState('')
  const navigate = useNavigate()

  const isChrome = /Chrome/.test(navigator.userAgent) && !/Edge|OPR/.test(navigator.userAgent)

  async function handleImport() {
    setError('')
    let sourceText = ''
    let sourceFormat: 'paste' | 'srt' | 'vtt' | 'txt' | 'bilibili' = 'paste'

    if (mode === 'bilibili') {
      if (!bilibiliUrl.trim()) {
        setError('Please enter a Bilibili video URL.')
        return
      }
      if (!isBilibiliUrl(bilibiliUrl)) {
        setError('Not a valid Bilibili URL.')
        return
      }
      if (/b23\.tv/.test(bilibiliUrl)) {
        setError('Short links (b23.tv) are not supported. Please copy the full URL from your browser.')
        return
      }
      setLoading(true)
      try {
        const result = await fetchBilibiliSubtitles(bilibiliUrl)
        sourceText = result.subtitles
        sourceFormat = 'bilibili'
        if (!title.trim()) setTitle(result.title)
      } catch (e: any) {
        setError(e.message || 'Failed to fetch subtitles from Bilibili.')
        setLoading(false)
        return
      }
    } else {
      sourceText = text
      sourceFormat = mode === 'file' ? detectFormat(text) : 'paste'
    }

    if (!sourceText.trim()) {
      setError(mode === 'bilibili'
        ? 'No English subtitles found on this video.'
        : 'Please enter some English text.')
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const sentences = parseText(sourceText, sourceFormat === 'bilibili' ? 'txt' : sourceFormat)
      if (sentences.length === 0) {
        setError('No sentences found. Please check your input.')
        setLoading(false)
        return
      }

      const material = {
        id: crypto.randomUUID(),
        title: title.trim() || `Practice ${new Date().toLocaleDateString()}`,
        source: sourceFormat,
        sentences,
        createdAt: Date.now(),
        totalWords: sentences.reduce((sum, s) => sum + s.words.length, 0),
      }
      await saveMaterial(material)
      navigate(`/practice/${material.id}`)
    } catch (e) {
      setError('Failed to process text. Please try again.')
    }
    setLoading(false)
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const content = ev.target?.result as string
      setText(content)
      if (!title) setTitle(file.name.replace(/\.\w+$/, ''))
    }
    reader.readAsText(file)
    setMode('file')
  }

  function switchMode(m: ImportMode) {
    setMode(m)
    setError('')
    setText('')
    setBilibiliUrl('')
  }

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="text-center py-8">
        <h1 className="text-4xl md:text-5xl font-extrabold mb-3 bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
          SpeakEasy
        </h1>
        <p className="text-gray-400 text-lg max-w-md mx-auto">
          Import any English text or subtitle, then practice speaking, writing, and shadowing.
        </p>
        {!isChrome && (
          <div className="mt-4 p-3 bg-yellow-900/30 border border-yellow-700/50 rounded-lg text-yellow-300 text-sm max-w-md mx-auto">
            Speech recognition works best in Chrome. Please switch for the full experience.
          </div>
        )}
      </section>

      {/* Import Panel */}
      <section className="max-w-2xl mx-auto space-y-4">
        {/* Mode tabs */}
        <div className="flex gap-1 bg-gray-900 rounded-lg p-1">
          {([
            { key: 'paste' as const, icon: '✏️', label: 'Paste Text' },
            { key: 'file' as const, icon: '📁', label: 'Upload File' },
            { key: 'bilibili' as const, icon: '📺', label: 'Bilibili' },
          ]).map((t) => (
            <button
              key={t.key}
              onClick={() => switchMode(t.key)}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition flex items-center justify-center gap-1.5 ${
                mode === t.key
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <span>{t.icon}</span>
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title (optional)"
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-sm placeholder-gray-500 focus:outline-none focus:border-indigo-500"
        />

        {/* Bilibili mode — URL input */}
        {mode === 'bilibili' && (
          <div className="space-y-2">
            <input
              type="text"
              value={bilibiliUrl}
              onChange={(e) => setBilibiliUrl(e.target.value)}
              placeholder="Paste Bilibili video URL, e.g. https://www.bilibili.com/video/BV1xx411c7mD"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-sm placeholder-gray-500 focus:outline-none focus:border-indigo-500 font-mono"
            />
            <p className="text-xs text-gray-600">
              The video must have English subtitles uploaded. Uses Chrome proxy for API access.
            </p>
          </div>
        )}

        {/* Paste / File mode — textarea */}
        {mode !== 'bilibili' && (
          <>
            {mode === 'file' && (
              <label className="block w-full py-10 bg-gray-900 border-2 border-dashed border-gray-700 hover:border-indigo-500 rounded-lg text-center cursor-pointer transition">
                <div className="text-3xl mb-2">📁</div>
                <p className="text-sm text-gray-400">Click to upload .txt .srt .vtt file</p>
                <input type="file" accept=".txt,.srt,.vtt" onChange={handleFileUpload} className="hidden" />
              </label>
            )}
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={
                mode === 'paste'
                  ? 'Paste English text here...\n\nExample:\nThe quick brown fox jumps over the lazy dog. It was a beautiful day in the neighborhood.'
                  : 'File content will appear here...'
              }
              rows={mode === 'file' ? 6 : 12}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-sm placeholder-gray-500 focus:outline-none focus:border-indigo-500 resize-y font-mono"
            />
          </>
        )}

        {error && (
          <p className="text-red-400 text-sm">{error}</p>
        )}

        <button
          onClick={handleImport}
          disabled={loading}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 rounded-lg font-semibold transition text-white"
        >
          {loading ? 'Fetching subtitles...' : 'Start Practicing →'}
        </button>
      </section>

      {/* Feature cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto pt-4">
        {[
          { icon: '✍️', title: 'Write', desc: 'Dictation mode — listen and type each sentence.' },
          { icon: '🎤', title: 'Speak', desc: 'Read aloud and get instant pronunciation feedback.' },
          { icon: '🎭', title: 'Shadow', desc: 'Shadow the audio — auto-play and repeat.' },
        ].map((f) => (
          <div key={f.title} className="p-4 bg-gray-900 border border-gray-800 rounded-xl text-center">
            <div className="text-3xl mb-2">{f.icon}</div>
            <h3 className="font-semibold mb-1">{f.title}</h3>
            <p className="text-gray-500 text-sm">{f.desc}</p>
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
