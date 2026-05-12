import type { WordResult } from '../types'

/**
 * Compare user input with original text, word by word.
 * Uses a simplified Needleman-Wunsch style alignment.
 */
export function compareWords(original: string, user: string): WordResult[] {
  const origWords = original.trim().split(/\s+/).filter(w => w.length > 0)
  const userWords = user.trim().split(/\s+/).filter(w => w.length > 0)

  const results: WordResult[] = []

  // Normalize both for comparison
  const normOrig = origWords.map(w => normalizeWord(w))
  const normUser = userWords.map(w => normalizeWord(w))

  // Greedy LCS alignment
  let oi = 0
  let ui = 0

  while (oi < origWords.length || ui < userWords.length) {
    if (oi >= origWords.length) {
      // Extra words from user
      results.push({ original: '', user: userWords[ui], match: 'extra' })
      ui++
      continue
    }
    if (ui >= userWords.length) {
      // Missing original words
      results.push({ original: origWords[oi], user: '', match: 'missing' })
      oi++
      continue
    }

    const origNorm = normOrig[oi]
    const userNorm = normUser[ui]

    // Check for match (exact or fuzzy)
    if (origNorm === userNorm || fuzzyMatch(origNorm, userNorm)) {
      results.push({ original: origWords[oi], user: userWords[ui], match: 'correct' })
      oi++
      ui++
    } else {
      // Look ahead to see if the user word matches the next original word
      // (user might have missed a word)
      if (oi + 1 < origWords.length && (normOrig[oi + 1] === userNorm || fuzzyMatch(normOrig[oi + 1], userNorm))) {
        results.push({ original: origWords[oi], user: '', match: 'missing' })
        oi++
      } else if (ui + 1 < userWords.length && (origNorm === normUser[ui + 1] || fuzzyMatch(origNorm, normUser[ui + 1]))) {
        results.push({ original: '', user: userWords[ui], match: 'extra' })
        ui++
      } else {
        results.push({ original: origWords[oi], user: userWords[ui], match: 'incorrect' })
        oi++
        ui++
      }
    }
  }

  return results
}

/** Calculate accuracy percentage from word results */
export function calcAccuracy(results: WordResult[]): number {
  if (results.length === 0) return 100
  const correct = results.filter(r => r.match === 'correct').length
  return Math.round((correct / results.length) * 100)
}

/** Fuzzy match: allows minor spelling differences (Levenshtein distance <= 2 and word length >= 4) */
function fuzzyMatch(a: string, b: string): boolean {
  if (a === b) return true
  if (Math.abs(a.length - b.length) > 2) return false
  // Only apply fuzzy matching for longer words to avoid false positives
  if (a.length < 4 || b.length < 4) return false
  const dist = levenshtein(a, b)
  return dist <= Math.min(2, Math.floor(Math.min(a.length, b.length) * 0.3))
}

function normalizeWord(word: string): string {
  return word.toLowerCase().replace(/[^a-z0-9']/g, '')
}

function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      )
    }
  }
  return dp[m][n]
}

export { normalizeWord, levenshtein }
