import type { ReactNode } from 'react'
import { Skeleton } from './Skeleton'
import { EmptyState } from './EmptyState'
import { cn } from './utils'

export interface Column<T> {
  id: string
  header: ReactNode
  accessor?: (row: T) => ReactNode
  cell?: (row: T, index: number) => ReactNode
  align?: 'left' | 'center' | 'right'
  className?: string
  width?: string
}

export interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  keyExtractor: (row: T, index: number) => string | number
  isLoading?: boolean
  skeletonRows?: number
  emptyTitle?: string
  emptyDescription?: string
  onRowClick?: (row: T) => void
  className?: string
  rowClassName?: (row: T, index: number) => string
}

export function DataTable<T>({
  data,
  columns,
  keyExtractor,
  isLoading = false,
  skeletonRows = 5,
  emptyTitle = 'No Records Found',
  emptyDescription = 'There are no items matching the selected parameters.',
  onRowClick,
  className,
  rowClassName,
}: DataTableProps<T>) {
  return (
    <div
      className={cn(
        'w-full overflow-x-auto bg-[#FFFFFF] border border-[#DAD6CC] rounded-[6px] shadow-sm',
        className
      )}
    >
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="border-b border-[#DAD6CC] bg-[#EFEDE7]">
            {columns.map((col) => (
              <th
                key={col.id}
                style={{ width: col.width }}
                className={cn(
                  'sticky top-0 z-10 px-3.5 py-2.5 font-semibold text-[#1B1F24] uppercase tracking-wider text-[11px] select-none',
                  col.align === 'right' && 'text-right',
                  col.align === 'center' && 'text-center',
                  col.className
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#DAD6CC]">
          {isLoading ? (
            Array.from({ length: skeletonRows }).map((_, rIdx) => (
              <tr key={`skel-${rIdx}`} className="bg-[#FFFFFF]">
                {columns.map((col) => (
                  <td key={col.id} className="px-3.5 py-3">
                    <Skeleton className="h-4 w-full max-w-[120px]" />
                  </td>
                ))}
              </tr>
            ))
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="p-6">
                <EmptyState
                  title={emptyTitle}
                  description={emptyDescription}
                  className="border-0 shadow-none p-4"
                />
              </td>
            </tr>
          ) : (
            data.map((row, rIdx) => {
              const rowKey = keyExtractor(row, rIdx)
              return (
                <tr
                  key={rowKey}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(
                    'transition-colors bg-[#FFFFFF] hover:bg-[#F6F5F1]',
                    onRowClick && 'cursor-pointer',
                    rowClassName && rowClassName(row, rIdx)
                  )}
                >
                  {columns.map((col) => {
                    const content = col.cell
                      ? col.cell(row, rIdx)
                      : col.accessor
                      ? col.accessor(row)
                      : null

                    return (
                      <td
                        key={col.id}
                        className={cn(
                          'px-3.5 py-2.5 text-[#1B1F24] align-middle',
                          col.align === 'right' && 'text-right font-mono tabular-nums',
                          col.align === 'center' && 'text-center',
                          col.className
                        )}
                      >
                        {content}
                      </td>
                    )
                  })}
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}
