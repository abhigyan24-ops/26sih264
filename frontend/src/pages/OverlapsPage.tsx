import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { listOverlaps, loadOverlap } from '../api/overlaps'
import OverlapCard from '../components/overlap/OverlapCard'

export default function OverlapsPage() {
  const [params, setParams] = useSearchParams()
  const status = params.get('status') ?? 'suggested'
  const focusId = Number(params.get('id')) || 0
  const [level, setLevel] = useState('')
  const [offset, setOffset] = useState(0)
  const [message, setMessage] = useState('')
  const list = useQuery({queryKey: ['overlaps', status, level, offset], queryFn: () => listOverlaps(status, level, offset), enabled: !focusId})
  const focused = useQuery({queryKey: ['overlap', focusId], queryFn: () => loadOverlap(focusId), enabled: focusId > 0})
  const active = focusId ? focused : list
  const items = focusId ? (focused.data ? [focused.data] : []) : list.data?.data ?? []
  return <div className="p-6 space-y-5">
    <h1 className="text-xl font-bold">Review overlaps</h1>
    <div className="flex flex-wrap gap-3 items-center">
      <div role="tablist" aria-label="Overlap status">{['suggested', 'confirmed', 'dismissed'].map(value => <button key={value} role="tab" aria-selected={status === value} className="btn-secondary capitalize mr-2" onClick={() => {setParams({status:value}); setOffset(0)}}>{value}</button>)}</div>
      <label className="text-sm">Level <select className="select" value={level} onChange={event => {setLevel(event.target.value); setOffset(0); setParams({status})}}><option value="">All</option>{['high','medium','info'].map(value => <option key={value} value={value}>{value}</option>)}</select></label>
    </div>
    {message && <div role="status" className="card p-3 text-emerald-300 flex justify-between">{message}<button aria-label="Dismiss notification" onClick={() => setMessage('')}>×</button></div>}
    {active.isPending ? <p className="text-slate-400">Loading overlaps…</p> : active.isError ? <div role="alert" className="card p-5 text-rose-300">Could not load overlaps. <button className="btn-secondary" onClick={() => void active.refetch()}>Retry</button></div> : items.length === 0 ? <p className="card p-8 text-slate-400">No {status} overlaps found.</p> : <div className="space-y-4">{items.map(overlap => <OverlapCard key={overlap.id} overlap={overlap} notify={setMessage} />)}</div>}
    {!focusId && <div className="flex justify-between items-center text-sm"><button className="btn-secondary" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - 20))}>Previous</button><span>{list.data?.total ?? 0} overlaps · Page {offset / 20 + 1}</span><button className="btn-secondary" disabled={!list.data || offset + 20 >= list.data.total} onClick={() => setOffset(offset + 20)}>Next</button></div>}
  </div>
}
