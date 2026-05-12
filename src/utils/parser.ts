import type { Sentence } from '../types'

/**
 * Parse input text into sentences.
 * Supports plain text and SRT/VTT subtitle formats.
 */
export function parseText(text: string, format: 'srt' | 'vtt' | 'txt' | 'paste' = 'txt'): Sentence[] {
  if (format === 'srt') return parseSRT(text)
  if (format === 'vtt') return parseVTT(text)
  return parsePlainText(text)
}

/** Clean and normalize a subtitle line (remove HTML tags, speaker labels, etc.) */
function cleanLine(line: string): string {
  return line
    .replace(/<[^>]+>/g, '')        // remove HTML tags
    .replace(/♪.*?♪/g, '')          // remove music notes
    .replace(/\[.*?\]/g, '')        // remove [sound effects]
    .replace(/^[A-Z]+:\s*/gm, '')   // remove speaker labels like "JOHN: "
    .replace(/\{.*?\}/g, '')        // remove {style} tags
    .replace(/\s+/g, ' ')           // collapse whitespace
    .trim()
}

function parseSRT(text: string): Sentence[] {
  const blocks = text.split(/\n\s*\n/)
  const sentences: Sentence[] = []
  let index = 0

  for (const block of blocks) {
    const lines = block.trim().split('\n')
    if (lines.length < 3) continue

    // Find the timestamp line
    const timeLine = lines.find((l) => /-->/ .test(l))
    if (!timeLine) continue

    const times = parseSRTTimes(timeLine)
    // Content is everything after the timestamp line
    const contentLines = lines.slice(lines.indexOf(timeLine) + 1)
    const content = cleanLine(contentLines.join(' '))
    if (!content) continue

    // Split content into sentences if it contains multiple
    const subSentences = splitSentences(content)
    for (const sub of subSentences) {
      if (sub.trim()) {
        sentences.push({
          index: index++,
          text: sub.trim(),
          words: sub.trim().split(/\s+/).filter(w => w.length > 0),
          startTime: times.start,
          endTime: times.end,
        })
      }
    }
  }

  return sentences
}

function parseSRTTimes(line: string): { start: number; end: number } {
  const match = line.match(/(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/)
  if (!match) return { start: 0, end: 0 }
  return {
    start: +match[1] * 3600 + +match[2] * 60 + +match[3] + +match[4] / 1000,
    end: +match[5] * 3600 + +match[6] * 60 + +match[7] + +match[8] / 1000,
  }
}

function parseVTT(text: string): Sentence[] {
  // Remove WEBVTT header
  const body = text.replace(/^WEBVTT.*\n/, '').trim()
  // VTT uses similar block structure to SRT
  const blocks = body.split(/\n\s*\n/)
  const sentences: Sentence[] = []
  let index = 0

  for (const block of blocks) {
    const lines = block.trim().split('\n')
    if (lines.length < 2) continue

    const timeLine = lines.find((l) => /-->/ .test(l))
    if (!timeLine) continue

    const times = parseVTTTimes(timeLine)
    const contentLines = lines.slice(lines.indexOf(timeLine) + 1)
    const content = cleanLine(contentLines.join(' '))
    if (!content) continue

    const subSentences = splitSentences(content)
    for (const sub of subSentences) {
      if (sub.trim()) {
        sentences.push({
          index: index++,
          text: sub.trim(),
          words: sub.trim().split(/\s+/).filter(w => w.length > 0),
          startTime: times.start,
          endTime: times.end,
        })
      }
    }
  }

  return sentences
}

function parseVTTTimes(line: string): { start: number; end: number } {
  // VTT timestamps: 00:00:00.000 --> 00:00:05.000
  const match = line.match(/(\d{2}):(\d{2}):(\d{2})\.(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})\.(\d{3})/)
  if (!match) return { start: 0, end: 0 }
  return {
    start: +match[1] * 3600 + +match[2] * 60 + +match[3] + +match[4] / 1000,
    end: +match[5] * 3600 + +match[6] * 60 + +match[7] + +match[8] / 1000,
  }
}

function parsePlainText(text: string): Sentence[] {
  const sentences = splitSentences(text)
  return sentences
    .filter((s) => s.trim().length > 0)
    .map((s, i) => ({
      index: i,
      text: s.trim(),
      words: s.trim().split(/\s+/).filter(w => w.length > 0),
    }))
}

/**
 * Split text into sentences. Strategy (in order):
 *   1. Punctuation-based (. ! ?)
 *   2. Newline-based (common in subtitle exports without punctuation)
 *   3. Word-count-based (force split every ~18 words as last resort)
 */
function splitSentences(text: string): string[] {
  const cleaned = text.replace(/\s+/g, ' ').trim()
  if (!cleaned) return []

  // Step 1: Try punctuation-based splitting
  const punctSplit = cleaned.match(/[^.!?\n]+(?:\.(?!\d|[a-z])|[.!?\n]|$)/g)
  if (punctSplit && punctSplit.length > 0) {
    const raw = punctSplit.map(s => s.trim()).filter(s => s.length > 0)
    // Check each segment — if any is too long, force-split it
    return raw.flatMap(s => splitLongSentence(s))
  }

  // Step 2: No punctuation found — try splitting by newlines
  const lines = cleaned.split(/\n+/).map(s => s.trim()).filter(s => s.length > 0)
  if (lines.length > 1) {
    // Subtitle-style: each line is one sentence
    return lines.flatMap(s => splitLongSentence(s))
  }

  // Step 3: Single blob — force-split by word count
  return splitLongSentence(cleaned)
}

/**
 * If a sentence exceeds MAX_WORDS, chunk it into smaller pieces.
 * Cuts at natural pause points (comma, semicolon) when possible,
 * otherwise splits at word boundaries.
 */
const MAX_WORDS = 20
const CHUNK_SIZE = 16

function splitLongSentence(sentence: string): string[] {
  const words = sentence.trim().split(/\s+/).filter(w => w.length > 0)
  if (words.length <= MAX_WORDS) return [sentence.trim()]

  // Try splitting on pause punctuation first
  const pausePoints = sentence.match(/[,;—–()]/g)
  if (pausePoints && pausePoints.length >= 2) {
    const parts = sentence.split(/[,;—–]\s+/)
    const result: string[] = []
    let buffer = ''
    for (const part of parts) {
      if ((buffer + ' ' + part).trim().split(/\s+/).length <= MAX_WORDS) {
        buffer = buffer ? buffer + ', ' + part : part
      } else {
        if (buffer) result.push(buffer.trim())
        buffer = part
      }
    }
    if (buffer) result.push(buffer.trim())
    if (result.length > 1) return result
  }

  // Fallback: brute-force word chunking
  const chunks: string[] = []
  for (let i = 0; i < words.length; i += CHUNK_SIZE) {
    chunks.push(words.slice(i, i + CHUNK_SIZE).join(' '))
  }
  return chunks
}

export { splitSentences, splitLongSentence, MAX_WORDS }
