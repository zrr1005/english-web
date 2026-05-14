import { useState, useRef } from 'react'
import { speak, startRecognition, stopRecognition, isSpeechSupported } from '../utils/speech'
import { compareWords, calcAccuracy } from '../utils/diff'
import LLMExplain from './LLMExplain'
import type { Sentence, SentenceAction, ActionType, WordResult } from '../types'

interface Props {
  sentence: Sentence
  sentenceIndex: number
  totalSentences: number
  existingActions: SentenceAction[]
  onActionComplete: (action: SentenceAction) => void
  onNext: () => void
  onPrev: () => void
}

export default function SentencePractice({
  sentence, sentenceIndex, totalSentences,
  existingActions, onActionComplete, onNext, onPrev
}: Props) {
  const [activeTool, setActiveTool] = useState<ActionType | null>(null)
  const [listened, setListened] = useState(existingActions.some(a => a.actionType === 'listen'))
  const [writeInput, setWriteInput] = useState('')
  const [writeSubmitted, setWriteSubmitted] = useState(false)
  const [writeResults, setWriteResults] = useState<WordResult[]>(existingActions.find(a => a.actionType === 'write')?.wordResults || [])
  const [writeAccuracy, setWriteAccuracy] = useState(existingActions.find(a => a.actionType === 'write')?.accuracy || 0)
  const [speakListening, setSpeakListening] = useState(false)
  const [speakTranscript, setSpeakTranscript] = useState('')
  const [speakSubmitted, setSpeakSubmitted] = useState(false)
  const [speakResults, setSpeakResults] = useState<WordResult[]>(existingActions.find(a => a.actionType === 'speak')?.wordResults || [])
  const [speakAccuracy, setSpeakAccuracy] = useState(existingActions.find(a => a.actionType === 'speak')?.accuracy || 0)
  const [speakAudioUrl, setSpeakAudioUrl] = useState<string | null>(existingActions.find(a => a.actionType === 'speak')?.audioUrl || null)
  const [speakError, setSpeakError] = useState('')
  const finalTranscript = useRef('')
  const mediaRecorder = useRef<MediaRecorder | null>(null)
  const audioChunks = useRef<Blob[]>([])
  const speechSupported = isSpeechSupported()

  function handleListen() {
    speak(sentence.text)
    setListened(true)
    onActionComplete({ sentenceIndex, actionType: 'listen', userInput: '', wordResults: [], accuracy: 100, timestamp: Date.now() })
  }

  function handleWriteSubmit() {
    if (!writeInput.trim()) return
    const results = compareWords(sentence.text, writeInput)
    const score = calcAccuracy(results)
    setWriteResults(results); setWriteAccuracy(score); setWriteSubmitted(true)
    onActionComplete({ sentenceIndex, actionType: 'write', userInput: writeInput, wordResults: results, accuracy: score, timestamp: Date.now() })
  }

  function handleWriteRetry() { setWriteInput(''); setWriteSubmitted(false); setWriteResults([]); setWriteAccuracy(0) }

  function handleSpeakStart() {
    if (!speechSupported || speakListening) return
    setSpeakError(''); setSpeakTranscript(''); finalTranscript.current = ''
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      audioChunks.current = []
      const r = new MediaRecorder(stream)
      r.ondataavailable = (e) => audioChunks.current.push(e.data)
      r.onstop = () => { const b = new Blob(audioChunks.current, { type: 'audio/webm' }); setSpeakAudioUrl(URL.createObjectURL(b)); stream.getTracks().forEach(t => t.stop()) }
      mediaRecorder.current = r; r.start()
    }).catch(() => {})
    startRecognition(
      (text, isFinal) => { if (isFinal) finalTranscript.current += ' ' + text; setSpeakTranscript(finalTranscript.current + (isFinal ? '' : ' ' + text)) },
      (err) => setSpeakError(err)
    )
    setSpeakListening(true)
  }

  function handleSpeakStop() { stopRecognition(); mediaRecorder.current?.stop(); setSpeakListening(false) }

  function handleSpeakSubmit() {
    stopRecognition(); mediaRecorder.current?.stop(); setSpeakListening(false)
    const final = finalTranscript.current.trim()
    if (!final) { setSpeakError('未检测到语音'); return }
    const results = compareWords(sentence.text, final)
    const score = calcAccuracy(results)
    setSpeakResults(results); setSpeakAccuracy(score); setSpeakTranscript(final); setSpeakSubmitted(true)
    onActionComplete({ sentenceIndex, actionType: 'speak', userInput: final, wordResults: results, accuracy: score, audioUrl: speakAudioUrl || undefined, timestamp: Date.now() })
  }

  function handleSpeakRetry() { setSpeakTranscript(''); setSpeakSubmitted(false); setSpeakResults([]); setSpeakAccuracy(0); setSpeakAudioUrl(null); finalTranscript.current = ''; setSpeakError('') }

  function handleNext() { resetAll(); onNext() }
  function handlePrev() { resetAll(); onPrev() }

  function resetAll() {
    setActiveTool(null); setWriteInput(''); setWriteSubmitted(false); setWriteResults([]); setWriteAccuracy(0)
    setSpeakTranscript(''); setSpeakSubmitted(false); setSpeakResults([]); setSpeakAccuracy(0); setSpeakAudioUrl(null); setSpeakListening(false)
    stopRecognition(); setSpeakError('')
  }

  const hasWrite = writeSubmitted || existingActions.some(a => a.actionType === 'write')
  const hasSpeak = speakSubmitted || existingActions.some(a => a.actionType === 'speak')
  const hasListen = listened || existingActions.some(a => a.actionType === 'listen')
  const writeAcc = writeAccuracy || existingActions.find(a => a.actionType === 'write')?.accuracy || 0
  const speakAcc = speakAccuracy || existingActions.find(a => a.actionType === 'speak')?.accuracy || 0

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="flex-1 h-1 bg-paper-300 rounded-full overflow-hidden">
          <div className="h-full bg-amber-400 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${((sentenceIndex + 1) / totalSentences) * 100}%` }} />
        </div>
        <span className="text-xs font-semibold text-ink-300 tabular-nums tracking-wider">
          {sentenceIndex + 1}<span className="text-ink-200">/{totalSentences}</span>
        </span>
      </div>

      <div className="text-center py-8 px-4">
        <p className="font-display text-2xl md:text-3xl text-ink-700 leading-relaxed tracking-wide italic">
          {sentence.text}
        </p>
      </div>

      <div className="flex gap-2.5 justify-center">
        <ToolButton icon="👂" label="听" done={hasListen} active={activeTool === 'listen'}
          onClick={() => { setActiveTool(activeTool === 'listen' ? null : 'listen'); handleListen() }} />
        <ToolButton icon="✍️" label="写" done={hasWrite} active={activeTool === 'write'} score={writeAcc}
          onClick={() => setActiveTool(activeTool === 'write' ? null : 'write')} />
        <ToolButton icon="🎤" label="读" done={hasSpeak} active={activeTool === 'speak'} score={speakAcc}
          onClick={() => setActiveTool(activeTool === 'speak' ? null : 'speak')} />
      </div>

      {/* 写面板 */}
      {activeTool === 'write' && !writeSubmitted && (
        <div className="bg-white rounded-2xl border border-paper-300 shadow-sm p-5 space-y-3">
          <span className="text-xs font-semibold text-ink-400 uppercase tracking-wider">默写听到的句子</span>
          <textarea value={writeInput} onChange={(e) => setWriteInput(e.target.value)}
            placeholder="输入你听到的内容…" rows={3} autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleWriteSubmit() } }}
            className="w-full bg-paper-100 border border-paper-300 rounded-xl px-4 py-3 text-sm text-ink-600 placeholder-ink-200 focus:outline-none focus:border-amber-300 transition resize-none" />
          <div className="flex gap-2">
            <button onClick={handleWriteSubmit} disabled={!writeInput.trim()}
              className="flex-1 py-2.5 bg-ink-700 hover:bg-ink-800 disabled:bg-paper-300 rounded-full text-sm font-semibold text-white transition-all hover:shadow-md active:scale-[0.98]">
              提交
            </button>
            <button onClick={() => setActiveTool(null)}
              className="px-5 py-2.5 bg-paper-200 hover:bg-paper-300 rounded-full text-sm font-medium text-ink-400 transition-colors">
              关闭
            </button>
          </div>
        </div>
      )}

      {(writeSubmitted || (hasWrite && activeTool !== 'write')) && (
        <FeedbackCard type="write" accuracy={writeAcc}
          wordResults={writeResults.length > 0 ? writeResults : existingActions.find(a => a.actionType === 'write')?.wordResults || []}
          onRetry={handleWriteRetry} sentenceText={sentence.text} />
      )}

      {/* 读面板 */}
      {activeTool === 'speak' && !speakSubmitted && (
        <div className="bg-white rounded-2xl border border-paper-300 shadow-sm p-5 space-y-4 text-center">
          <span className="text-xs font-semibold text-ink-400 uppercase tracking-wider">朗读句子</span>
          {!speechSupported && <p className="text-sm text-amber-600">语音识别需要 Chrome 浏览器</p>}
          <button onClick={speakListening ? handleSpeakStop : handleSpeakStart}
            className={`w-20 h-20 rounded-full flex items-center justify-center text-2xl mx-auto transition-all duration-300 ${
              speakListening ? 'bg-rust-500 text-white shadow-lg shadow-rust-200 scale-110' : 'bg-ink-700 hover:bg-ink-800 text-white shadow-md hover:shadow-lg'
            }`}>
            {speakListening ? '⏹' : '🎤'}
          </button>
          <p className={`text-xs font-medium ${speakListening ? 'text-rust-500' : 'text-ink-300'}`}>
            {speakListening ? '录音中… 点此停止' : '点击开始朗读'}
          </p>
          {(speakTranscript || speakListening) && (
            <div className="p-4 bg-paper-100 border border-paper-300 rounded-xl min-h-[48px] text-left">
              <p className="text-sm text-ink-500 leading-relaxed">{speakTranscript || <span className="text-ink-200 italic">正在聆听…</span>}</p>
            </div>
          )}
          {speakError && <p className="text-xs text-rust-500">{speakError}</p>}
          <div className="flex gap-2">
            <button onClick={handleSpeakSubmit} disabled={!speakTranscript.trim()}
              className="flex-1 py-2.5 bg-ink-700 hover:bg-ink-800 disabled:bg-paper-300 rounded-full text-sm font-semibold text-white transition-all hover:shadow-md active:scale-[0.98]">
              提交
            </button>
            <button onClick={() => { handleSpeakStop(); setActiveTool(null) }}
              className="px-5 py-2.5 bg-paper-200 hover:bg-paper-300 rounded-full text-sm font-medium text-ink-400 transition-colors">
              关闭
            </button>
          </div>
        </div>
      )}

      {(speakSubmitted || (hasSpeak && activeTool !== 'speak')) && (
        <FeedbackCard type="speak" accuracy={speakAcc}
          wordResults={speakResults.length > 0 ? speakResults : existingActions.find(a => a.actionType === 'speak')?.wordResults || []}
          audioUrl={speakAudioUrl || existingActions.find(a => a.actionType === 'speak')?.audioUrl}
          onRetry={handleSpeakRetry} sentenceText={sentence.text} />
      )}

      <div className="flex gap-3 pt-2">
        <button onClick={handlePrev} disabled={sentenceIndex === 0}
          className="flex-1 py-3 rounded-full text-sm font-semibold text-ink-400 hover:text-ink-600 hover:bg-paper-200 disabled:opacity-30 transition-all">
          ← 上一句
        </button>
        <button onClick={handleNext}
          className="flex-1 py-3 bg-ink-700 hover:bg-ink-800 rounded-full text-sm font-semibold text-white transition-all hover:shadow-lg active:scale-[0.98]">
          {sentenceIndex < totalSentences - 1 ? '下一句 →' : '完成 ✓'}
        </button>
      </div>
    </div>
  )
}

