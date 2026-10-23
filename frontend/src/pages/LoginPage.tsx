import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, Eye, EyeOff, Loader2 } from 'lucide-react'
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
      setError(err.response?.data?.detail || 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  const quickLogin = (username: string) => {
    setForm({ username, password: 'demo123' })
  }

  return (
    <div className="min-h-screen hero-gradient flex items-center justify-center p-4">
      {/* Background grid */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%232a3f63%22 fill-opacity=%220.15%22%3E%3Cpath d=%22M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-30 pointer-events-none" />

      <div className="w-full max-w-md animate-slide-up relative">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 mb-4 shadow-2xl shadow-blue-500/30">
            <Shield size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold gradient-text mb-1">CaseNexus</h1>
          <p className="text-slate-400 text-sm">AICTE Integrated Complaint Dashboard</p>
          <p className="text-slate-600 text-xs mt-1">SIH 2026 · PS 26264</p>
        </div>

        {/* Card */}
        <div className="glass rounded-2xl p-8 shadow-2xl shadow-black/40">
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Username</label>
              <input
                className="input"
                placeholder="Enter username"
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                autoFocus
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Password</label>
              <div className="relative">
                <input
                  className="input pr-10"
                  type={showPw ? 'text' : 'password'}
                  placeholder="Enter password"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2 text-rose-400 text-sm animate-fade-in">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center flex items-center gap-2 py-2.5">
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          {/* Demo accounts – visible in dev builds only (spec §10.5) */}
          {import.meta.env.DEV && (
            <div className="mt-6 pt-5 border-t border-slate-800">
              <p className="text-xs text-slate-500 mb-3 text-center">Demo accounts (password: <code className="font-mono text-slate-400">demo123</code>)</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { u: 'admin', label: 'Admin', color: 'text-purple-400' },
                  { u: 'mgmt1', label: 'Management', color: 'text-blue-400' },
                  { u: 'rb1', label: 'RB Officer', color: 'text-cyan-400' },
                  { u: 'pgrc1', label: 'PGRC Officer', color: 'text-emerald-400' },
                  { u: 'south1', label: 'Regional (S)', color: 'text-amber-400' },
                  { u: 'north1', label: 'Regional (N)', color: 'text-amber-400' },
                ].map(({ u, label, color }) => (
                  <button
                    key={u}
                    onClick={() => quickLogin(u)}
                    className="text-left px-3 py-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/60 transition-colors border border-slate-700/50 hover:border-slate-600"
                  >
                    <div className={`text-xs font-medium ${color}`}>{label}</div>
                    <div className="text-xs text-slate-500 font-mono">{u}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          Synthetic evaluation data only · No real complaints
        </p>
      </div>
    </div>
  )
}
