import { useState, useRef } from 'react'
import { speak, stopSpeaking, startRecognition, stopRecognition, isSpeechSupported } from '../utils/speech'
import { compareWords, calcAccuracy } from '../utils/diff'
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
  // Which tool is currently "open"
  const [activeTool, setActiveTool] = useState<ActionType | null>(null)

  // Listen state
  const [listened, setListened] = useState(
    existingActions.some(a => a.actionType === 'listen')
  )

  // Write state
  const [writeInput, setWriteInput] = useState('')
  const [writeSubmitted, setWriteSubmitted] = useState(false)
  const [writeResults, setWriteResults] = useState<WordResult[]>(
    existingActions.find(a => a.actionType === 'write')?.wordResults || []
  )
  const [writeAccuracy, setWriteAccuracy] = useState(
    existingActions.find(a => a.actionType === 'write')?.accuracy || 0
  )

  // Speak state
  const [speakListening, setSpeakListening] = useState(false)
  const [speakTranscript, setSpeakTranscript] = useState('')
  const [speakSubmitted, setSpeakSubmitted] = useState(false)
  const [speakResults, setSpeakResults] = useState<WordResult[]>(
    existingActions.find(a => a.actionType === 'speak')?.wordResults || []
  )
  const [speakAccuracy, setSpeakAccuracy] = useState(
    existingActions.find(a => a.actionType === 'speak')?.accuracy || 0
  )
  const [speakAudioUrl, setSpeakAudioUrl] = useState<string | null>(
    existingActions.find(a => a.actionType === 'speak')?.audioUrl || null
  )
  const [speakError, setSpeakError] = useState('')

  const finalTranscript = useRef('')
  const speechSupported = isSpeechSupported()
  const mediaRecorder = useRef<MediaRecorder | null>(null)
  const audioChunks = useRef<Blob[]>([])

  // Listen: is just a one-click action, no sub-state needed beyond "done" check
  function handleListen() {
    speak(sentence.text)
    const action: SentenceAction = {
      sentenceIndex,
      actionType: 'listen',
      userInput: '',
      wordResults: [],
      accuracy: 100,
      timestamp: Date.now(),
    }
    setListened(true)
    onActionComplete(action)
  }

  // Write handlers
  function handleWriteSubmit() {
    if (!writeInput.trim()) return
    const results = compareWords(sentence.text, writeInput)
    const score = calcAccuracy(results)
    setWriteResults(results)
    setWriteAccuracy(score)
    setWriteSubmitted(true)
    onActionComplete({
      sentenceIndex,
      actionType: 'write',
      userInput: writeInput,
      wordResults: results,
      accuracy: score,
      timestamp: Date.now(),
    })
  }

  function handleWriteRetry() {
    setWriteInput('')
    setWriteSubmitted(false)
    setWriteResults([])
    setWriteAccuracy(0)
  }

  // Speak handlers
  function handleSpeakStart() {
    if (!speechSupported || speakListening) return
    setSpeakError('')
    setSpeakTranscript('')
    finalTranscript.current = ''

    // Also start MediaRecorder for playback
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      audioChunks.current = []
      const recorder = new MediaRecorder(stream)
      recorder.ondataavailable = (e) => audioChunks.current.push(e.data)
      recorder.onstop = () => {
        const blob = new Blob(audioChunks.current, { type: 'audio/webm' })
        setSpeakAudioUrl(URL.createObjectURL(blob))
        stream.getTracks().forEach(t => t.stop())
      }
      mediaRecorder.current = recorder
      recorder.start()
    }).catch(() => {
      // MediaRecorder failed — fine, just skip playback
    })

    startRecognition(
      (text, isFinal) => {
        if (isFinal) finalTranscript.current += ' ' + text
        setSpeakTranscript(finalTranscript.current + (isFinal ? '' : ' ' + text))
      },
      (err) => setSpeakError(err)
    )
    setSpeakListening(true)
  }

  function handleSpeakStop() {
    stopRecognition()
    mediaRecorder.current?.stop()
    setSpeakListening(false)
  }

  function handleSpeakSubmit() {
    stopRecognition()
    mediaRecorder.current?.stop()
    setSpeakListening(false)

    const final = finalTranscript.current.trim()
    if (!final) {
      setSpeakError('No speech detected. Please try again.')
      return
    }
    const results = compareWords(sentence.text, final)
    const score = calcAccuracy(results)
    setSpeakResults(results)
    setSpeakAccuracy(score)
    setSpeakTranscript(final)
    setSpeakSubmitted(true)
    onActionComplete({
      sentenceIndex,
      actionType: 'speak',
      userInput: final,
      wordResults: results,
      accuracy: score,
      audioUrl: speakAudioUrl || undefined,
      timestamp: Date.now(),
    })
  }

  function handleSpeakRetry() {
    setSpeakTranscript('')
    setSpeakSubmitted(false)
    setSpeakResults([])
    setSpeakAccuracy(0)
    setSpeakAudioUrl(null)
    finalTranscript.current = ''
    setSpeakError('')
  }

  // Navigation
  function handleNext() {
    resetAllTools()
    onNext()
  }

  function handlePrev() {
    resetAllTools()
    onPrev()
  }

  function resetAllTools() {
    setActiveTool(null)
    setWriteInput('')
    setWriteSubmitted(false)
    setWriteResults([])
    setWriteAccuracy(0)
    setSpeakTranscript('')
    setSpeakSubmitted(false)
    setSpeakResults([])
    setSpeakAccuracy(0)
    setSpeakAudioUrl(null)
    setSpeakListening(false)
    stopRecognition()
    setSpeakError('')
  }

  const hasWriteDone = writeSubmitted || existingActions.some(a => a.actionType === 'write')
  const hasSpeakDone = speakSubmitted || existingActions.some(a => a.actionType === 'speak')
  const hasListenDone = listened || existingActions.some(a => a.actionType === 'listen')

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all duration-300"
            style={{ width: `${((sentenceIndex + 1) / totalSentences) * 100}%` }}
          />
        </div>
        <span className="text-sm text-gray-500 tabular-nums">
          {sentenceIndex + 1}/{totalSentences}
        </span>
      </div>

      {/* Current sentence — prominent */}
      <div className="p-5 bg-gray-900 border-2 border-indigo-500/40 rounded-xl ring-1 ring-indigo-500/20">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-indigo-400 font-semibold tracking-wider uppercase">
            Sentence {sentenceIndex + 1}
          </span>
        </div>
        <p className="text-xl text-gray-100 leading-relaxed font-medium">
          {sentence.text}
        </p>
      </div>

      {/* Tool buttons — always visible */}
      <div className="flex gap-3">
        <button
          onClick={() => { setActiveTool(activeTool === 'listen' ? null : 'listen'); handleListen() }}
          className={`flex-1 py-3 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 ${
            hasListenDone
              ? 'bg-green-900/30 border border-green-700/50 text-green-300'
              : 'bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700'
          }`}
        >
          🔊 {hasListenDone ? 'Listened ✓' : 'Listen'}
        </button>
        <button
          onClick={() => setActiveTool(activeTool === 'write' ? null : 'write')}
          className={`flex-1 py-3 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 ${
            activeTool === 'write'
              ? 'bg-indigo-600 text-white'
              : hasWriteDone
              ? 'bg-green-900/30 border border-green-700/50 text-green-300'
              : 'bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700'
          }`}
        >
          ✍️ {hasWriteDone ? `Written · ${writeAccuracy || existingActions.find(a => a.actionType === 'write')?.accuracy || 0}%` : 'Write'}
        </button>
        <button
          onClick={() => setActiveTool(activeTool === 'speak' ? null : 'speak')}
          className={`flex-1 py-3 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 ${
            activeTool === 'speak'
              ? 'bg-indigo-600 text-white'
              : hasSpeakDone
              ? 'bg-green-900/30 border border-green-700/50 text-green-300'
              : 'bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700'
          }`}
        >
          🎤 {hasSpeakDone ? `Spoken · ${speakAccuracy || existingActions.find(a => a.actionType === 'speak')?.accuracy || 0}%` : 'Speak'}
        </button>
      </div>

      {/* Write panel */}
      {activeTool === 'write' && !writeSubmitted && (
        <div className="space-y-3 p-4 bg-gray-900 border border-gray-700 rounded-xl">
          <span className="text-xs text-gray-500 uppercase tracking-wider">Write what you hear</span>
          <textarea
            value={writeInput}
            onChange={(e) => setWriteInput(e.target.value)}
            placeholder="Type the sentence from memory..."
            rows={3}
            className="w-full bg-gray-950 border border-gray-700 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 resize-none"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleWriteSubmit() }
            }}
          />
          <div className="flex gap-2">
            <button onClick={handleWriteSubmit} disabled={!writeInput.trim()}
              className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 rounded-lg text-sm font-medium transition">
              Check
            </button>
            <button onClick={() => setActiveTool(null)}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition">
              Close
            </button>
          </div>
        </div>
      )}

      {/* Write feedback (also shows from existingActions) */}
      {(writeSubmitted || (hasWriteDone && activeTool !== 'write')) && (
        <FeedbackBlock
          label="✍️ Writing"
          accuracy={writeAccuracy || existingActions.find(a => a.actionType === 'write')?.accuracy || 0}
          wordResults={writeResults.length > 0 ? writeResults : existingActions.find(a => a.actionType === 'write')?.wordResults || []}
          onRetry={handleWriteRetry}
        />
      )}

      {/* Speak panel */}
      {activeTool === 'speak' && !speakSubmitted && (
        <div className="space-y-4 p-4 bg-gray-900 border border-gray-700 rounded-xl">
          <span className="text-xs text-gray-500 uppercase tracking-wider">Read aloud</span>

          {!speechSupported && (
            <p className="text-yellow-400 text-sm">Speech recognition requires Chrome.</p>
          )}

          <div className="flex flex-col items-center gap-3">
            <button
              onClick={speakListening ? handleSpeakStop : handleSpeakStart}
              className={`w-20 h-20 rounded-full flex items-center justify-center text-2xl transition-all ${
                speakListening
                  ? 'bg-red-600 animate-pulse shadow-lg shadow-red-600/30'
                  : 'bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30'
              }`}
            >
              {speakListening ? '⏹' : '🎤'}
            </button>
            <span className={`text-sm ${speakListening ? 'text-red-400' : 'text-gray-500'}`}>
              {speakListening ? 'Recording... tap to stop' : 'Tap to start'}
            </span>
          </div>

          {(speakTranscript || speakListening) && (
            <div className="p-3 bg-gray-950 border border-gray-700 rounded-lg min-h-[50px]">
              <p className="text-gray-300 text-sm">{speakTranscript || <span className="text-gray-600 italic">Speak now...</span>}</p>
            </div>
          )}

          {speakError && <p className="text-red-400 text-sm text-center">{speakError}</p>}

          <div className="flex gap-2">
            <button onClick={handleSpeakSubmit} disabled={!speakTranscript.trim()}
              className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 rounded-lg text-sm font-medium transition">
              Check Pronunciation
            </button>
            <button onClick={() => { handleSpeakStop(); setActiveTool(null) }}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition">
              Close
            </button>
          </div>
        </div>
      )}

      {/* Speak feedback */}
      {(speakSubmitted || (hasSpeakDone && activeTool !== 'speak')) && (
        <FeedbackBlock
          label="🎤 Speaking"
          accuracy={speakAccuracy || existingActions.find(a => a.actionType === 'speak')?.accuracy || 0}
          wordResults={speakResults.length > 0 ? speakResults : existingActions.find(a => a.actionType === 'speak')?.wordResults || []}
          audioUrl={speakAudioUrl || existingActions.find(a => a.actionType === 'speak')?.audioUrl}
          onRetry={handleSpeakRetry}
        />
      )}

      {/* Navigation */}
      <div className="flex gap-3 pt-2">
        <button onClick={handlePrev} disabled={sentenceIndex === 0}
          className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-30 rounded-lg text-sm font-medium transition">
          ← Previous
        </button>
        <button onClick={handleNext}
          className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium transition">
          {sentenceIndex < totalSentences - 1 ? 'Next →' : 'Finish ✓'}
        </button>
      </div>
    </div>
  )
}

