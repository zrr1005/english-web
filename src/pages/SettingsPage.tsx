import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSettings, saveSettings, clearSettings, clearLLMCache, getProviderPreset, type LLMSettings } from '../utils/llm'

export default function SettingsPage() {
  const navigate = useNavigate()
  const [settings, setSettings] = useState<LLMSettings | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const s = getSettings()
    setSettings(s || { apiKey: '', provider: 'openai', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' })
  }, [])

  function handleProviderChange(provider: string) {
    if (!settings) return
    const preset = getProviderPreset(provider)
    setSettings({ ...settings, provider: preset.provider as LLMSettings['provider'], baseUrl: preset.baseUrl, model: preset.model })
  }

  function handleSave() {
    if (!settings?.apiKey.trim()) return
    saveSettings(settings); clearLLMCache(); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function handleClear() { clearSettings(); clearLLMCache(); setSettings({ apiKey: '', provider: 'openai', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' }) }

  if (!settings) return null

  return (
    <div className="max-w-lg mx-auto space-y-8">
      <button onClick={() => navigate(-1)} className="text-sm text-ink-300 hover:text-ink-600 transition-colors">← 返回</button>

      <div>
        <h1 className="font-display text-3xl font-bold text-ink-700">设置</h1>
        <p className="text-ink-300 mt-2 text-sm leading-relaxed">
          配置 LLM API 以解锁 AI 功能：字幕翻译、发音指导和词汇解释。你的 Key 只保存在浏览器本地。
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-paper-300 shadow-sm p-6 space-y-5">
        <div>
          <label className="block text-xs font-semibold text-ink-400 uppercase tracking-wider mb-1.5">服务商</label>
          <select value={settings.provider} onChange={(e) => handleProviderChange(e.target.value)}
            className="w-full bg-paper-100 border border-paper-300 rounded-xl px-4 py-3 text-sm text-ink-600 focus:outline-none focus:border-amber-300 transition">
            <option value="openai">OpenAI</option>
            <option value="deepseek">DeepSeek</option>
            <option value="qwen">通义千问 (Qwen)</option>
            <option value="custom">自定义 (兼容 OpenAI)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-ink-400 uppercase tracking-wider mb-1.5">API Key</label>
          <input type="password" value={settings.apiKey}
            onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
            placeholder="sk-..." className="w-full bg-paper-100 border border-paper-300 rounded-xl px-4 py-3 text-sm font-mono text-ink-600 placeholder-ink-200 focus:outline-none focus:border-amber-300 transition" />
          <p className="text-xs text-ink-200 mt-1.5">仅在浏览器 localStorage 中存储，不会上传到任何服务器。</p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-ink-400 uppercase tracking-wider mb-1.5">接口地址</label>
          <input type="text" value={settings.baseUrl}
            onChange={(e) => setSettings({ ...settings, baseUrl: e.target.value })}
            className="w-full bg-paper-100 border border-paper-300 rounded-xl px-4 py-3 text-sm font-mono text-ink-600 focus:outline-none focus:border-amber-300 transition" />
        </div>

        <div>
          <label className="block text-xs font-semibold text-ink-400 uppercase tracking-wider mb-1.5">模型</label>
          <input type="text" value={settings.model}
            onChange={(e) => setSettings({ ...settings, model: e.target.value })}
            className="w-full bg-paper-100 border border-paper-300 rounded-xl px-4 py-3 text-sm font-mono text-ink-600 focus:outline-none focus:border-amber-300 transition" />
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={handleSave} disabled={!settings.apiKey.trim()}
            className="flex-1 py-3 bg-ink-700 hover:bg-ink-800 disabled:bg-paper-300 rounded-full text-sm font-bold text-white transition-all hover:shadow-lg active:scale-[0.98]">
            {saved ? '已保存 ✓' : '保存'}
          </button>
          <button onClick={handleClear}
            className="px-6 py-3 text-sm text-ink-300 hover:text-rust-500 hover:bg-rust-50 rounded-full transition-colors font-medium">
            清除
          </button>
        </div>
      </div>

      <div className="bg-paper-200 rounded-2xl p-6 space-y-2">
        <h3 className="text-sm font-semibold text-ink-500 mb-3">如何获取 API Key</h3>
        {[
          { name: 'OpenAI', url: 'platform.openai.com/api-keys', price: '$5 起' },
          { name: 'DeepSeek', url: 'platform.deepseek.com/api_keys', price: '¥1/百万 token' },
          { name: '通义千问', url: 'dashscope.console.aliyun.com/apiKey', price: '有免费额度' },
        ].map((p) => (
          <div key={p.name} className="flex items-center justify-between text-sm">
            <span className="font-medium text-ink-600">{p.name}</span>
            <span className="text-ink-300">{p.price}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
