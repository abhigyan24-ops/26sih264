import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { dismissReasons, saveDecision } from '../../api/overlaps'
import type { Overlap, Decision } from '../../api/overlaps'
import { X, Link2, XCircle } from 'lucide-react'

export default function DecisionDialog({
  overlap,
  decision,
  close,
  notify,
}: {
  overlap: Overlap
  decision: 'link' | 'dismiss'
  close: () => void
  notify: (message: string) => void
}) {
  const [lead, setLead] = useState(overlap.a_bureau)
  const [hold, setHold] = useState(false)
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const reasons = useQuery({
    queryKey: ['dismiss-reasons'],
    queryFn: dismissReasons,
    enabled: decision === 'dismiss',
  })
  const qc = useQueryClient()
  const refresh = () => {
    for (const key of ['overlaps', 'overlap', 'case', 'cases', 'alerts', 'dashboard']) {
      void qc.invalidateQueries({ queryKey: [key] })
    }
  }
  const mutation = useMutation({
    mutationFn: (body: Decision) => saveDecision(overlap.id, body),
    onSuccess: () => {
      refresh()
      notify(decision === 'link' ? 'Cases linked successfully' : 'Overlap dismissed')
      close()
    },
    onError: (error) => {
      if (isAxiosError(error) && error.response?.status === 409) {
        refresh()
        notify('This overlap was already decided. The list has been refreshed.')
        close()
      }
    },
  })
  const ready = decision === 'link' ? !!lead : !!reason && (reason !== 'other' || !!note.trim())

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="decision-heading"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && !mutation.isPending) close()
      }}
    >
      <section className="bg-[#FFFFFF] border border-[#DAD6CC] rounded-[6px] shadow-xl p-6 w-full max-w-lg space-y-4">
        <div className="flex items-center justify-between border-b border-[#DAD6CC] pb-3">
          <div className="flex items-center gap-2">
            {decision === 'link' ? (
              <Link2 className="w-4 h-4 text-[#1F3A5F]" />
            ) : (
              <XCircle className="w-4 h-4 text-[#B42318]" />
            )}
            <h2 id="decision-heading" className="text-sm font-semibold text-[#1B1F24]">
              {decision === 'link' ? 'Link Grievance Filings & Nominate Lead' : 'Dismiss Overlap (Not Related)'}
            </h2>
          </div>
          <button
            type="button"
            onClick={close}
            disabled={mutation.isPending}
            className="text-[#5B6068] hover:text-[#1B1F24] p-1 rounded hover:bg-[#EFEDE7]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs font-mono text-[#5B6068]">
          Pair: <strong className="text-[#1B1F24]">{overlap.a_ref}</strong> ({overlap.a_bureau}) &amp; <strong className="text-[#1B1F24]">{overlap.b_ref}</strong> ({overlap.b_bureau})
        </p>

        <form
          className="space-y-4 text-xs"
          onSubmit={(event) => {
            event.preventDefault()
            if (ready) {
              mutation.mutate({
                decision,
                lead_bureau: decision === 'link' ? lead : undefined,
                hold_other: decision === 'link' && hold,
                reason: decision === 'dismiss' ? reason : undefined,
                note: note.trim() || undefined,
              })
            }
          }}
        >
          {decision === 'link' ? (
            <>
              <div>
                <label className="block font-medium text-[#1B1F24] mb-1">
                  Designate Lead Coordinating Bureau *
                </label>
                <select
                  autoFocus
                  className="w-full px-2.5 py-1.5 text-xs text-[#1B1F24] bg-[#FFFFFF] border border-[#8C8A82] rounded-[4px] focus:outline-none focus:border-[#1F6FEB]"
                  value={lead}
                  onChange={(event) => setLead(event.target.value)}
                  disabled={mutation.isPending}
                >
                  {[...new Set([overlap.a_bureau, overlap.b_bureau])].map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hold}
                  disabled={mutation.isPending}
                  onChange={(event) => setHold(event.target.checked)}
                  className="rounded border-[#8C8A82] text-[#1F3A5F] focus:ring-[#1F6FEB]"
                />
                <span className="text-[#1B1F24] font-medium">
                  Place non-lead grievance on parallel action hold
                </span>
              </label>
            </>
          ) : reasons.isPending ? (
            <p className="text-xs text-[#5B6068]">Loading dismissal reasons…</p>
          ) : reasons.isError ? (
            <p role="alert" className="text-xs text-[#B42318]">
              Could not load dismissal reasons.
            </p>
          ) : (
            <div>
              <label className="block font-medium text-[#1B1F24] mb-1">
                Reason for Dismissal *
              </label>
              <select
                autoFocus
                className="w-full px-2.5 py-1.5 text-xs text-[#1B1F24] bg-[#FFFFFF] border border-[#8C8A82] rounded-[4px] focus:outline-none focus:border-[#1F6FEB]"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                disabled={mutation.isPending}
              >
                <option value="">Choose a reason</option>
                {reasons.data?.map((value) => (
                  <option key={value} value={value}>
                    {value.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block font-medium text-[#1B1F24] mb-1">
              Officer Directive / Explanation {reason === 'other' ? '(Required)' : '(Optional)'}
            </label>
            <textarea
              className="w-full px-2.5 py-1.5 text-xs text-[#1B1F24] bg-[#FFFFFF] border border-[#8C8A82] rounded-[4px] placeholder:text-[#5B6068] focus:outline-none focus:border-[#1F6FEB]"
              rows={3}
              value={note}
              maxLength={2000}
              onChange={(event) => setNote(event.target.value)}
              disabled={mutation.isPending}
              required={decision === 'dismiss' && reason === 'other'}
              placeholder="Record operational rationale for linking or dismissing this pair..."
            />
          </div>

          {mutation.isError && (
            <p role="alert" className="text-xs text-[#B42318]">
              Could not save this decision. Please retry.
            </p>
          )}

          <div className="flex justify-end gap-2.5 pt-2 border-t border-[#DAD6CC]">
            <button
              type="button"
              className="px-3 py-1.5 text-xs font-medium text-[#1B1F24] bg-[#FFFFFF] border border-[#8C8A82] hover:bg-[#EFEDE7] rounded-[4px] transition-colors"
              disabled={mutation.isPending}
              onClick={close}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-3.5 py-1.5 text-xs font-medium text-white rounded-[4px] transition-colors ${
                decision === 'link'
                  ? 'bg-[#1F3A5F] hover:bg-[#17304F]'
                  : 'bg-[#B42318] hover:bg-[#911C13]'
              }`}
              disabled={!ready || mutation.isPending}
            >
              {mutation.isPending ? 'Saving...' : 'Confirm Decision'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
