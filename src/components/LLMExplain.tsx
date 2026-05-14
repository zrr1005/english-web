import { useState } from 'react'
import { callLLM, hasLLM } from '../utils/llm'

interface Props {
  systemPrompt: string
  userPrompt: string
  label: string
}

export default function LLMExplain({ systemPrompt, userPrompt, label }: Props) {
  const [result, setResult] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!hasLLM()) return null

  async function handleClick() {
    if (result) { setResult(null); return }
    setLoading(true); setError('')
    const res = await callLLM(systemPrompt, userPrompt)
    setLoading(false)
    if (res) setResult(res)
    else setError('调用失败，请检查 API Key 或网络')
  }

  return (
    <div>
      <button onClick={handleClick} disabled={loading}
        className="text-xs text-amber-600 hover:text-amber-700 font-medium transition-colors">
        {loading ? '思考中…' : result ? `收起 ${label}` : `✨ ${label}`}
      </button>
      {error && <p className="text-xs text-rust-500 mt-1">{error}</p>}
      {result && (
        <div className="mt-2 p-3 bg-amber-50 border border-amber-100 rounded-xl">
          <p className="text-sm text-ink-600 leading-relaxed">{result}</p>
        </div>
      )}
    </div>
  )
}
