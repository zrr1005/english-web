import { useState, useRef, useCallback, useEffect } from 'react'
import { speak, stopSpeaking, startRecognition, stopRecognition, isSpeechSupported } from '../utils/speech'
import { compareWords, calcAccuracy } from '../utils/diff'
import type { Sentence, WordResult } from '../types'

interface Props {
  sentences: Sentence[]
  onComplete: (results: { sentenceIndex: number; userInput: string; wordResults: WordResult[]; accuracy: number }[]) => void
}

export default function ShadowMode({ sentences, onComplete }: Props) {
  const [currentIdx, setCurrentIdx] = useState(0)
  const [rate, setRate] = useState(1)
  const [mode, setMode] = useState<'manual' | 'auto'>('auto')
  const [phase, setPhase] = useState<'idle' | 'playing' | 'listening' | 'scoring'>('idle')
  const [transcript, setTranscript] = useState('')
  const [wordResults, setWordResults] = useState<WordResult[]>([])
  const [accuracy, setAccuracy] = useState(0)
  const [results, setResults] = useState<{ sentenceIndex: number; userInput: string; wordResults: WordResult[]; accuracy: number }[]>([])
  const finalTranscript = useRef('')
  const supported = isSpeechSupported()
  const silenceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const currentSentence = sentences[currentIdx]

  // Auto-flow logic
  const playThenListen = useCallback(async (idx: number) => {
    if (idx >= sentences.length) {
      // Done
      onComplete(results)
      return
    }
    setCurrentIdx(idx)
    setPhase('playing')
    setTranscript('')
    finalTranscript.current = ''

    await speak(sentences[idx].text, rate)

    // After TTS, start listening
    setPhase('listening')
    startRecognition(
      (text, isFinal) => {
        if (isFinal) {
          finalTranscript.current += ' ' + text
        }
        setTranscript(finalTranscript.current + (isFinal ? '' : ' ' + text))

        // Reset silence timer on new speech
        if (silenceTimer.current) clearTimeout(silenceTimer.current)
        if (isFinal) {
          // Short silence after final result → auto submit
          silenceTimer.current = setTimeout(() => {
            handleAutoSubmit(idx)
          }, 1500)
        }
      },
      (err) => {
        console.error('Recognition error:', err)
        // Auto advance on error after 2s
        setTimeout(() => handleAutoSubmit(idx), 2000)
      }
    )
  }, [sentences, rate, results])

  function handleAutoSubmit(idx: number) {
    stopRecognition()
    setPhase('scoring')
    const final = finalTranscript.current.trim()
    const res = compareWords(sentences[idx].text, final)
    const score = calcAccuracy(res)
    setWordResults(res)
    setAccuracy(score)
    setTranscript(final)

    const newResults = [...results, { sentenceIndex: idx, userInput: final, wordResults: res, accuracy: score }]
    setResults(newResults)

    // Auto advance after showing score for 1.5s
    setTimeout(() => {
      if (mode === 'auto' && idx + 1 < sentences.length) {
        playThenListen(idx + 1)
      } else if (idx + 1 >= sentences.length) {
        onComplete(newResults)
      }
    }, 1500)
  }

  function handleStart() {
    setResults([])
    playThenListen(0)
  }

  function handleManualNext() {
    stopRecognition()
    stopSpeaking()
    const final = finalTranscript.current.trim()
    const res = compareWords(currentSentence.text, final)
    const score = calcAccuracy(res)
    setWordResults(res)
    setAccuracy(score)
    setTranscript(final)
    setPhase('scoring')

    const newResults = [...results, { sentenceIndex: currentIdx, userInput: final, wordResults: res, accuracy: score }]
    setResults(newResults)

    if (currentIdx + 1 < sentences.length) {
      setTimeout(() => {
        setCurrentIdx(currentIdx + 1)
        setPhase('idle')
        setTranscript('')
        finalTranscript.current = ''
      }, 100)
    } else {
      onComplete(newResults)
    }
  }

  function handleStop() {
    stopSpeaking()
    stopRecognition()
    setPhase('idle')
  }

  if (!supported) {
    return (
      <div className="text-center py-10">
        <p className="text-yellow-400">⚠️ Speech recognition not supported. Please use Chrome.</p>
      </div>
    )
  }

  const isRunning = phase === 'playing' || phase === 'listening'

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center gap-4 flex-wrap">
        <button
          onClick={isRunning ? handleStop : handleStart}
          className={`px-6 py-2.5 rounded-lg font-medium transition text-sm ${
            isRunning
              ? 'bg-red-600 hover:bg-red-500'
              : 'bg-indigo-600 hover:bg-indigo-500'
          }`}
        >
          {isRunning ? '⏹ Stop' : '▶ Start Shadowing'}
        </button>

        {/* Rate selector */}
        <div className="flex items-center gap-1 bg-gray-900 rounded-lg p-1">
          {[0.5, 0.75, 1, 1.25].map((r) => (
            <button
              key={r}
              onClick={() => setRate(r)}
              className={`px-3 py-1.5 text-xs rounded transition ${
                rate === r ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              {r}x
            </button>
          ))}
        </div>

        {/* Mode toggle */}
        <div className="flex items-center gap-1 bg-gray-900 rounded-lg p-1">
          <button
            onClick={() => setMode('auto')}
            className={`px-3 py-1.5 text-xs rounded transition ${
              mode === 'auto' ? 'bg-indigo-600 text-white' : 'text-gray-400'
            }`}
          >
            Auto
          </button>
          <button
            onClick={() => setMode('manual')}
            className={`px-3 py-1.5 text-xs rounded transition ${
              mode === 'manual' ? 'bg-indigo-600 text-white' : 'text-gray-400'
            }`}
          >
            Manual
          </button>
        </div>
      </div>

      {/* Overall progress */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all"
            style={{ width: `${((currentIdx) / sentences.length) * 100}%` }}
          />
        </div>
        <span className="text-sm text-gray-500">{currentIdx}/{sentences.length}</span>
      </div>

      {/* Current sentence */}
      <div className={`p-4 rounded-xl border transition-all ${
        phase === 'playing' ? 'bg-blue-900/20 border-blue-800' :
        phase === 'listening' ? 'bg-green-900/20 border-green-800' :
        phase === 'scoring' ? 'bg-purple-900/20 border-purple-800' :
        'bg-gray-900 border-gray-800'
      }`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-500 uppercase tracking-wider">
            {phase === 'playing' ? '🔊 Playing...' :
             phase === 'listening' ? '🎤 Your turn — repeat!' :
             phase === 'scoring' ? '📊 Score' :
             'Ready'}
          </span>
          {phase === 'listening' && (
            <span className="text-xs text-green-400 animate-pulse">Recording</span>
          )}
        </div>
        <p className="text-lg text-gray-200 leading-relaxed">{currentSentence.text}</p>
      </div>

      {/* Transcript (during listening/scoring) */}
      {(phase === 'listening' || phase === 'scoring') && (
        <div className="p-4 bg-gray-900 border border-gray-700 rounded-xl min-h-[50px]">
          <p className="text-gray-400 text-sm">
            {transcript || <span className="text-gray-600 italic">Listening...</span>}
          </p>
        </div>
      )}

      {/* Scoring display */}
      {phase === 'scoring' && (
        <div className="p-4 bg-gray-900 border border-gray-800 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Accuracy</span>
            <span className={`text-lg font-bold ${
              accuracy >= 90 ? 'text-green-400' : accuracy >= 60 ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {accuracy}%
            </span>
          </div>
          <div className="flex flex-wrap gap-1">
            {wordResults.map((w, i) => (
              <span
                key={i}
                className={`text-sm px-1 py-0.5 rounded ${
                  w.match === 'correct' ? 'bg-green-900/40 text-green-300' :
                  w.match === 'missing' ? 'bg-red-900/40 text-red-300 line-through' :
                  w.match === 'extra' ? 'bg-yellow-900/40 text-yellow-300' :
                  'bg-red-900/40 text-red-300'
                }`}
              >
                {w.original || w.user}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Manual next button */}
      {mode === 'manual' && phase === 'idle' && currentIdx > 0 && (
        <button
          onClick={handleManualNext}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-medium transition"
        >
          Next Sentence →
        </button>
      )}
    </div>
  )
}
