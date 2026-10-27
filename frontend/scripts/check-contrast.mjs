// CaseNexus Civic Ledger Token Contrast Verifier (WCAG 2.1)
// Run with: node scripts/check-contrast.mjs

function hexToRgb(hex) {
  const clean = hex.replace('#', '')
  return {
    r: parseInt(clean.substring(0, 2), 16),
    g: parseInt(clean.substring(2, 4), 16),
    b: parseInt(clean.substring(4, 6), 16),
  }
}

function sRgbToLin(val) {
  const norm = val / 255
  return norm <= 0.04045 ? norm / 12.92 : Math.pow((norm + 0.055) / 1.055, 2.4)
}

function relativeLuminance(rgb) {
  const r = sRgbToLin(rgb.r)
  const g = sRgbToLin(rgb.g)
  const b = sRgbToLin(rgb.b)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrastRatio(hex1, hex2) {
  const l1 = relativeLuminance(hexToRgb(hex1))
  const l2 = relativeLuminance(hexToRgb(hex2))
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

const pairs = [
  // Text pairs (minimum 4.5:1)
  { label: 'Text on --bg', fg: '#1B1F24', bg: '#F6F5F1', min: 4.5, type: 'text' },
  { label: 'Text on --surface', fg: '#1B1F24', bg: '#FFFFFF', min: 4.5, type: 'text' },
  { label: 'Muted text on --bg', fg: '#5B6068', bg: '#F6F5F1', min: 4.5, type: 'text' },
  { label: 'Muted text on --surface', fg: '#5B6068', bg: '#FFFFFF', min: 4.5, type: 'text' },
  { label: 'White text on --primary', fg: '#FFFFFF', bg: '#1F3A5F', min: 4.5, type: 'text' },
  { label: 'White text on --primary-hover', fg: '#FFFFFF', bg: '#17304F', min: 4.5, type: 'text' },
  { label: 'Sidebar text on --sidebar', fg: '#E8EDF3', bg: '#14233A', min: 4.5, type: 'text' },
  { label: 'Sidebar muted on --sidebar', fg: '#A9B6C6', bg: '#14233A', min: 4.5, type: 'text' },
  { label: 'Accent on --bg', fg: '#8A4B08', bg: '#F6F5F1', min: 4.5, type: 'text' },
  { label: 'Accent on --surface', fg: '#8A4B08', bg: '#FFFFFF', min: 4.5, type: 'text' },
  { label: 'High critical status on tint', fg: '#B42318', bg: '#FDECEA', min: 4.5, type: 'text' },
  { label: 'Medium status on tint', fg: '#9A4A00', bg: '#FFF3E0', min: 4.5, type: 'text' },
  { label: 'Info status on tint', fg: '#175CD3', bg: '#E8F0FE', min: 4.5, type: 'text' },
  { label: 'OK / disposed status on tint', fg: '#067647', bg: '#E6F4EC', min: 4.5, type: 'text' },

  // Control and indicator pairs (minimum 3.0:1)
  { label: 'Strong border on --bg', fg: '#8C8A82', bg: '#F6F5F1', min: 3.0, type: 'control' },
  { label: 'Strong border on --surface', fg: '#8C8A82', bg: '#FFFFFF', min: 3.0, type: 'control' },
  { label: 'Focus ring on --bg', fg: '#1F6FEB', bg: '#F6F5F1', min: 3.0, type: 'control' },
  { label: 'Focus ring on --surface', fg: '#1F6FEB', bg: '#FFFFFF', min: 3.0, type: 'control' },
]

console.log('── Civic Ledger WCAG 2.1 Contrast Ratio Verification ──')
let failed = 0

for (const p of pairs) {
  const ratio = contrastRatio(p.fg, p.bg)
  const passed = ratio >= p.min
  const mark = passed ? 'PASS' : 'FAIL'
  console.log(
    `[${mark}] ${p.label.padEnd(32)} ${p.fg} on ${p.bg} -> ${ratio.toFixed(2)}:1 (min ${p.min}:1)`
  )
  if (!passed) failed++
}

console.log('────────────────────────────────────────────────────────')
if (failed > 0) {
  console.error(`Contrast check FAILED with ${failed} violations.`)
  process.exit(1)
} else {
  console.log(`All ${pairs.length} contrast pairs passed successfully.`)
  process.exit(0)
}
