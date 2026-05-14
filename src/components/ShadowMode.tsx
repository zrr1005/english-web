import { useState, useRef, useCallback } from 'react'
import { speak, stopSpeaking, startRecognition, stopRecognition, isSpeechSupported } from '../utils/speech'
import { compareWords, calcAccuracy } from '../utils/diff'
import type { Sentence, WordResult } from '../types'

interface Props {
  sentences: Sentence[]
  onComplete: (results: { sentenceIndex: number; userInput: string; wordResults: WordResult[]; accuracy: number }[]) => void
}

export default function ShadowMode({ sentences, onComplete }: Props) {
  const [currentIdx, setCurrentIdx] = useState(0)
  const [rate, setRate] = useState(0.75)
  const [autoMode, setAutoMode] = useState(false)
  const [phase, setPhase] = useState<'idle' | 'playing' | 'listening' | 'scoring'>('idle')
  const [transcript, setTranscript] = useState('')
  const [wordResults, setWordResults] = useState<WordResult[]>([])
  const [accuracy, setAccuracy] = useState(0)
  const [results, setResults] = useState<{ sentenceIndex: number; userInput: string; wordResults: WordResult[]; accuracy: number }[]>([])
  const finalTranscript = useRef('')
  const silenceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const supported = isSpeechSupported()

  const playThenListen = useCallback(async (idx: number) => {
    if (idx >= sentences.length) { onComplete(results); return }
    setCurrentIdx(idx); setPhase('playing'); setTranscript(''); finalTranscript.current = ''
    await speak(sentences[idx].text, rate)
    setPhase('listening')
    startRecognition(
      (text, isFinal) => {
        if (isFinal) finalTranscript.current += ' ' + text
        setTranscript(finalTranscript.current + (isFinal ? '' : ' ' + text))
        if (silenceTimer.current) clearTimeout(silenceTimer.current)
        if (isFinal) silenceTimer.current = setTimeout(() => submitSentence(idx), 1500)
      },
      () => setTimeout(() => submitSentence(idx), 2000)
    )
  }, [sentences, rate])

  function submitSentence(idx: number) {
    stopRecognition(); setPhase('scoring')
    const final = finalTranscript.current.trim()
    const res = compareWords(sentences[idx].text, final)
    const score = calcAccuracy(res)
    setWordResults(res); setAccuracy(score); setTranscript(final)
    const nr = [...results, { sentenceIndex: idx, userInput: final, wordResults: res, accuracy: score }]
    setResults(nr)
    if (autoMode && idx + 1 < sentences.length) setTimeout(() => playThenListen(idx + 1), 1800)
    else if (idx + 1 >= sentences.length) setTimeout(() => onComplete(nr), 800)
  }

  function handleStart() { setResults([]); playThenListen(0) }
  function handleStop() { stopSpeaking(); stopRecognition(); setPhase('idle') }

  function handleManualNext() {
    stopRecognition(); stopSpeaking()
    const final = finalTranscript.current.trim()
    const res = compareWords(sentences[currentIdx].text, final); const score = calcAccuracy(res)
    setWordResults(res); setAccuracy(score); setTranscript(final); setPhase('scoring')
    const nr = [...results, { sentenceIndex: currentIdx, userInput: final, wordResults: res, accuracy: score }]
    setResults(nr)
    if (currentIdx + 1 < sentences.length) {
      setTimeout(() => { setCurrentIdx(currentIdx + 1); setPhase('idle'); setTranscript(''); finalTranscript.current = '' }, 200)
    } else setTimeout(() => onComplete(nr), 800)
  }

  if (!supported) return <p className="text-center text-amber-600 py-12">Speech recognition requires Chrome.</p>

  const isRunning = phase !== 'idle'
  const phaseBg = phase === 'playing' ? 'border-l-ink-400 bg-ink-50/50' :
    phase === 'listening' ? 'border-l-sage-400 bg-sage-50/50' :
    phase === 'scoring' ? 'border-l-amber-400 bg-amber-50/50' : ''

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={isRunning ? handleStop : handleStart}
          className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all ${
            isRunning ? 'bg-rust-500 hover:bg-rust-600 text-white' : 'bg-ink-700 hover:bg-ink-800 text-white hover:shadow-lg'
          }`}>
          {isRunning ? '⏹ Stop' : '▶ Start'}
        </button>
        <div className="flex bg-paper-200 rounded-full p-1 gap-0.5">
          {[0.5, 0.75, 1, 1.25].map(r => (
            <button key={r} onClick={() => setRate(r)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                rate === r ? 'bg-white text-ink-700 shadow-sm' : 'text-ink-300 hover:text-ink-500'
              }`}>{r}x</button>
          ))}
        </div>
        <button onClick={() => setAutoMode(!autoMode)}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition ${
            autoMode ? 'bg-sage-50 border-sage-200 text-sage-600' : 'bg-white border-paper-300 text-ink-400'
          }`}>
          {autoMode ? 'Auto' : 'Manual'}
        </button>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1 bg-paper-300 rounded-full overflow-hidden">
          <div className="h-full bg-amber-400 rounded-full transition-all duration-500"
            style={{ width: `${(currentIdx / sentences.length) * 100}%` }} />
        </div>
        <span className="text-xs font-semibold text-ink-300 tabular-nums">{currentIdx}/{sentences.length}</span>
      </div>

      {/* Current sentence */}
      <div className={`rounded-2xl border border-paper-300 border-l-4 p-8 text-center transition-colors duration-300 ${phaseBg}`}>
        <span className="text-xs font-semibold text-ink-400 uppercase tracking-wider block mb-3">
          {phase === 'playing' ? '🔊 Playing' : phase === 'listening' ? '🎤 Your turn — speak now' : phase === 'scoring' ? '📊 Scored' : 'Ready'}
        </span>
        <p className="font-display text-2xl md:text-3xl text-ink-700 leading-relaxed italic">
          {sentences[currentIdx]?.text}
        </p>
      </div>

      {/* Transcript */}
      {phase === 'listening' && (
        <div className="p-5 bg-white rounded-xl border border-paper-300 shadow-sm min-h-[60px]">
          <p className="text-sm text-ink-500 leading-relaxed">{transcript || <span className="text-ink-200 italic">Listening...</span>}</p>
        </div>
      )}

      {/* Score */}
      {phase === 'scoring' && (
        <div className="bg-white rounded-xl border border-paper-300 shadow-sm p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-ink-500">Accuracy</span>
            <span className={`text-lg font-bold ${accuracy >= 90 ? 'text-sage-600' : accuracy >= 60 ? 'text-amber-600' : 'text-rust-500'}`}>{accuracy}%</span>
          </div>
          <div className="flex flex-wrap gap-1">{wordResults.map((w, i) => (
            <span key={i} className={`text-sm px-1.5 py-0.5 rounded font-medium ${
              w.match === 'correct' ? 'bg-sage-50 text-sage-700' : w.match === 'missing' ? 'bg-rust-50 text-rust-500 line-through' : w.match === 'extra' ? 'bg-amber-50 text-amber-600' : 'bg-rust-50 text-rust-500'
            }`}>{w.original || w.user}</span>
          ))}</div>
        </div>
      )}

      {/* Manual next */}
      {!autoMode && phase === 'idle' && currentIdx > 0 && (
        <button onClick={handleManualNext}
          className="w-full py-3 bg-ink-700 hover:bg-ink-800 rounded-full text-sm font-bold text-white transition-all hover:shadow-lg">
          Next Sentence →
        </button>
      )}
    </div>
  )
}
