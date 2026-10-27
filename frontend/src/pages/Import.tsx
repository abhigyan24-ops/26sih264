import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Upload,
  FileSpreadsheet,
  Play,
  ArrowRight,
  Save,
  Clock,
  History,
} from 'lucide-react'
import {
  getSources,
  getSourceMapping,
  saveSourceMapping,
  detectHeaders,
  uploadImport,
  getImportLogs,
  type ImportResult,
} from '../api/ingestion'

export default function Import() {
  const queryClient = useQueryClient()
  const [source, setSource] = useState('rb')
  const [file, setFile] = useState<File | null>(null)
  const [dryRun, setDryRun] = useState(true)
  const [detectedHeaders, setDetectedHeaders] = useState<string[]>([])
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({})
  const [totalDetectedRows, setTotalDetectedRows] = useState(0)
  const [samplePreview, setSamplePreview] = useState<Record<string, string>[]>([])
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [activeTab, setActiveTab] = useState<'preview' | 'held' | 'errors' | 'logs'>('preview')

  const sourcesQuery = useQuery({ queryKey: ['ingestion-sources'], queryFn: getSources })
  const defaultMappingQuery = useQuery({
    queryKey: ['ingestion-mapping', source],
    queryFn: () => getSourceMapping(source),
  })
  const logsQuery = useQuery({
    queryKey: ['ingestion-logs', source],
    queryFn: () => getImportLogs(source),
  })

  // When source or default mapping changes, reset mapping state
  useEffect(() => {
    if (defaultMappingQuery.data?.mapping) {
      setColumnMapping(defaultMappingQuery.data.mapping)
    }
  }, [defaultMappingQuery.data])

  const detectMutation = useMutation({
    mutationFn: (f: File) => detectHeaders(source, f),
    onSuccess: (data) => {
      setDetectedHeaders(data.headers)
      setColumnMapping(data.mapping)
      setSamplePreview(data.sample_preview)
      setTotalDetectedRows(data.total_rows_detected)
    },
  })

  const saveMappingMutation = useMutation({
    mutationFn: () => saveSourceMapping(source, columnMapping),
    onSuccess: () => {
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
      queryClient.invalidateQueries({ queryKey: ['ingestion-mapping', source] })
    },
  })

  const uploadMutation = useMutation({
    mutationFn: () => {
      if (!file) throw new Error('No file selected')
      return uploadImport(source, file, dryRun, columnMapping)
    },
    onSuccess: (res) => {
      setImportResult(res)
      if (res.errors.length > 0 && res.imported_rows === 0) {
        setActiveTab('errors')
      } else if (res.held.length > 0 && res.imported_rows === 0) {
        setActiveTab('held')
      } else {
        setActiveTab('preview')
      }
      queryClient.invalidateQueries({ queryKey: ['ingestion-logs'] })
      queryClient.invalidateQueries({ queryKey: ['cases'] })
      queryClient.invalidateQueries({ queryKey: ['overlaps'] })
    },
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) {
      setFile(selected)
      setImportResult(null)
      detectMutation.mutate(selected)
    }
  }

  const handleFieldMap = (srcHeader: string, targetField: string) => {
    setColumnMapping((prev) => {
      const next = { ...prev }
      if (!targetField) {
        delete next[srcHeader]
      } else {
        next[srcHeader] = targetField
      }
      return next
    })
  }

  const schemaFields = sourcesQuery.data?.schema_fields || {}

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-blue-500" />
            Data Ingestion & Batch Import Adapter
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Idempotent batch grievance ingestion with dynamic column mapping, automated institution resolution, and real-time overlap scanning.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="chip chip-neutral font-mono text-[11px]">
            Statutory Import Module 070
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Import Controls */}
        <div className="lg:col-span-1 space-y-4">
          {/* Source Selection */}
          <div className="panel p-4 space-y-3">
            <label className="text-xs font-semibold text-slate-300 block uppercase tracking-wider">
              1. Select Source System
            </label>
            <div className="space-y-2">
              {(sourcesQuery.data?.sources || [
                { id: 'rb', name: 'Ragging / Regional Bureau (RB)' },
                { id: 'pgrc', name: 'Public Grievance Redressal Cell (PGRC)' },
                { id: 'regional', name: 'Regional Office Grievance Files' },
              ]).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setSource(s.id)
                    setFile(null)
                    setDetectedHeaders([])
                    setImportResult(null)
                  }}
                  className={`w-full text-left p-2.5 rounded text-xs border transition-colors ${
                    source === s.id
                      ? 'bg-blue-950/60 border-blue-600 text-blue-200'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="font-semibold">{s.name}</div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5 uppercase">
                    ID: {s.id}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* File Upload Box */}
          <div className="panel p-4 space-y-3">
            <label className="text-xs font-semibold text-slate-300 block uppercase tracking-wider">
              2. Upload Batch File (CSV or XLSX)
            </label>
            <div className="border-2 border-dashed border-slate-800 hover:border-slate-700 rounded p-4 text-center cursor-pointer relative bg-slate-950/40">
              <input
                type="file"
                accept=".csv, .xlsx, .xls"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
              {file ? (
                <div className="text-xs">
                  <span className="font-bold text-blue-400 block truncate">{file.name}</span>
                  <span className="text-slate-500 font-mono text-[10px]">
                    {(file.size / 1024).toFixed(1)} KB · {totalDetectedRows} rows detected
                  </span>
                </div>
              ) : (
                <div className="text-xs text-slate-400">
                  <span className="text-blue-400 font-medium">Click to browse</span> or drag and drop
                  <div className="text-[10px] text-slate-500 mt-1">UTF-8 CSV or Microsoft Excel</div>
                </div>
              )}
            </div>
            {detectMutation.isPending && (
              <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 animate-spin text-blue-400" />
                Analyzing headers and inspecting sample rows...
              </div>
            )}
          </div>

          {/* Execution Mode Controls */}
          <div className="panel p-4 space-y-3">
            <label className="text-xs font-semibold text-slate-300 block uppercase tracking-wider">
              3. Execution Mode & Action
            </label>
            <div className="flex items-center gap-2 p-2.5 rounded bg-slate-950 border border-slate-800">
              <input
                type="checkbox"
                id="dryRunToggle"
                checked={dryRun}
                onChange={(e) => setDryRun(e.target.checked)}
                className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0"
              />
              <label htmlFor="dryRunToggle" className="text-xs text-slate-300 cursor-pointer">
                <span className="font-semibold block">Dry-Run Preview (Safe Mode)</span>
                <span className="text-[11px] text-slate-400 block">
                  Validates rows and resolution without persisting to database.
                </span>
              </label>
            </div>

            <button
              onClick={() => uploadMutation.mutate()}
              disabled={!file || uploadMutation.isPending || detectMutation.isPending}
              className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded text-xs font-semibold transition-colors ${
                dryRun
                  ? 'btn-secondary text-blue-300 hover:text-white'
                  : 'btn-primary'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {uploadMutation.isPending ? (
                <>
                  <Clock className="w-4 h-4 animate-spin" />
                  Processing Batch...
                </>
              ) : dryRun ? (
                <>
                  <Play className="w-4 h-4" />
                  Run Dry-Run Preview
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Execute Live Ingestion
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Dynamic Column Mapping & Results */}
        <div className="lg:col-span-2 space-y-4">
          {/* Dynamic Column Mapping Card */}
          <div className="panel p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Source Column to Schema Field Mapping
                </h2>
                <p className="text-[11px] text-slate-400">
                  Mappings are saved per source system. Target fields marked * are required.
                </p>
              </div>
              <button
                type="button"
                onClick={() => saveMappingMutation.mutate()}
                disabled={saveMappingMutation.isPending || Object.keys(columnMapping).length === 0}
                className="btn-secondary text-[11px] flex items-center gap-1.5"
                title="Save current column mapping as default for this source"
              >
                <Save className="w-3.5 h-3.5" />
                {saveSuccess ? 'Saved Default!' : 'Save as Default'}
              </button>
            </div>

            {detectedHeaders.length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-xs">
                Upload a file on the left to inspect column headers and configure field mappings.
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {detectedHeaders.map((header) => {
                  const currentMapped = columnMapping[header] || ''
                  return (
                    <div
                      key={header}
                      className="flex items-center justify-between gap-3 p-1.5 rounded bg-slate-950 border border-slate-800/80 text-xs"
                    >
                      <div className="font-mono text-slate-300 truncate w-1/2" title={header}>
                        {header}
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                      <select
                        value={currentMapped}
                        onChange={(e) => handleFieldMap(header, e.target.value)}
                        className="select w-1/2 text-xs py-1"
                      >
                        <option value="">(Ignore / Skip Column)</option>
                        {Object.entries(schemaFields).map(([key, label]) => (
                          <option key={key} value={key}>
                            {key} — {label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )
                })}
              </div>
            )}

            {samplePreview.length > 0 && (
              <div className="pt-2 border-t border-slate-800 space-y-1">
                <div className="text-[10px] font-mono uppercase text-slate-400">
                  File Preview (First {samplePreview.length} Rows):
                </div>
                <div className="overflow-x-auto max-h-36">
                  <table className="gov-table w-full text-[11px]">
                    <thead>
                      <tr>
                        {detectedHeaders.slice(0, 5).map((h) => (
                          <th key={h}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {samplePreview.map((row, idx) => (
                        <tr key={idx}>
                          {detectedHeaders.slice(0, 5).map((h) => (
                            <td key={h} className="truncate max-w-[150px]">
                              {row[h] || '—'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Results Display */}
          {importResult && (
            <div className="panel p-4 space-y-4">
              {/* Summary KPIs */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`chip ${
                      importResult.is_dry_run ? 'chip-info' : 'chip-success'
                    } font-mono text-xs`}
                  >
                    {importResult.is_dry_run ? 'Dry-Run Simulation' : 'Live Ingestion Completed'}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    {importResult.filename}
                  </span>
                </div>
              </div>

              {/* KPI Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center">
                <div className="bg-slate-950 p-2 rounded border border-slate-800">
                  <div className="text-base font-bold font-mono text-slate-100">
                    {importResult.total_rows}
                  </div>
                  <div className="text-[10px] text-slate-400 uppercase font-mono">Total Rows</div>
                </div>
                <div className="bg-slate-950 p-2 rounded border border-slate-800">
                  <div className="text-base font-bold font-mono text-emerald-400">
                    {importResult.imported_rows}
                  </div>
                  <div className="text-[10px] text-slate-400 uppercase font-mono">
                    {importResult.is_dry_run ? 'Valid' : 'Imported'}
                  </div>
                </div>
                <div className="bg-slate-950 p-2 rounded border border-slate-800">
                  <div className="text-base font-bold font-mono text-amber-400">
                    {importResult.held_rows}
                  </div>
                  <div className="text-[10px] text-slate-400 uppercase font-mono">Held (Review)</div>
                </div>
                <div className="bg-slate-950 p-2 rounded border border-slate-800">
                  <div className="text-base font-bold font-mono text-rose-400">
                    {importResult.error_rows}
                  </div>
                  <div className="text-[10px] text-slate-400 uppercase font-mono">Errors</div>
                </div>
                <div className="bg-slate-950 p-2 rounded border border-slate-800">
                  <div className="text-base font-bold font-mono text-slate-400">
                    {importResult.duplicate_rows}
                  </div>
                  <div className="text-[10px] text-slate-400 uppercase font-mono">Duplicates</div>
                </div>
                <div className="bg-slate-950 p-2 rounded border border-slate-800">
                  <div className="text-base font-bold font-mono text-blue-400">
                    {importResult.new_overlaps}
                  </div>
                  <div className="text-[10px] text-slate-400 uppercase font-mono">Overlaps</div>
                </div>
              </div>

              {/* Detail Tabs */}
              <div className="flex border-b border-slate-800 gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ${
                    activeTab === 'preview'
                      ? 'border-blue-500 text-blue-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Import Preview ({importResult.preview.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('held')}
                  className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ${
                    activeTab === 'held'
                      ? 'border-amber-500 text-amber-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Held Rows ({importResult.held.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('errors')}
                  className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ${
                    activeTab === 'errors'
                      ? 'border-rose-500 text-rose-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Validation Errors ({importResult.errors.length})
                </button>
              </div>

              {/* Tab Contents */}
              <div className="pt-2">
                {activeTab === 'preview' && (
                  <div className="space-y-2">
                    {importResult.preview.length === 0 ? (
                      <p className="text-xs text-slate-500 italic">No valid rows available in preview.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="gov-table w-full text-xs">
                          <thead>
                            <tr>
                              <th>Case Ref</th>
                              <th>Source Ref</th>
                              <th>Category</th>
                              <th>Bureau</th>
                              <th>Overlaps Detected</th>
                            </tr>
                          </thead>
                          <tbody>
                            {importResult.preview.map((p, idx) => (
                              <tr key={idx}>
                                <td className="font-mono text-blue-400 font-bold">{p.case_ref || `Row #${p.row}`}</td>
                                <td className="font-mono text-slate-300">{p.source_case_id}</td>
                                <td><span className="chip chip-neutral text-[10px]">{p.category}</span></td>
                                <td className="font-mono text-slate-400">{p.bureau_code}</td>
                                <td className="text-right font-mono font-bold text-amber-400">
                                  {p.overlaps_detected ?? 0}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'held' && (
                  <div className="space-y-2">
                    {importResult.held.length === 0 ? (
                      <p className="text-xs text-slate-400">No rows held. All institutions resolved with high confidence.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="gov-table w-full text-xs">
                          <thead>
                            <tr>
                              <th>Row</th>
                              <th>Source Ref</th>
                              <th>Held Reason</th>
                              <th>Institution Query</th>
                              <th>Top Candidates</th>
                            </tr>
                          </thead>
                          <tbody>
                            {importResult.held.map((h, idx) => (
                              <tr key={idx}>
                                <td className="font-mono">#{h.row}</td>
                                <td className="font-mono text-slate-300">{h.source_case_id}</td>
                                <td>
                                  <span className="chip chip-warning text-[10px]">{h.reason}</span>
                                </td>
                                <td className="text-slate-300">{h.institution_query}</td>
                                <td className="text-[11px] font-mono text-slate-400">
                                  {h.candidates && h.candidates.length > 0
                                    ? h.candidates.slice(0, 2).map((c) => `${c.name} (${Math.round(c.score * 100)}%)`).join(', ')
                                    : 'No candidates above floor'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'errors' && (
                  <div className="space-y-2">
                    {importResult.errors.length === 0 ? (
                      <p className="text-xs text-slate-400">Zero row validation errors.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="gov-table w-full text-xs">
                          <thead>
                            <tr>
                              <th>Row</th>
                              <th>Validation Failures</th>
                              <th>Raw Row Data</th>
                            </tr>
                          </thead>
                          <tbody>
                            {importResult.errors.map((e, idx) => (
                              <tr key={idx}>
                                <td className="font-mono text-rose-400 font-bold">#{e.row}</td>
                                <td className="text-rose-300">{e.errors.join('; ')}</td>
                                <td className="font-mono text-[10px] text-slate-400 truncate max-w-xs">
                                  {JSON.stringify(e.data)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Past Import Logs */}
          <div className="panel p-4 space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <History className="w-4 h-4 text-slate-400" />
              Past Batch Import Logs ({logsQuery.data?.total || 0})
            </h2>
            {logsQuery.isLoading ? (
              <div className="text-xs text-slate-400 font-mono">Loading import history...</div>
            ) : !logsQuery.data?.items || logsQuery.data.items.length === 0 ? (
              <div className="text-xs text-slate-500 italic">No import logs recorded yet for {source.toUpperCase()}.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="gov-table w-full text-xs">
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Filename</th>
                      <th>Total</th>
                      <th>Imported</th>
                      <th>Held</th>
                      <th>Errors</th>
                      <th>New Overlaps</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logsQuery.data.items.slice(0, 5).map((log) => (
                      <tr key={log.id}>
                        <td className="font-mono text-slate-400">
                          {log.created_at ? log.created_at.split('T')[0] : '—'}
                        </td>
                        <td className="font-mono text-slate-200">{log.filename}</td>
                        <td className="text-right font-mono">{log.total_rows}</td>
                        <td className="text-right font-mono text-emerald-400 font-bold">{log.imported_rows}</td>
                        <td className="text-right font-mono text-amber-400">{log.held_rows}</td>
                        <td className="text-right font-mono text-rose-400">{log.error_rows}</td>
                        <td className="text-right font-mono text-blue-400 font-bold">{log.new_overlaps}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
