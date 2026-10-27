import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { me } from '../lib/api'
import PrivacyTab from '../components/admin/PrivacyTab'
import EvaluationTab from '../components/admin/EvaluationTab'
import ModelCardTab from '../components/admin/ModelCardTab'
import { Shield, BarChart2, BookOpen } from 'lucide-react'

export default function AdminPage() {
  const [tab, setTab] = useState<'privacy' | 'evaluation' | 'model-card'>('privacy')
  const user = useQuery({ queryKey: ['me'], queryFn: me })

  if (user.isPending) {
    return <div className="p-6 text-xs text-slate-400 font-mono">Loading administration policy...</div>
  }
  if (user.isError) {
    return (
      <div role="alert" className="p-6">
        <div className="chip chip-danger text-xs font-mono">
          Could not verify administrative credentials. Reload to retry.
        </div>
      </div>
    )
  }
  if (user.data?.role !== 'admin' && user.data?.role !== 'management') {
    return (
      <div className="p-6">
        <div className="panel p-6 text-center space-y-2 max-w-md mx-auto">
          <Shield className="w-8 h-8 text-slate-500 mx-auto" />
          <h2 className="text-sm font-semibold text-slate-200">Restricted Administration</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Administration console is restricted to officers with management or administrative roles.
          </p>
        </div>
      </div>
    )
  }

  const tabs = [
    { key: 'privacy', label: 'Privacy & Boundary Policy', icon: Shield },
    { key: 'evaluation', label: 'Model Evaluation & Benchmarks', icon: BarChart2 },
    { key: 'model-card', label: 'Statutory Model Card', icon: BookOpen },
  ] as const

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      <div>
        <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-500" />
          Statutory Administration & Governance
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Data boundary controls, model calibration telemetry, and model governance documentation.
        </p>
      </div>

      <div role="tablist" aria-label="Administration sections" className="flex border-b border-slate-800 gap-1 pb-px">
        {tabs.map((item) => {
          const Icon = item.icon
          const isActive = tab === item.key
          return (
            <button
              key={item.key}
              role="tab"
              aria-selected={isActive}
              onClick={() => setTab(item.key)}
              className={`flex items-center gap-2 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                isActive
                  ? 'border-blue-500 text-blue-400 bg-slate-900/60'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {item.label}
            </button>
          )
        })}
      </div>

      <div className="pt-2">
        {tab === 'privacy' && <PrivacyTab />}
        {tab === 'evaluation' && <EvaluationTab />}
        {tab === 'model-card' && <ModelCardTab />}
      </div>
    </div>
  )
}
