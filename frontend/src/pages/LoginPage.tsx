import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2, Lock, GitMerge } from 'lucide-react'
import { login, me } from '../lib/api'

export default function LoginPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', password: '' })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { access_token } = await login(form.username, form.password)
      if (!access_token) {
        throw new Error('Backend is not reachable or did not return a valid session.')
      }
      localStorage.setItem('token', access_token)
      const user = await me()
      localStorage.setItem('user', JSON.stringify(user))
      navigate('/')
    } catch (err: any) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      if (err.response?.status === 405) {
        setError('405 Method Not Allowed: The frontend is sending requests to Vercel instead of your Railway backend. Please check VITE_API_URL in Vercel and trigger a Redeploy.')
      } else {
        setError(err.response?.data?.detail || err.message || 'Invalid username or password. Is the backend server running?')
      }
    } finally {
      setLoading(false)
    }
  }

  const quickLogin = (username: string) => {
    setForm({ username, password: 'demo123' })
  }

  return (
    <div className="min-h-screen bg-[#F6F5F1] text-[#1B1F24] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Subtle background dot pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage: 'radial-gradient(#DAD6CC 1.2px, transparent 1.2px)',
          backgroundSize: '24px 24px',
        }}
        aria-hidden="true"
      />

      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-12 gap-8 items-center relative z-10">
        {/* Left Column: Plain Statement & Institutional Context */}
        <div className="md:col-span-7 space-y-6 pr-0 md:pr-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-[4px] bg-[#E8F0FE] border border-[#B2CCF8] text-[#1F3A5F] text-[11px] font-mono font-semibold uppercase tracking-wider">
              <Shield size={14} className="text-[#1F3A5F]" />
              <span>Statutory Grievance Portal · AICTE</span>
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-[#1B1F24]">
              CaseNexus
            </h1>
            <p className="text-sm font-medium text-[#5B6068]">
              Single-Window Operational Console for Cross-Bureau Grievance Coordination
            </p>
          </div>

          <p className="text-xs text-[#5B6068] leading-relaxed">
            CaseNexus unifies complaint intake across the Approval Bureau, Public Grievance Redressal Cell (PGRC), and Regional Offices. It isolates duplicate institution filings, calculates SLA escalation deadlines, and provides air-gapped data privacy enforcement.
          </p>

          <div className="space-y-3 pt-1">
            <div className="flex items-start gap-2.5 text-xs text-[#1B1F24]">
              <GitMerge size={16} className="text-[#1F3A5F] shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold">Cross-Bureau Overlap Engine:</strong>
                <span className="text-[#5B6068] ml-1">Automated similarity scanning and word-level diff analysis for duplicate complaints.</span>
              </div>
            </div>

            <div className="flex items-start gap-2.5 text-xs text-[#1B1F24]">
              <Lock size={16} className="text-[#1F3A5F] shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold">Air-Gapped Privacy Boundary:</strong>
                <span className="text-[#5B6068] ml-1">Strict fail-closed circuit breaker preventing egress of sensitive petitioner data.</span>
              </div>
            </div>

            <div className="flex items-start gap-2.5 text-xs text-[#1B1F24]">
              <CheckCircle2 size={16} className="text-[#067647] shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold">Statutory SLA Compliance:</strong>
                <span className="text-[#5B6068] ml-1">Tracking resolution velocity, ageing windows, and automated supervisor escalations.</span>
              </div>
            </div>
          </div>

          {/* Honest Prototype Notice */}
          <div className="p-3 bg-[#EFEDE7] border border-[#DAD6CC] rounded-[4px] text-[11px] text-[#5B6068] space-y-0.5">
            <p className="font-medium text-[#1B1F24]">Notice: Prototype Implementation</p>
            <p>
              Operates with synthetic demonstration data. Evaluated machine learning parameters do not represent production performance.
            </p>
          </div>
        </div>

        {/* Right Column: Glass Sign-In Card with Solid Fallback */}
        <div className="md:col-span-5">
          <div className="bg-[#FFFFFF] sm:bg-[#FFFFFF]/95 sm:backdrop-blur-md border border-[#DAD6CC] rounded-[6px] p-7 shadow-lg space-y-5">
            <div>
              <h2 className="text-base font-semibold text-[#1B1F24]">Officer Authentication</h2>
              <p className="text-xs text-[#5B6068] mt-0.5">
                Sign in with your designated AICTE staff credentials.
              </p>
            </div>

            <form onSubmit={submit} className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-medium text-[#1B1F24] mb-1">
                  Username
                </label>
                <input
                  className="w-full bg-[#FFFFFF] border border-[#DAD6CC] rounded-[4px] px-3 py-2 text-xs text-[#1B1F24] placeholder-[#8C8A82] font-mono focus:outline-none focus:ring-1 focus:ring-[#1F3A5F] focus:border-[#1F3A5F]"
                  placeholder="Enter officer username (e.g. admin, rb1)"
                  value={form.username}
                  onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                  autoFocus
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#1B1F24] mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    className="w-full bg-[#FFFFFF] border border-[#DAD6CC] rounded-[4px] px-3 py-2 text-xs text-[#1B1F24] placeholder-[#8C8A82] font-mono pr-9 focus:outline-none focus:ring-1 focus:ring-[#1F3A5F] focus:border-[#1F3A5F]"
                    type={showPw ? 'text' : 'password'}
                    placeholder="Enter secure password"
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#5B6068] hover:text-[#1B1F24]"
                    tabIndex={-1}
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                  >
                    {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {error && (
                <div
                  role="alert"
                  className="bg-[#FDECEA] border border-[#F8B7B2] rounded-[4px] p-2.5 text-[#B42318] text-xs flex items-center gap-2"
                >
                  <AlertCircle size={14} className="shrink-0 text-[#B42318]" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-4 rounded-[4px] text-xs font-medium bg-[#1F3A5F] hover:bg-[#17304F] text-white transition-colors shadow-sm disabled:opacity-50"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : null}
                <span>{loading ? 'Authenticating...' : 'Sign In to Portal'}</span>
              </button>
            </form>

            {/* Quick Demonstration Profiles */}
            <div className="pt-4 border-t border-[#DAD6CC]">
              <p className="text-[10px] font-mono text-[#5B6068] mb-2 uppercase tracking-wider text-center">
                Quick Demonstration Access
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { u: 'admin', label: 'Central Admin' },
                  { u: 'rb1', label: 'Approval Cell (RB)' },
                  { u: 'pgrc1', label: 'Grievance Cell' },
                  { u: 'ro_north', label: 'Regional (North)' },
                ].map(({ u, label }) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => quickLogin(u)}
                    className="p-2 rounded-[4px] bg-[#F6F5F1] border border-[#DAD6CC] hover:bg-[#EFEDE7] text-left transition-colors"
                  >
                    <span className="text-[#1F3A5F] font-mono font-semibold block text-xs truncate">
                      {u}
                    </span>
                    <span className="text-[#5B6068] text-[10px] block truncate">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
