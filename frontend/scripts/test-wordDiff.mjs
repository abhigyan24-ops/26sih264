import assert from 'node:assert/strict'
import { test } from 'node:test'
import { computeWordDiff, isWordToken, MAX_DIFF_CHARS } from '../src/lib/wordDiff.ts'

test('1. Identical text returns all same tokens', () => {
  const text = 'The hostel fee was deducted twice without receipt.'
  const res = computeWordDiff(text, text)
  assert.equal(res.isTruncated, false)
  assert.equal(res.tokensA.length, res.tokensB.length)
  for (const t of res.tokensA) {
    assert.equal(t.type, 'same')
  }
  for (const t of res.tokensB) {
    assert.equal(t.type, 'same')
  }
})

test('2. Fully different text identifies all words as different', () => {
  const textA = 'Faculty recruitment quota violation in engineering.'
  const textB = 'Hostel building sanitation maintenance failure.'
  const res = computeWordDiff(textA, textB)

  const wordsA = res.tokensA.filter((t) => isWordToken(t.text))
  const wordsB = res.tokensB.filter((t) => isWordToken(t.text))

  assert.ok(wordsA.every((t) => t.type === 'removed'))
  assert.ok(wordsB.every((t) => t.type === 'added'))
})

test('3. One word changed identifies the specific modified word', () => {
  const textA = 'Student refund delayed by 15 days.'
  const textB = 'Student refund delayed by 90 days.'
  const res = computeWordDiff(textA, textB)

  const diffA = res.tokensA.filter((t) => t.type === 'removed')
  const diffB = res.tokensB.filter((t) => t.type === 'added')

  assert.equal(diffA.length, 1)
  assert.equal(diffA[0].text, '15')

  assert.equal(diffB.length, 1)
  assert.equal(diffB[0].text, '90')
})

test('4. Empty text cases handled safely without crashes', () => {
  const emptyRes = computeWordDiff('', '')
  assert.deepEqual(emptyRes.tokensA, [])
  assert.deepEqual(emptyRes.tokensB, [])
  assert.equal(emptyRes.isTruncated, false)

  const oneEmpty = computeWordDiff('Ragging in boys hostel', '')
  assert.ok(oneEmpty.tokensA.filter((t) => isWordToken(t.text)).every((t) => t.type === 'removed'))
  assert.deepEqual(oneEmpty.tokensB, [])

  const otherEmpty = computeWordDiff('', 'Ragging in boys hostel')
  assert.deepEqual(otherEmpty.tokensA, [])
  assert.ok(otherEmpty.tokensB.filter((t) => isWordToken(t.text)).every((t) => t.type === 'added'))
})

test('5. Hindi / Devanagari text tokenized and aligned accurately', () => {
  const hindiA = 'छात्रावास में पीने के पानी की समस्या है।'
  const hindiB = 'छात्रावास में बिजली और पानी की समस्या है।'
  const res = computeWordDiff(hindiA, hindiB)

  assert.equal(res.isTruncated, false)
  // 'छात्रावास' should match in both as 'same'
  const matchA = res.tokensA.find((t) => t.text === 'छात्रावास')
  assert.ok(matchA)
  assert.equal(matchA.type, 'same')

  // 'पानी' should match in both as 'same'
  const waterA = res.tokensA.find((t) => t.text === 'पानी')
  assert.ok(waterA)
  assert.equal(waterA.type, 'same')

  // 'पीने' in A was removed, 'बिजली' in B was added
  const removedWord = res.tokensA.find((t) => t.text === 'पीने')
  assert.ok(removedWord)
  assert.equal(removedWord.type, 'removed')

  const addedWord = res.tokensB.find((t) => t.text === 'बिजली')
  assert.ok(addedWord)
  assert.equal(addedWord.type, 'added')
})

test('6. Very long text capped at sane limit with note', () => {
  const longA = 'Irregular admission procedure. '.repeat(200)
  const longB = 'Irregular admission procedure. '.repeat(200)
  assert.ok(longA.length > MAX_DIFF_CHARS)

  const res = computeWordDiff(longA, longB)
  assert.equal(res.isTruncated, true)
  assert.ok(res.truncationNote?.includes('capped at 4000 characters'))
})
