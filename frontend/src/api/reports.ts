import api from '../lib/api'

export interface BureauReportRow {
  bureau: string
  total: number
  open: number
  disposed: number
  overdue: number
}

export interface RegionReportRow {
  region: string
  total: number
  open: number
  disposed: number
  overdue: number
}

export interface AgeingReportRow {
  bucket: string
  n: number
}

export interface DisposalRateRow {
  month: string
  received: number
  disposed: number
  rate: number
}

export interface OverlapReportRow {
  level: string
  status: string
  n: number
}

export interface TrendReportRow {
  period: string
  received: number
  disposed: number
}

export interface ReportDateParams {
  date_from?: string
  date_to?: string
}

export const getBureauReport = async (params?: ReportDateParams): Promise<BureauReportRow[]> => {
  const res = await api.get<BureauReportRow[]>('/reports/bureau-wise', { params })
  return res.data
}

export const getRegionReport = async (params?: ReportDateParams): Promise<RegionReportRow[]> => {
  const res = await api.get<RegionReportRow[]>('/reports/region-wise', { params })
  return res.data
}

export const getAgeingReport = async (params?: ReportDateParams): Promise<AgeingReportRow[]> => {
  const res = await api.get<AgeingReportRow[]>('/reports/ageing', { params })
  return res.data
}

export const getDisposalReport = async (params?: ReportDateParams): Promise<DisposalRateRow[]> => {
  const res = await api.get<DisposalRateRow[]>('/reports/disposal-rate', { params })
  return res.data
}

export const getOverlapReport = async (params?: ReportDateParams): Promise<OverlapReportRow[]> => {
  const res = await api.get<OverlapReportRow[]>('/reports/overlaps', { params })
  return res.data
}

export const getTrendReport = async (
  period: 'month' | 'quarter' = 'month',
  params?: ReportDateParams
): Promise<TrendReportRow[]> => {
  const res = await api.get<TrendReportRow[]>('/reports/trend', {
    params: { ...params, period },
  })
  return res.data
}

export const downloadReportFile = async (
  format: 'xlsx' | 'pdf',
  params?: ReportDateParams
): Promise<void> => {
  const res = await api.get(`/reports/bureau.${format}`, {
    params,
    responseType: 'blob',
  })
  const blob = new Blob([res.data], {
    type:
      format === 'xlsx'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'application/pdf',
  })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `bureau_report.${format}`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  window.URL.revokeObjectURL(url)
}
