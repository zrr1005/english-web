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
    if (!hasLLM()) { setError('请先在设置页配置 LLM API Key。'); return }
    setTranslating(true); setError('')
    try {
      const { chineseText } = await fetchChineseSubtitles(bilibiliUrl)
      const translated = await callLLM(
        'You are a translator. Translate the following Chinese text to natural, fluent English. Output ONLY the English translation.',
        chineseText, { maxTokens: 4000 }
      )
      if (!translated) throw new Error('翻译失败')
      const sentences = parseText(translated, 'txt')
      if (sentences.length === 0) throw new Error('翻译结果无有效句子')
      const mid = crypto.randomUUID()
      await saveMaterial({
        id: mid, title: title.trim() || 'B站（AI 翻译）',
        source: 'bilibili' as const, sentences, createdAt: Date.now(),
        totalWords: sentences.reduce((s, sen) => s + sen.words.length, 0),
      })
      navigate('/library')
    } catch (e: any) { setError(e.message || '翻译失败') }
    setTranslating(false)
  }

  async function handleImport() {
    setError('')
    let sourceText = ''
    let sourceFormat: 'paste' | 'srt' | 'vtt' | 'txt' | 'bilibili' = 'paste'
    let finalTitle = title.trim()

    if (mode === 'bilibili') {
      if (!bilibiliUrl.trim()) { setError('请输入 B站视频链接。'); return }
      if (!isBilibiliUrl(bilibiliUrl)) { setError('无效的 B站链接。'); return }
      if (/b23\.tv/.test(bilibiliUrl)) { setError('不支持短链接(b23.tv)，请复制完整链接。'); return }
      setLoading(true)
      try {
        const result = await fetchBilibiliSubtitles(bilibiliUrl)
        sourceText = result.subtitles; sourceFormat = 'bilibili'
        if (!finalTitle) finalTitle = result.title
      } catch (e: any) { setError(e.message || '获取字幕失败'); setLoading(false); return }
    } else {
      sourceText = text
      sourceFormat = mode === 'file' ? detectFormat(text) : 'paste'
    }

    if (!sourceText.trim()) { setError('没有可练习的内容。'); setLoading(false); return }
    setLoading(true)
    try {
      const sentences = parseText(sourceText, sourceFormat === 'bilibili' ? 'txt' : sourceFormat)
      if (sentences.length === 0) { setError('未找到句子。'); setLoading(false); return }
      const material = {
        id: crypto.randomUUID(),
        title: finalTitle || `${new Date().toLocaleDateString()} 练习`,
        source: sourceFormat, sentences, createdAt: Date.now(),
        totalWords: sentences.reduce((s, sen) => s + sen.words.length, 0),
      }
      await saveMaterial(material)
      navigate('/library')
    } catch (e) { setError('处理文本失败') }
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
    { key: 'paste', icon: '✏️', label: '粘贴文本' },
    { key: 'file', icon: '📁', label: '上传文件' },
    { key: 'bilibili', icon: '📺', label: 'B站链接' },
  ]

  return (
    <div className="space-y-12">
      <section className="text-center pt-6 pb-2 space-y-4">
        <h1 className="font-display text-5xl md:text-6xl font-black text-ink-700 tracking-tight leading-tight">
          用你喜欢的内容<br />
          <span className="text-amber-500 italic font-medium">练英语口语</span>
        </h1>
        <p className="text-ink-300 text-lg max-w-lg mx-auto leading-relaxed">
          导入字幕、粘贴文本、或粘贴 B站视频链接。<br />然后一句一句地听、写、读。
        </p>
        {!isChrome && (
          <div className="inline-block px-4 py-2 bg-amber-50 border border-amber-200 rounded-full text-amber-700 text-sm">
            推荐使用 Chrome 浏览器以获得完整的语音功能体验
          </div>
        )}
      </section>

      <section className="max-w-xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-paper-300 overflow-hidden">
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
            <input
              type="text" value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="标题（可选）"
              className="w-full bg-paper-100 border border-paper-300 rounded-xl px-4 py-3 text-sm text-ink-600 placeholder-ink-200 focus:outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-50 transition"
            />

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
                    <span>{translating ? '翻译中…' : hasLLM() ? 'AI 翻译中文 → 英文' : '去设置页配置 LLM →'}</span>
                  </button>
                )}
                {!subStatus && (
                  <p className="text-xs text-ink-200 px-1">粘贴链接后点击空白处自动检测字幕</p>
                )}
              </div>
            )}

            {mode === 'paste' && (
              <textarea
                value={text} onChange={(e) => setText(e.target.value)}
                placeholder={"The quick brown fox jumps over the lazy dog.\nIt was a beautiful day in the neighborhood."}
                rows={10}
                className="w-full bg-paper-100 border border-paper-300 rounded-xl px-4 py-3 text-sm font-mono text-ink-600 placeholder-ink-200 focus:outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-50 transition resize-y"
              />
            )}

            {mode === 'file' && (
              <label className="flex flex-col items-center gap-3 py-12 bg-paper-100 border-2 border-dashed border-paper-300 hover:border-amber-300 rounded-xl cursor-pointer transition group">
                <span className="text-4xl group-hover:scale-110 transition-transform">📁</span>
                <span className="text-sm text-ink-300 font-medium">点击上传 .txt .srt .vtt 文件</span>
                {text && <span className="text-xs text-sage-600 font-mono">文件已加载 ✓</span>}
                <input type="file" accept=".txt,.srt,.vtt" onChange={handleFileUpload} className="hidden" />
              </label>
            )}

            {error && <p className="text-sm text-rust-500 font-medium">{error}</p>}

            <button onClick={handleImport} disabled={loading}
              className="w-full py-3.5 bg-ink-700 hover:bg-ink-800 disabled:bg-paper-300 rounded-xl text-sm font-bold text-white transition-all duration-200 hover:shadow-lg active:scale-[0.98]"
            >
              {loading ? '处理中…' : '开始练习 →'}
            </button>
          </div>
        </div>
      </section>

      <section className="flex flex-wrap justify-center gap-3 max-w-lg mx-auto">
        {[
          { icon: '👂', label: '听', desc: '听原文发音' },
          { icon: '✍️', label: '写', desc: '默写逐词对比' },
          { icon: '🎤', label: '读', desc: '朗读获取反馈' },
          { icon: '🎭', label: '跟读', desc: '整篇流式练习' },
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
