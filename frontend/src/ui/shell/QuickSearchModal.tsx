import { Search, ChevronRight } from 'lucide-react'

export interface InstitutionResult {
  id: number
  name: string
  aicte_permanent_id?: string
  city?: string
  region?: string
}

export interface QuickSearchModalProps {
  isOpen: boolean
  onClose: () => void
  query: string
  onQueryChange: (q: string) => void
  results: InstitutionResult[]
  onSelectInstitution: (id: number) => void
}

export function QuickSearchModal({
  isOpen,
  onClose,
  query,
  onQueryChange,
  results,
  onSelectInstitution,
}: QuickSearchModalProps) {
  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Global Search"
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 p-4"
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-[#000000]/40 backdrop-blur-sm transition-opacity"
      />

      <div className="relative z-10 w-full max-w-xl bg-[#FFFFFF] border border-[#DAD6CC] rounded-[6px] shadow-2xl overflow-hidden">
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-[#DAD6CC] bg-[#F6F5F1]">
          <Search className="w-4 h-4 text-[#5B6068]" />
          <input
            autoFocus
            className="bg-transparent border-0 outline-none text-[#1B1F24] text-xs flex-1 placeholder:text-[#5B6068] font-sans"
            placeholder="Type institution name, city, or AICTE permanent ID..."
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
          />
          <button
            type="button"
            onClick={onClose}
            className="text-[#5B6068] hover:text-[#1B1F24] font-mono text-[10px] px-1.5 py-0.5 border border-[#8C8A82] rounded bg-[#FFFFFF]"
          >
            ESC
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto p-2 text-xs">
          {query.trim().length < 2 ? (
            <div className="p-6 text-center text-[#5B6068]">
              Type at least 2 characters to search institutions across AICTE jurisdictions.
            </div>
          ) : results.length === 0 ? (
            <div className="p-6 text-center text-[#5B6068]">
              No matching institutions found for &ldquo;{query}&rdquo;.
            </div>
          ) : (
            <div className="space-y-1">
              {results.map((inst) => (
                <div
                  key={inst.id}
                  onClick={() => onSelectInstitution(inst.id)}
                  className="flex items-center justify-between p-2.5 rounded-[4px] hover:bg-[#F6F5F1] cursor-pointer transition-colors border border-transparent hover:border-[#DAD6CC]"
                >
                  <div className="min-w-0 pr-3">
                    <div className="font-medium text-[#1B1F24] truncate">
                      {inst.name}
                    </div>
                    <div className="text-[11px] text-[#5B6068] mt-0.5 flex items-center gap-2 font-mono">
                      <span className="text-[#175CD3] font-semibold">
                        {inst.aicte_permanent_id || 'ID N/A'}
                      </span>
                      <span>·</span>
                      <span>
                        {inst.city || 'N/A'}, {inst.region || 'HQ'}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#8C8A82] shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
