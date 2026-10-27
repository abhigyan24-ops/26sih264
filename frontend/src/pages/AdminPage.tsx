import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { me } from '../lib/api'
import PrivacyTab from '../components/admin/PrivacyTab'
import EvaluationTab from '../components/admin/EvaluationTab'
import ModelCardTab from '../components/admin/ModelCardTab'
import { PageHeader } from '../ui/PageHeader'
import { Tabs } from '../ui/Tabs'
import { Skeleton } from '../ui/Skeleton'
import { ErrorState } from '../ui/ErrorState'
import { Shield, BarChart2, BookOpen, Lock } from 'lucide-react'

export default function AdminPage() {
  const [tab, setTab] = useState<'privacy' | 'evaluation' | 'model-card'>('privacy')
  const user = useQuery({ queryKey: ['me'], queryFn: me })

  if (user.isPending) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-14 w-full rounded-[6px]" />
        <Skeleton className="h-64 w-full rounded-[6px]" />
      </div>
    )
  }

  if (user.isError) {
    return (
      <div className="pt-4">
        <ErrorState
          title="Authentication Verification Failed"
          message="Could not verify administrative credentials with the server. Please reload to retry."
          onRetry={() => void user.refetch()}
        />
      </div>
    )
  }

  if (user.data?.role !== 'admin' && user.data?.role !== 'management') {
    return (
      <div className="max-w-md mx-auto pt-12">
        <div className="bg-[#FFFFFF] border border-[#DAD6CC] rounded-[6px] p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-[#F6F5F1] border border-[#DAD6CC] flex items-center justify-center text-[#5B6068] mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-sm font-semibold text-[#1B1F24]">Restricted Administration</h2>
          <p className="text-xs text-[#5B6068] leading-relaxed">
            The statutory administration console is restricted to officers with management or administrative roles.
          </p>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'privacy', label: 'Privacy & Boundary Policy', icon: Shield },
    { id: 'evaluation', label: 'Model Evaluation & Benchmarks', icon: BarChart2 },
    { id: 'model-card', label: 'Statutory Model Card', icon: BookOpen },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Statutory Administration & Governance"
        description="Data boundary controls, model calibration telemetry, and model governance documentation."
        badge={
          <span className="text-[11px] font-mono bg-[#EFEDE7] text-[#5B6068] border border-[#DAD6CC] px-2 py-0.5 rounded-[4px]">
            Role: {user.data.role.toUpperCase()}
          </span>
        }
      />

      <div className="bg-[#FFFFFF] border border-[#DAD6CC] rounded-[6px] p-4">
        <Tabs
          tabs={tabs}
          activeId={tab}
          onChange={(id) => setTab(id as typeof tab)}
        />
      </div>

      <div className="pt-1">
        {tab === 'privacy' && <PrivacyTab />}
        {tab === 'evaluation' && <EvaluationTab />}
        {tab === 'model-card' && <ModelCardTab />}
      </div>
    </div>
  )
}