function ToolButton({ icon, label, done, active, score, onClick }: {
  icon: string; label: string; done: boolean; active: boolean; score?: number; onClick: () => void
}) {
  let bg = 'bg-white border-paper-300 text-ink-400 hover:border-amber-300 hover:text-ink-600'
  if (active) bg = 'bg-ink-700 border-ink-700 text-white shadow-md'
  else if (done) bg = 'bg-sage-50 border-sage-200 text-sage-600'

  return (
    <button onClick={onClick}
      className={`flex-1 py-3 rounded-full border text-sm font-semibold transition-all duration-200 active:scale-[0.97] flex items-center justify-center gap-1.5 ${bg}`}>
      <span>{icon}</span>
      <span>{done && score !== undefined ? `${label} · ${score}%` : label}</span>
    </button>
  )
}

function FeedbackCard({ type, accuracy, wordResults, audioUrl, onRetry, sentenceText }: {
  type: 'write' | 'speak'
  accuracy: number
  wordResults: WordResult[]
  audioUrl?: string | null
  onRetry: () => void
  sentenceText?: string
}) {
  if (wordResults.length === 0) return null
  const wrongWords = wordResults.filter(w => w.match !== 'correct')
  const borderColor = accuracy >= 90 ? 'border-l-sage-400' : accuracy >= 60 ? 'border-l-amber-400' : 'border-l-rust-400'
  const icon = type === 'write' ? '✍️' : '🎤'
  const typeLabel = type === 'write' ? '听写' : '朗读'

  return (
    <div className={`bg-white rounded-xl border border-paper-300 border-l-4 ${borderColor} shadow-sm p-5 space-y-3`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-ink-400 uppercase tracking-wider">{icon} {typeLabel}</span>
        <span className={`text-sm font-bold font-mono ${
          accuracy >= 90 ? 'text-sage-600' : accuracy >= 60 ? 'text-amber-600' : 'text-rust-500'
        }`}>{accuracy}%</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {wordResults.map((w, i) => (
          <span key={i} className={`text-sm px-1.5 py-0.5 rounded font-medium ${
            w.match === 'correct' ? 'bg-sage-50 text-sage-700' :
            w.match === 'missing' ? 'bg-rust-50 text-rust-500 line-through' :
            w.match === 'extra' ? 'bg-amber-50 text-amber-600' :
            'bg-rust-50 text-rust-500'
          }`}>{w.original || w.user}</span>
        ))}
      </div>
      {audioUrl && (
        <div className="flex items-center gap-2">
          <audio src={audioUrl} controls className="h-8 max-w-[240px]" />
          <button onClick={onRetry} className="text-xs text-ink-300 hover:text-ink-600 font-medium">🔄 重试</button>
        </div>
      )}
      {wrongWords.length > 0 && sentenceText && (
        <LLMExplain
          label="我错在哪？"
          systemPrompt="你是英语教练。用通俗易懂的语言解释用户犯了什么错误。针对具体的错误词分析原因。用中文回复，2-3句话。"
          userPrompt={`原句: "${sentenceText}"\n错误: ${wrongWords.map(w => `"${w.original}" → "${w.user}" (${w.match})`).join(', ')}`}
        />
      )}
    </div>
  )
}
