// CaseNexus Civic Ledger: Pure Word-Level Diff Algorithm
// Supports English, Hindi/Devanagari script, punctuation preservation, and character capping.

export interface DiffToken {
  text: string
  type: 'same' | 'removed' | 'added' | 'different'
}

export interface WordDiffResult {
  tokensA: DiffToken[]
  tokensB: DiffToken[]
  isTruncated: boolean
  truncationNote?: string
}

export const MAX_DIFF_CHARS = 4000

// Unicode regex matching words in English, Devanagari (including matras \p{M}), digits, or contiguous whitespace/punctuation
const TOKEN_REGEX = /([\p{L}\p{M}\p{N}]+|[^\p{L}\p{M}\p{N}\s]+|\s+)/gu

export function isWordToken(t: string): boolean {
  return /[\p{L}\p{M}\p{N}]/u.test(t)
}

export function tokenize(text: string): string[] {
  if (!text) return []
  const matches = text.match(TOKEN_REGEX)
  return matches ? matches : []
}

function normalizeToken(t: string): string {
  return t.trim().toLowerCase()
}

export function computeWordDiff(rawA: string = '', rawB: string = ''): WordDiffResult {
  let isTruncated = false
  let truncationNote: string | undefined

  let strA = rawA ?? ''
  let strB = rawB ?? ''

  if (strA.length > MAX_DIFF_CHARS || strB.length > MAX_DIFF_CHARS) {
    isTruncated = true
    truncationNote = `Comparison capped at ${MAX_DIFF_CHARS} characters; remaining content truncated for performance.`
    strA = strA.slice(0, MAX_DIFF_CHARS)
    strB = strB.slice(0, MAX_DIFF_CHARS)
  }

  // Handle empty cases cleanly
  if (!strA && !strB) {
    return { tokensA: [], tokensB: [], isTruncated, truncationNote }
  }
  if (!strA) {
    const tokensB: DiffToken[] = tokenize(strB).map((t) => ({
      text: t,
      type: isWordToken(t) ? 'added' : 'same',
    }))
    return { tokensA: [], tokensB, isTruncated, truncationNote }
  }
  if (!strB) {
    const tokensA: DiffToken[] = tokenize(strA).map((t) => ({
      text: t,
      type: isWordToken(t) ? 'removed' : 'same',
    }))
    return { tokensA, tokensB: [], isTruncated, truncationNote }
  }

  const rawTokensA = tokenize(strA)
  const rawTokensB = tokenize(strB)

  // Fast-path: Identical strings
  if (strA === strB) {
    return {
      tokensA: rawTokensA.map((t) => ({ text: t, type: 'same' })),
      tokensB: rawTokensB.map((t) => ({ text: t, type: 'same' })),
      isTruncated,
      truncationNote,
    }
  }

  // Word-level Longest Common Subsequence (LCS) matrix
  const maxTokens = 1200
  const effTokensA = rawTokensA.length > maxTokens ? rawTokensA.slice(0, maxTokens) : rawTokensA
  const effTokensB = rawTokensB.length > maxTokens ? rawTokensB.slice(0, maxTokens) : rawTokensB

  const effM = effTokensA.length
  const effN = effTokensB.length

  const dp: number[][] = Array.from({ length: effM + 1 }, () =>
    new Uint16Array(effN + 1) as any
  )

  for (let i = 0; i < effM; i++) {
    const normA = normalizeToken(effTokensA[i])
    for (let j = 0; j < effN; j++) {
      const normB = normalizeToken(effTokensB[j])
      if (normA && normA === normB) {
        dp[i + 1][j + 1] = dp[i][j] + 1
      } else {
        dp[i + 1][j + 1] = Math.max(dp[i + 1][j], dp[i][j + 1])
      }
    }
  }

  // Backtrack to find matched indices
  const matchedA = new Set<number>()
  const matchedB = new Set<number>()

  let i = effM
  let j = effN
  while (i > 0 && j > 0) {
    const normA = normalizeToken(effTokensA[i - 1])
    const normB = normalizeToken(effTokensB[j - 1])
    if (normA && normA === normB && dp[i][j] === dp[i - 1][j - 1] + 1) {
      matchedA.add(i - 1)
      matchedB.add(j - 1)
      i--
      j--
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      i--
    } else {
      j--
    }
  }

  const tokensA: DiffToken[] = rawTokensA.map((t, idx) => {
    if (!isWordToken(t)) return { text: t, type: 'same' }
    return {
      text: t,
      type: matchedA.has(idx) ? 'same' : 'removed',
    }
  })

  const tokensB: DiffToken[] = rawTokensB.map((t, idx) => {
    if (!isWordToken(t)) return { text: t, type: 'same' }
    return {
      text: t,
      type: matchedB.has(idx) ? 'same' : 'added',
    }
  })

  return {
    tokensA,
    tokensB,
    isTruncated,
    truncationNote,
  }
}
