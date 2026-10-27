import { Fragment, type ReactNode } from 'react'
import { cn } from './utils'

export interface PageHeaderProps {
  title: string
  description?: string
  badge?: ReactNode
  actions?: ReactNode
  breadcrumbs?: Array<{ label: string; href?: string }>
  className?: string
}

export function PageHeader({
  title,
  description,
  badge,
  actions,
  breadcrumbs,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        'pb-4 mb-6 border-b border-[#DAD6CC] flex flex-col md:flex-row md:items-center md:justify-between gap-4',
        className
      )}
    >
      <div className="space-y-1">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-[#5B6068] mb-1">
            {breadcrumbs.map((crumb, idx) => (
              <Fragment key={idx}>
                {idx > 0 && <span className="text-[#8C8A82]">/</span>}
                {crumb.href ? (
                  <a
                    href={crumb.href}
                    className="hover:text-[#1B1F24] transition-colors"
                  >
                    {crumb.label}
                  </a>
                ) : (
                  <span className="text-[#1B1F24] font-medium">{crumb.label}</span>
                )}
              </Fragment>
            ))}
          </nav>
        )}

        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-xl font-semibold text-[#1B1F24] tracking-tight">
            {title}
          </h1>
          {badge}
        </div>

        {description && (
          <p className="text-xs text-[#5B6068] max-w-2xl leading-normal">
            {description}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          {actions}
        </div>
      )}
    </div>
  )
}
