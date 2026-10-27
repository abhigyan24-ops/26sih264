import api from '../lib/api'

export interface SourceInfo {
  id: string
  name: string
  default_bureau: string
}

export interface SourcesResponse {
  sources: SourceInfo[]
  schema_fields: Record<string, string>
}

export interface MappingResponse {
  source: string
  mapping: Record<string, string>
  schema_fields: Record<string, string>
}

export interface HeaderDetectionResponse {
  headers: string[]
  mapping: Record<string, string>
  sample_preview: Record<string, string>[]
  total_rows_detected: number
}

export interface ImportResult {
  import_log_id: number | null
  source: string
  filename: string
  total_rows: number
  imported_rows: number
  held_rows: number
  error_rows: number
  duplicate_rows: number
  new_overlaps: number
  is_dry_run: boolean
  errors: Array<{
    row: number
    errors: string[]
    data: Record<string, string>
  }>
  held: Array<{
    row: number
    source_case_id?: string
    reason: string
    institution_query?: string
    city_query?: string
    candidates: Array<{ id: number; name: string; city?: string; score: number }>
    data: Record<string, string>
  }>
  preview: Array<{
    id?: number
    row?: number
    case_ref?: string
    source_case_id?: string
    institution_name?: string
    institution_id?: number
    category?: string
    bureau_code?: string
    overlaps_detected?: number
  }>
}

export interface ImportLogRow {
  id: number
  source: string
  filename: string
  total_rows: number
  imported_rows: number
  held_rows: number
  error_rows: number
  duplicate_rows: number
  new_overlaps: number
  is_dry_run: boolean
  created_at: string
}

export const getSources = async (): Promise<SourcesResponse> => {
  return (await api.get<SourcesResponse>('/ingestion/sources')).data
}

export const getSourceMapping = async (source: string): Promise<MappingResponse> => {
  return (await api.get<MappingResponse>(`/ingestion/mappings/${source}`)).data
}

export const saveSourceMapping = async (
  source: string,
  mapping: Record<string, string>
): Promise<MappingResponse> => {
  return (await api.post<MappingResponse>(`/ingestion/mappings/${source}`, { mapping })).data
}

export const detectHeaders = async (
  source: string,
  file: File
): Promise<HeaderDetectionResponse> => {
  const form = new FormData()
  form.append('source', source)
  form.append('file', file)
  return (
    await api.post<HeaderDetectionResponse>('/ingestion/detect-headers', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  ).data
}

export const uploadImport = async (
  source: string,
  file: File,
  dryRun: boolean,
  mapping?: Record<string, string>
): Promise<ImportResult> => {
  const form = new FormData()
  form.append('source', source)
  form.append('file', file)
  form.append('dry_run', dryRun ? 'true' : 'false')
  if (mapping) {
    form.append('mapping', JSON.stringify(mapping))
  }
  return (
    await api.post<ImportResult>('/ingestion/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  ).data
}

export const getImportLogs = async (source?: string): Promise<{ items: ImportLogRow[]; total: number }> => {
  return (await api.get('/ingestion/logs', { params: { source } })).data
}
