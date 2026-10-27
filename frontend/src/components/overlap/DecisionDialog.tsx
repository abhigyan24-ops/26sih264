import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { dismissReasons, saveDecision } from '../../api/overlaps'
import type { Overlap, Decision } from '../../api/overlaps'

export default function DecisionDialog({overlap, decision, close, notify}: {overlap: Overlap; decision: 'link' | 'dismiss'; close: () => void; notify: (message: string) => void}) {
  const [lead, setLead] = useState(overlap.a_bureau)
  const [hold, setHold] = useState(false)
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const reasons = useQuery({queryKey: ['dismiss-reasons'], queryFn: dismissReasons, enabled: decision === 'dismiss'})
  const qc = useQueryClient()
  const refresh = () => {
    for (const key of ['overlaps', 'overlap', 'case', 'cases', 'alerts', 'dashboard']) void qc.invalidateQueries({queryKey: [key]})
  }
  const mutation = useMutation({
    mutationFn: (body: Decision) => saveDecision(overlap.id, body),
    onSuccess: () => { refresh(); notify(decision === 'link' ? 'Cases linked successfully' : 'Overlap dismissed'); close() },
    onError: error => {
      if (isAxiosError(error) && error.response?.status === 409) { refresh(); notify('This overlap was already decided. The list has been refreshed.'); close() }
    },
  })
  const ready = decision === 'link' ? !!lead : !!reason && (reason !== 'other' || !!note.trim())
  return <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onKeyDown={event => {if (event.key === 'Escape' && !mutation.isPending) close()}}>
    <section role="dialog" aria-modal="true" aria-labelledby="decision-heading" className="card p-6 w-full max-w-lg space-y-4">
      <h2 id="decision-heading" className="font-semibold">{decision === 'link' ? 'Link cases' : 'Not related'}</h2>
      <p className="text-sm text-slate-400">{overlap.a_ref} / {overlap.b_ref}</p>
      <form className="space-y-4" onSubmit={event => {event.preventDefault(); if (ready) mutation.mutate({decision, lead_bureau: decision === 'link' ? lead : undefined, hold_other: decision === 'link' && hold, reason: decision === 'dismiss' ? reason : undefined, note: note.trim() || undefined})}}>
        {decision === 'link' ? <>
          <label className="block text-sm">Lead bureau<select autoFocus className="select mt-1 w-full" value={lead} onChange={event => setLead(event.target.value)} disabled={mutation.isPending}>{[...new Set([overlap.a_bureau, overlap.b_bureau])].map(code => <option key={code}>{code}</option>)}</select></label>
          <label className="flex gap-2 text-sm"><input type="checkbox" checked={hold} disabled={mutation.isPending} onChange={event => setHold(event.target.checked)} /> Hold the other case</label>
        </> : reasons.isPending ? <p>Loading reasons…</p> : reasons.isError ? <p role="alert" className="text-rose-300">Could not load dismissal reasons.</p> : <label className="block text-sm">Reason<select autoFocus className="select w-full mt-1" value={reason} onChange={event => setReason(event.target.value)} disabled={mutation.isPending}><option value="">Choose a reason</option>{reasons.data.map(value => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}</select></label>}
        <label className="block text-sm">Note {reason === 'other' ? '(required)' : '(optional)'}<textarea className="input w-full mt-1" value={note} maxLength={2000} onChange={event => setNote(event.target.value)} disabled={mutation.isPending} required={decision === 'dismiss' && reason === 'other'} /></label>
        {mutation.isError && <p role="alert" className="text-sm text-rose-300">Could not save this decision. Please retry.</p>}
        <div className="flex justify-end gap-3"><button type="button" className="btn-secondary" disabled={mutation.isPending} onClick={close}>Cancel</button><button className="btn-primary" disabled={!ready || mutation.isPending}>{mutation.isPending ? 'Saving…' : 'Confirm decision'}</button></div>
      </form>
    </section>
  </div>
}