/** Inline feedback block for write/speak results */
function FeedbackBlock({ label, accuracy, wordResults, audioUrl, onRetry }: {
  label: string
  accuracy: number
  wordResults: WordResult[]
  audioUrl?: string | null
  onRetry: () => void
}) {
  if (wordResults.length === 0) return null

  return (
    <div className="p-4 bg-gray-900 border border-gray-800 rounded-xl">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-500 uppercase tracking-wider">{label}</span>
        <span className={`text-sm font-bold font-mono ${
          accuracy >= 90 ? 'text-green-400' : accuracy >= 60 ? 'text-yellow-400' : 'text-red-400'
        }`}>
          {accuracy}%
        </span>
      </div>
      <div className="flex flex-wrap gap-1 leading-relaxed mb-2">
        {wordResults.map((w, i) => (
          <span key={i} className={`text-sm px-1.5 py-0.5 rounded ${
            w.match === 'correct' ? 'bg-green-900/40 text-green-300' :
            w.match === 'missing' ? 'bg-red-900/40 text-red-300 line-through' :
            w.match === 'extra' ? 'bg-yellow-900/40 text-yellow-300' :
            'bg-red-900/40 text-red-300'
          }`}>
            {w.original || w.user}
          </span>
        ))}
      </div>
      {audioUrl && (
        <div className="flex items-center gap-2 mt-2">
          <audio src={audioUrl} controls className="h-8 w-full max-w-xs" />
          <button onClick={onRetry} className="text-xs text-gray-400 hover:text-white shrink-0">🔄</button>
        </div>
      )}
    </div>
  )
}
