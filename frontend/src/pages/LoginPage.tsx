import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react'
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
      localStorage.setItem('token', access_token)
      const user = await me()
      localStorage.setItem('user', JSON.stringify(user))
      navigate('/')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid username or password')
    } finally {
      setLoading(false)
    }
  }

  const quickLogin = (username: string) => {
    setForm({ username, password: 'demo123' })
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-slate-100">
      <div className="w-full max-w-sm space-y-5">
        {/* Header Branding */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded bg-blue-700 mb-2">
            <Shield size={22} className="text-white" />
          </div>
          <h1 className="text-xl font-mono font-bold tracking-tight text-slate-100">
            AICTE CaseNexus
          </h1>
          <p className="text-xs text-slate-400 font-mono">
            Grievance Monitoring & Overlap Detection
          </p>
          <div className="text-[10px] text-slate-500 font-mono uppercase tracking-widest pt-1">
            Government of India · Statutory Portal
          </div>
        </div>

        {/* Authentication Card */}
        <div className="panel bg-slate-900 border border-slate-800 rounded p-6 shadow-none">
          <form onSubmit={submit} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-400 font-mono font-semibold mb-1 uppercase tracking-wider text-[10px]">
                Username
              </label>
              <input
                className="input font-mono"
                placeholder="Enter officer username"
                value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                autoFocus
                required
              />
            </div>

            <div>
              <label className="block text-slate-400 font-mono font-semibold mb-1 uppercase tracking-wider text-[10px]">
                Password
              </label>
              <div className="relative">
                <input
                  className="input pr-9 font-mono"
                  type={showPw ? 'text' : 'password'}
                  placeholder="Enter secure password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-rose-950/40 border border-rose-800 rounded p-2.5 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-2 text-xs font-semibold"
            >
              {loading ? <Loader2 size={14} className="animate-spin mr-1" /> : null}
              {loading ? 'Authenticating...' : 'Sign In to Portal'}
            </button>
          </form>

          {/* Quick Login Options */}
          <div className="mt-5 pt-4 border-t border-slate-800/80">
            <p className="text-[10px] font-mono text-slate-500 mb-2.5 uppercase tracking-wider text-center">
              Demonstration Officer Profiles
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
                  className="px-2 py-1.5 rounded bg-slate-950 border border-slate-800 hover:bg-slate-800/60 text-slate-300 text-[10px] font-mono text-left truncate transition-colors"
                >
                  <strong className="text-blue-400 block truncate">{u}</strong>
                  <span className="text-slate-500 text-[9px] block truncate">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center text-[10px] font-mono text-slate-500">
          Official prototype implementation · Confidential data governance
        </div>
      </div>
    </div>
  )
}
