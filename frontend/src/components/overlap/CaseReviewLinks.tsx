import { Link } from 'react-router-dom'
import type { OverlapRow } from '../../lib/types'
export default function CaseReviewLinks({overlaps}: {overlaps: Pick<OverlapRow, 'id' | 'status'>[]}) {
  if (!overlaps.length) return null
  return <div className="flex flex-wrap gap-3 text-xs">{overlaps.map(overlap => <Link key={overlap.id} className="text-blue-300 underline" to={`/overlaps?status=${encodeURIComponent(overlap.status)}&id=${overlap.id}`}>Overlap #{overlap.id}: {overlap.status} · Open review</Link>)}</div>
}
