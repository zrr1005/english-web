/**
 * Web Speech API wrappers — SpeechSynthesis (TTS) and SpeechRecognition (STT)
 */

// ============ TTS (Text-to-Speech) ============

let ttsUtterance: SpeechSynthesisUtterance | null = null

export function speak(text: string, rate: number = 1): Promise<void> {
  return new Promise((resolve) => {
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-US'
    utterance.rate = rate
    utterance.pitch = 1
    utterance.volume = 1

    // Try to pick a good English voice
    const voices = window.speechSynthesis.getVoices()
    const enVoice = voices.find(v => v.lang === 'en-US' && v.name.includes('Google'))
      || voices.find(v => v.lang === 'en-US')
      || voices.find(v => v.lang.startsWith('en'))
    if (enVoice) utterance.voice = enVoice

    utterance.onend = () => resolve()
    utterance.onerror = () => resolve()

    ttsUtterance = utterance
    window.speechSynthesis.speak(utterance)
  })
}

export function stopSpeaking() {
  window.speechSynthesis.cancel()
}

export function setSpeakingRate(rate: number) {
  // Store for next speak call
}

// ============ STT (Speech-to-Text) ============

// Type declaration for browsers that use vendor prefix
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition
    webkitSpeechRecognition: typeof SpeechRecognition
  }
}

let recognition: SpeechRecognition | null = null

export function isSpeechSupported(): boolean {
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition)
}

export function startRecognition(
  onResult: (transcript: string, isFinal: boolean) => void,
  onError?: (error: string) => void
): void {
  const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!SpeechRecognitionCtor) {
    onError?.('Speech recognition not supported in this browser.')
    return
  }

  stopRecognition()

  recognition = new SpeechRecognitionCtor()
  recognition.lang = 'en-US'
  recognition.continuous = true
  recognition.interimResults = true
  recognition.maxAlternatives = 1

  recognition.onresult = (event: SpeechRecognitionEvent) => {
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i]
      const transcript = result[0].transcript
      onResult(transcript, result.isFinal)
    }
  }

  recognition.onerror = (event) => {
    if (event.error === 'no-speech') {
      // Don't report no-speech as an error — it's normal when user is silent
      return
    }
    onError?.(event.error)
  }

  recognition.onend = () => {
    // Could auto-restart if needed
  }

  recognition.start()
}

export function stopRecognition(): void {
  if (recognition) {
    recognition.stop()
    recognition = null
  }
}
