import { motion, useReducedMotion } from 'motion/react'

export default function HudSwitch({ checked, onChange, label, disabled = false }: { checked: boolean; onChange: (checked: boolean) => void; label: string; disabled?: boolean }) {
  const reduced = useReducedMotion()
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={() => onChange(!checked)} className="inline-flex items-center gap-2.5 rounded-lg px-1 py-1 text-xs text-[#5B6068] disabled:cursor-default disabled:opacity-60">
    <span aria-hidden="true" className="relative h-6 w-11 rounded-full border border-[#8C8A82] bg-gradient-to-b from-[#C9C6BD] to-[#EFEDE7] shadow-[inset_0_2px_4px_rgba(20,35,58,0.25)]">
      <motion.span animate={{ x: checked ? 20 : 2 }} transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 350, damping: 25 }} className="absolute top-[2px] flex h-[18px] w-[18px] items-center justify-center rounded-full border border-white bg-gradient-to-b from-white to-[#DAD6CC] shadow-sm">
        <span className={`h-1.5 w-1.5 rounded-full ${checked ? 'bg-[#067647] shadow-[0_0_5px_#80CBC4]' : 'bg-[#8C8A82]'}`} />
      </motion.span>
    </span><span>{label}</span>
  </button>
}
