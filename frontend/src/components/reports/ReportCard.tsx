import React from 'react'

interface ReportCardProps {
  title: string
  icon?: React.ReactNode
  children: React.ReactNode
  table?: React.ReactNode
}

export const ReportCard: React.FC<ReportCardProps> = ({ title, icon, children, table }) => {
  return (
    <section className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-2 mb-3">
          {icon}
          <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wide">
            {title}
          </h2>
        </div>
        <div className="w-full">{children}</div>
      </div>
      {table && <div className="mt-4 pt-3 border-t border-slate-800/80 overflow-x-auto">{table}</div>}
    </section>
  )
}

export default ReportCard
