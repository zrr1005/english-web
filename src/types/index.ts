export interface TextMaterial {
  id: string
  title: string
  source: 'paste' | 'srt' | 'vtt' | 'txt' | 'bilibili'
  sentences: Sentence[]
  createdAt: number
  totalWords: number
  translation?: string
  translationSource?: 'bilibili' | 'llm' | 'manual'
}

export interface MaterialWithScores extends TextMaterial {
  dictationScore: number | null
  shadowScore: number | null
}

export interface Sentence {
  index: number
  text: string
  words: string[]
  startTime?: number
  endTime?: number
}

export type ActionType = 'listen' | 'write' | 'speak'

export interface SentenceAction {
  sentenceIndex: number
  actionType: ActionType
  userInput: string
  wordResults: WordResult[]
  accuracy: number
  audioUrl?: string
  timestamp: number
}

export interface PracticeRecord {
  id: string
  materialId: string
  actions: SentenceAction[]
  overallScore: number
  duration: number
  createdAt: number
}

export interface WordResult {
  original: string
  user: string
  match: 'correct' | 'incorrect' | 'missing' | 'extra'
}

export type PracticeMode = 'practice' | 'shadow'

// Legacy type for backward compatibility
export interface SentenceResult {
  sentenceIndex: number
  userInput: string
  originalText: string
  wordResults: WordResult[]
  accuracy: number
  attempts: number
}
