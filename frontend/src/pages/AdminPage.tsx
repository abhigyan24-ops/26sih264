import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { me } from '../lib/api'
import PrivacyTab from '../components/admin/PrivacyTab'
import EvaluationTab from '../components/admin/EvaluationTab'
import ModelCardTab from '../components/admin/ModelCardTab'

export default function AdminPage() {
  const [tab,setTab] = useState<'privacy'|'evaluation'|'model-card'>('privacy')
  const user = useQuery({queryKey:['me'],queryFn:me})
  if (user.isPending) return <p className="p-6">Loading administration…</p>
  if (user.isError) return <p role="alert" className="p-6">Could not verify your role. Reload to retry.</p>
  if (user.data.role !== 'admin' && user.data.role !== 'management') return <p className="p-6">Administration is available to management and admins.</p>
  return <div className="p-6 space-y-5">
    <h1 className="text-xl font-bold">Administration</h1>
    <div role="tablist" aria-label="Administration sections" className="flex gap-3">
      {([{key:'privacy',label:'Privacy'},{key:'evaluation',label:'Evaluation'},{key:'model-card',label:'Model card'}] as const).map(item => <button key={item.key} role="tab" aria-selected={tab === item.key} onClick={() => setTab(item.key)} className="btn-secondary">{item.label}</button>)}
    </div>
    {tab === 'privacy' && <PrivacyTab />}
    {tab === 'evaluation' && <EvaluationTab />}
    {tab === 'model-card' && <ModelCardTab />}
  </div>
}
