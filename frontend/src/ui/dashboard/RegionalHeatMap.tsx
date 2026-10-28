import { useRef, useState } from 'react'
import { useInView, useReducedMotion } from 'motion/react'
import { MapPin } from 'lucide-react'

export interface RegionVolume { region: string; open: number; total?: number }
const REGIONS = [
  { name: 'Northern', aliases: ['north', 'northern'], x: 235, y: 164 },
  { name: 'North-Western', aliases: ['northwest', 'northwestern'], x: 193, y: 119 },
  { name: 'Central', aliases: ['central'], x: 221, y: 235 },
  { name: 'Western', aliases: ['west', 'western'], x: 144, y: 269 },
  { name: 'South-Western', aliases: ['southwest', 'southwestern'], x: 192, y: 347 },
  { name: 'Southern', aliases: ['south', 'southern'], x: 237, y: 365 },
  { name: 'Eastern', aliases: ['east', 'eastern'], x: 340, y: 230 },
]
const normalize = (name: string) => name.toLowerCase().replace(/[^a-z]/g, '')
const count = (value: number | undefined) => value === undefined ? 'Not reported' : value.toLocaleString('en-IN')

export default function RegionalHeatMap({ regions, animate = true }: { regions: RegionVolume[]; animate?: boolean }) {
  const [active, setActive] = useState('Northern')
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref)
  const reduced = useReducedMotion()
  const rows = REGIONS.map(region => ({ ...region, data: regions.find(row => region.aliases.includes(normalize(row.region))) }))
  const selected = rows.find(row => row.name === active) ?? rows[0]
  const maximum = Math.max(1, ...regions.map(region => Number(region.open) || 0))
  const unmapped = regions.filter(region => !REGIONS.some(node => node.aliases.includes(normalize(region.region))))

  return (
    <div ref={ref} className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]" data-testid="regional-map">
      <div className="relative rounded-xl border border-[#DAD6CC] bg-[#F6F5F1]">
        <div className="absolute left-4 top-4 font-mono text-[10px] text-[#5B6068]">INDIA / REGIONAL SERVICE NETWORK</div>
        <svg viewBox="0 0 500 470" className="mx-auto h-[360px] w-full max-w-[480px]" aria-label="Schematic India regional service network">
          <defs><pattern id="cn-map-grid" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="#DAD6CC" /></pattern></defs>
          <rect width="500" height="470" fill="url(#cn-map-grid)" />
          <path d="M190 35L216 42L228 29L252 45L250 68L271 88L268 108L286 123L277 144L298 162L326 177L344 174L354 189L379 178L406 154L440 146L459 167L445 192L425 205L417 232L398 249L385 229L367 217L350 227L340 252L316 270L303 295L284 314L264 343L253 376L236 413L218 438L200 420L185 386L174 354L156 326L143 293L126 270L119 249L91 241L77 220L101 208L122 213L135 191L145 168L151 142L170 123L171 102L186 85L173 66Z" fill="#E4E7E8" stroke="#A9B6C6" strokeWidth="1.5" />
          <path d="M383 354l4 9m-1 9l4 12m-1 8l4 8M130 359l-2 4m5 12l-1 3" fill="none" stroke="#A9B6C6" strokeWidth="3" strokeLinecap="round" />
          {rows.map(row => <line key={row.name} x1="221" y1="235" x2={row.x} y2={row.y} stroke="#1F3A5F" strokeOpacity=".15" strokeDasharray="3 5" />)}
          {rows.map(row => {
            const radius = 7 + Math.sqrt((row.data?.open ?? 0) / maximum) * 12
            const chosen = active === row.name
            return <g key={row.name} role="button" tabIndex={0} aria-label={`${row.name}: ${count(row.data?.open)} active complaints`} aria-pressed={chosen} onMouseEnter={() => setActive(row.name)} onFocus={() => setActive(row.name)} onClick={() => setActive(row.name)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setActive(row.name) } }} className="cursor-pointer">
              <title>{row.name}: {count(row.data?.total)} total complaints; overlap count and SLA warnings not reported</title>
              <circle cx={row.x} cy={row.y} r={radius + 8} fill={chosen ? '#8A4B08' : '#1F3A5F'} opacity=".08" />
              <circle cx={row.x} cy={row.y} r={radius} fill="none" stroke={chosen ? '#8A4B08' : '#1F3A5F'} opacity=".35" className={animate && inView && !reduced && row.data ? 'cn-radar-ring' : ''} />
              <circle cx={row.x} cy={row.y} r="5" fill={chosen ? '#8A4B08' : '#1F3A5F'} stroke="white" strokeWidth="2" />
              <text x={row.x + 12} y={row.y - 8} fontSize="10" fill="#1F3A5F" fontFamily="IBM Plex Mono, monospace">{row.name}</text>
            </g>
          })}
        </svg>
        <p className="px-4 pb-3 font-mono text-[9px] text-[#5B6068]">Operational schematic · no administrative boundaries · rings scale with active case volume</p>
      </div>
      <div className="flex flex-col justify-center">
        <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-[#8A4B08]"><MapPin size={13} /> Selected region</p>
        <h3 className="mt-2 text-2xl font-semibold text-[#1F3A5F]">{selected.name}</h3>
        <dl className="mt-5 grid grid-cols-2 gap-4 text-xs">
          <div className="rounded-lg border border-[#DAD6CC] p-3"><dt className="text-[#5B6068]">Total complaints</dt><dd className="mt-2 font-mono text-lg font-semibold text-[#1F3A5F]">{count(selected.data?.total)}</dd></div>
          <div className="rounded-lg border border-[#DAD6CC] p-3"><dt className="text-[#5B6068]">Active complaints</dt><dd className="mt-2 font-mono text-lg font-semibold text-[#1F3A5F]">{count(selected.data?.open)}</dd></div>
          <div><dt className="text-[#5B6068]">Duplicate overlaps</dt><dd className="mt-2 text-[#5B6068]">Not reported by region</dd></div>
          <div><dt className="text-[#5B6068]">High-risk SLA warnings</dt><dd className="mt-2 text-[#5B6068]">Not reported by region</dd></div>
        </dl>
        <div aria-label="Select regional office" className="mt-6 flex flex-wrap gap-2">{rows.map(row => <button key={row.name} type="button" onClick={() => setActive(row.name)} aria-pressed={active === row.name} className={`rounded-md border px-2.5 py-2 text-[10px] ${active === row.name ? 'border-[#1F3A5F] bg-[#1F3A5F] text-white' : 'border-[#DAD6CC] text-[#5B6068] hover:bg-[#EFEDE7]'}`}>{row.name}</button>)}</div>
        {unmapped.length > 0 && <p className="mt-4 text-xs text-[#5B6068]">Other reported regions: {unmapped.map(row => `${row.region} (${row.open} active)`).join(', ')}. All reported rows remain available in the ledger table.</p>}
      </div>
    </div>
  )
}
